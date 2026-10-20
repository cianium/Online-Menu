import {
  isSessionToken,
  isUuid,
  normalizeOrderRequest,
  parseCookie,
  randomSessionToken,
  sha256Hex,
  verifyQrToken,
} from "./core.ts";

const COOKIE_NAME = "romano_table_session";
const MAX_BODY_BYTES = 32768;
const SESSION_TTL_SECONDS = 14400;
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const qrSecret = Deno.env.get("ROMANO_QR_SIGNING_SECRET");
const configuredOrigins = (Deno.env.get("ROMANO_PUBLIC_ORIGINS") ||
  "https://food.kiankhayat.me,http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set(configuredOrigins);

function resolveSecretKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys);
      if (typeof parsed.default === "string" && parsed.default) {
        return parsed.default;
      }
    } catch {
      throw new Error("SUPABASE_SECRET_KEYS is not valid JSON");
    }
  }
  return Deno.env.get("SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

const secretKey = resolveSecretKey();
if (!supabaseUrl || !secretKey) {
  throw new Error("Romano order runtime secrets are not configured");
}

let qrSigningKeyPromise: Promise<string> | null = null;
async function qrSigningKey(): Promise<string> {
  if (qrSecret && qrSecret.length >= 32) return qrSecret;
  if (!qrSigningKeyPromise) qrSigningKeyPromise = (async () => {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/romano_qr_signing_material`, {
      method: "POST",
      headers: {
        apikey: secretKey!,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: "{}",
    });
    if (!res.ok) throw new Error("QR_ORDERING_NOT_AVAILABLE");
    const material: unknown = await res.json();
    if (typeof material !== "string" || material.length < 64) {
      throw new Error("QR_ORDERING_NOT_AVAILABLE");
    }
    return material;
  })();
  try { return await qrSigningKeyPromise; }
  catch (error) { qrSigningKeyPromise = null; throw error; }
}

function originHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  return origin && allowedOrigins.has(origin)
    ? {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "true",
      "vary": "Origin",
    }
    : {};
}

function responseHeaders(
  request: Request,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    ...originHeaders(request),
    ...extra,
  };
}

function json(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(request, extraHeaders),
  });
}

const ok = (data: unknown, requestId: string) => ({
  data,
  error: null,
  requestId,
});
const fail = (code: string, message: string, requestId: string) => ({
  data: null,
  error: { code, message },
  requestId,
});

function requireAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins.has(origin)) {
    throw new Error("ORIGIN_NOT_ALLOWED");
  }
}

async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") || "";
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (
    !contentType.toLowerCase().startsWith("application/json") ||
    !Number.isFinite(contentLength) ||
    contentLength > MAX_BODY_BYTES
  ) {
    throw new Error("INVALID_REQUEST_BODY");
  }
  const text = await request.text();
  if (!text || new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Error("INVALID_REQUEST_BODY");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("INVALID_REQUEST_BODY");
  }
}

async function rpc(
  name: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "apikey": secretKey,
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify(params),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "DATABASE_REQUEST_FAILED",
    );
    throw error;
  }
  return payload;
}

function sessionFromRequest(request: Request) {
  const token = parseCookie(request.headers.get("cookie"), COOKIE_NAME);
  if (!isSessionToken(token)) throw new Error("TABLE_SESSION_REQUIRED");
  return token;
}

function publicError(error: unknown): [number, string, string] {
  const code = error instanceof Error
    ? error.message.split(":", 1)[0]
    : "INTERNAL_ERROR";
  const mapping: Record<string, [number, string, string]> = {
    ORIGIN_NOT_ALLOWED: [
      403,
      "ORIGIN_NOT_ALLOWED",
      "Request origin is not allowed.",
    ],
    INVALID_REQUEST_BODY: [
      400,
      "INVALID_REQUEST_BODY",
      "Request body is invalid.",
    ],
    INVALID_QR_TOKEN: [400, "INVALID_QR_TOKEN", "QR code is invalid."],
    INVALID_ORDER_REQUEST: [
      400,
      "INVALID_ORDER_REQUEST",
      "Order request is invalid.",
    ],
    INVALID_ORDER_ITEM: [
      400,
      "INVALID_ORDER_ITEM",
      "One or more order items are invalid.",
    ],
    DUPLICATE_ORDER_ITEM: [
      400,
      "DUPLICATE_ORDER_ITEM",
      "Duplicate products must be combined.",
    ],
    QR_TABLE_NOT_AVAILABLE: [
      409,
      "QR_TABLE_NOT_AVAILABLE",
      "This table is not available for ordering.",
    ],
    TABLE_SESSION_CLOSING: [
      409,
      "TABLE_SESSION_CLOSING",
      "This table session is closing.",
    ],
    TABLE_SESSION_REQUIRED: [
      401,
      "TABLE_SESSION_REQUIRED",
      "Scan the table QR code to start.",
    ],
    TABLE_SESSION_INVALID_OR_EXPIRED: [
      401,
      "TABLE_SESSION_EXPIRED",
      "Table session has expired.",
    ],
    QR_ORDERING_NOT_AVAILABLE: [
      409,
      "QR_ORDERING_NOT_AVAILABLE",
      "Ordering is temporarily unavailable.",
    ],
    PRODUCT_NOT_AVAILABLE: [
      409,
      "PRODUCT_NOT_AVAILABLE",
      "A selected product is no longer available.",
    ],
    CATALOG_PRICE_NOT_REPRESENTABLE: [
      409,
      "CATALOG_PRICE_INVALID",
      "A selected product cannot be ordered right now.",
    ],
    IDEMPOTENCY_KEY_REUSED: [
      409,
      "IDEMPOTENCY_CONFLICT",
      "Idempotency key was already used for another request.",
    ],
    ORDER_NOT_FOUND: [404, "ORDER_NOT_FOUND", "Order not found."],
  };
  return mapping[code] ||
    [503, "SERVICE_UNAVAILABLE", "Ordering is temporarily unavailable."];
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const path = url.pathname
    .replace(/^\/romano-order(?:\/|$)/, "/")
    .replace(/^\/api\/v1\/orders(?:\/|$)/, "/");

  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin");
    if (!origin || !allowedOrigins.has(origin)) {
      return json(
        request,
        fail("ORIGIN_NOT_ALLOWED", "Request origin is not allowed.", requestId),
        403,
      );
    }
    return new Response(null, {
      status: 204,
      headers: {
        ...originHeaders(request),
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "600",
      },
    });
  }

  if (request.method === "GET" && path === "/health") {
    return json(
      request,
      ok({ status: "ok", service: "romano-order" }, requestId),
    );
  }

  try {
    if (request.method === "POST" && path === "/session") {
      requireAllowedOrigin(request);
      const body = await readJson(request);
      const qrToken = body !== null && typeof body === "object"
        ? (body as Record<string, unknown>).qrToken
        : null;
      const qr = await verifyQrToken(qrToken, await qrSigningKey());
      const sessionToken = randomSessionToken();
      const sessionTokenHash = await sha256Hex(sessionToken);
      const data = await rpc("romano_open_table_session", {
        p_branch: qr.branchId,
        p_table: qr.tableId,
        p_qr_version: qr.qrVersion,
        p_token_hash: sessionTokenHash,
        p_ttl_seconds: SESSION_TTL_SECONDS,
      });
      const cookie = `${COOKIE_NAME}=${
        encodeURIComponent(sessionToken)
      }; Path=/api/v1; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
      return json(request, ok(data, requestId), 201, {
        "set-cookie": cookie,
      });
    }

    if (request.method === "POST" && path === "/submit") {
      requireAllowedOrigin(request);
      const token = sessionFromRequest(request);
      const normalized = normalizeOrderRequest(await readJson(request));
      const data = await rpc("romano_create_qr_order", {
        p_session_token_hash: await sha256Hex(token),
        p_display_language: normalized.language,
        p_idempotency_key: normalized.idempotencyKey,
        p_request_fingerprint: await sha256Hex(normalized.fingerprintInput),
        p_items: normalized.items,
        p_notes: normalized.notes,
      });
      return json(
        request,
        ok(data, requestId),
        data?.idempotentReplay ? 200 : 201,
      );
    }

    const orderMatch = path.match(/^\/([^/]+)\/?$/);
    if (request.method === "GET" && orderMatch && isUuid(orderMatch[1])) {
      const token = sessionFromRequest(request);
      const data = await rpc("romano_get_qr_order", {
        p_session_token_hash: await sha256Hex(token),
        p_order: orderMatch[1],
      });
      return json(request, ok(data, requestId));
    }

    return json(request, fail("NOT_FOUND", "Route not found.", requestId), 404);
  } catch (error) {
    const [status, code, message] = publicError(error);
    if (status >= 500) {
      console.error("romano order API failure", { requestId, error });
    }
    return json(request, fail(code, message, requestId), status);
  }
});
