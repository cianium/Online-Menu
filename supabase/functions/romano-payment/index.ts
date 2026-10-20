import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const publicOrigin = (Deno.env.get("ROMANO_PAYMENT_PUBLIC_ORIGIN") || "https://food.kiankhayat.me").replace(/\/$/, "");
const allowedOrigins = new Set(
  (Deno.env.get("ROMANO_PAYMENT_ALLOWED_ORIGINS") || publicOrigin)
    .split(",").map((value) => value.trim()).filter(Boolean),
);
if (!supabaseUrl || !serviceKey) throw new Error("Payment runtime secrets are not configured");

const service = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const SESSION_COOKIE = "romano_table_session";

function response(payload: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function success(data: unknown, requestId: string) {
  return { data, error: null, requestId };
}

function failure(code: string, message: string, requestId: string) {
  return { data: null, error: { code, message }, requestId };
}

function parseCookie(header: string | null, name: string) {
  for (const part of (header || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0 || part.slice(0, index).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return ""; }
  }
  return "";
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requireOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins.has(origin)) throw new Error("ORIGIN_NOT_ALLOWED");
  return origin;
}

function cors(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins.has(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    vary: "Origin",
  };
}

async function rpc(name: string, values: Record<string, unknown>) {
  const { data, error } = await service.rpc(name, values);
  if (error) throw new Error(error.message?.split(":", 1)[0] || "DATABASE_REQUEST_FAILED");
  if (!data) throw new Error("DATABASE_REQUEST_FAILED");
  return data as Record<string, unknown>;
}

async function readJson(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 16_384) throw new Error("INVALID_PAYMENT_REQUEST");
  const raw = await request.text();
  if (raw.length > 16_384) throw new Error("INVALID_PAYMENT_REQUEST");
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_PAYMENT_REQUEST");
    return value as Record<string, unknown>;
  } catch { throw new Error("INVALID_PAYMENT_REQUEST"); }
}

async function zarinpalRequest(base: string, path: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const result = await fetch(`${base}${path}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await result.json().catch(() => null);
    if (!result.ok || !payload || typeof payload !== "object") throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
    return payload as Record<string, any>;
  } finally {
    clearTimeout(timeout);
  }
}

function baseUrl(sandbox: boolean) {
  return sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
}

function safeReturnUrl(state: string, orderId: string, reference = "") {
  const url = new URL("/index.html", publicOrigin);
  url.searchParams.set("payment", state);
  url.searchParams.set("order", orderId);
  if (reference) url.searchParams.set("ref", reference);
  return url.toString();
}

function publicError(error: unknown): [number, string, string] {
  const code = error instanceof Error ? error.message.split(":", 1)[0] : "INTERNAL_ERROR";
  const errors: Record<string, [number, string]> = {
    ORIGIN_NOT_ALLOWED: [403, "Request origin is not allowed."],
    INVALID_PAYMENT_REQUEST: [400, "Payment request is invalid."],
    TABLE_SESSION_REQUIRED: [401, "Scan the table QR code to continue."],
    ORDER_NOT_FOUND: [404, "Order was not found."],
    ORDER_ALREADY_PAID: [409, "Order has already been paid."],
    ORDER_NOT_PAYABLE: [409, "Order cannot be paid."],
    PAYMENT_GATEWAY_NOT_CONFIGURED: [409, "Online payment is not configured for this branch."],
    PAYMENT_CURRENCY_NOT_SUPPORTED: [409, "Online payment is not available for this currency."],
    PAYMENT_IDEMPOTENCY_CONFLICT: [409, "Payment request conflicts with an earlier request."],
    PAYMENT_ATTEMPT_IN_PROGRESS: [409, "A payment request is already being processed."],
    PAYMENT_REQUIRES_REVIEW: [409, "This payment requires reconciliation before it can be retried."],
    PAYMENT_ATTEMPT_FINALIZED: [409, "This payment attempt has already finished."],
    PAYMENT_PROVIDER_REJECTED: [502, "The payment provider rejected the request."],
    PAYMENT_PROVIDER_UNAVAILABLE: [503, "Payment provider is temporarily unavailable."],
  };
  const item = errors[code] || [503, "Payment is temporarily unavailable."];
  return [item[0], code in errors ? code : "PAYMENT_UNAVAILABLE", item[1]];
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const path = url.pathname
    .replace(/^\/romano-payment(?:\/|$)/, "/")
    .replace(/^\/api\/v1\/payments(?:\/|$)/, "/");
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    if (!origin || !allowedOrigins.has(origin)) return response(failure("ORIGIN_NOT_ALLOWED", "Request origin is not allowed.", requestId), 403);
    return new Response(null, {
      status: 204,
      headers: {
        ...cors(origin),
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "600",
      },
    });
  }

  if (request.method === "GET" && path === "/health") {
    return response(success({ status: "ok", service: "romano-payment", provider: "zarinpal" }, requestId));
  }

  try {
    if (request.method === "POST" && path === "/start") {
      const allowedOrigin = requireOrigin(request);
      const token = parseCookie(request.headers.get("cookie"), SESSION_COOKIE);
      if (!/^[A-Za-z0-9_-]{32,160}$/.test(token)) throw new Error("TABLE_SESSION_REQUIRED");
      const body = await readJson(request);
      const orderId = typeof body.orderId === "string" ? body.orderId : "";
      const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("INVALID_PAYMENT_REQUEST");
      const context = await rpc("romano_prepare_payment", {
        p_session_token_hash: await sha256Hex(token),
        p_order: orderId,
        p_idempotency_key: idempotencyKey,
      });

      const providerBase = baseUrl(context.sandbox === true);
      if (context.status === "requested" && typeof context.authority === "string") {
        return response(success({
          attemptId: context.attemptId,
          redirectUrl: `${providerBase}/pg/StartPay/${context.authority}`,
        }, requestId), 200, cors(allowedOrigin));
      }
      if (context.status === "requires_review") throw new Error("PAYMENT_REQUIRES_REVIEW");
      if (["failed", "cancelled", "verified", "duplicate_verified"].includes(String(context.status))) {
        throw new Error("PAYMENT_ATTEMPT_FINALIZED");
      }
      // Only the request that inserted the attempt may contact the PSP. If an
      // earlier invocation crashed after sending the request but before saving
      // the Authority, replaying it could charge the customer twice.
      if (context.status !== "initiated" || context.created !== true) {
        throw new Error("PAYMENT_ATTEMPT_IN_PROGRESS");
      }

      const callbackUrl = new URL("/api/v1/payments/callback", publicOrigin);
      let provider: Record<string, any>;
      try {
        provider = await zarinpalRequest(providerBase, "/pg/v4/payment/request.json", {
          merchant_id: context.merchantId,
          amount: context.amountMinor,
          currency: "IRR",
          callback_url: callbackUrl.toString(),
          description: `ROMANO order #${context.orderNumber}`,
        });
      } catch (error) {
        // A timeout is ambiguous: the PSP may have accepted the request. Keep
        // the order blocked for reconciliation instead of issuing a duplicate.
        await rpc("romano_fail_payment_start", {
          p_attempt: context.attemptId,
          p_provider_code: -1,
          p_failure_code: "PROVIDER_REQUEST_AMBIGUOUS",
          p_requires_review: true,
        });
        throw error;
      }
      const code = Number(provider?.data?.code);
      const authority = provider?.data?.authority;
      if (code !== 100 || typeof authority !== "string") {
        await rpc("romano_fail_payment_start", {
          p_attempt: context.attemptId,
          p_provider_code: Number.isFinite(code) ? code : -1,
          p_failure_code: `ZARINPAL_REQUEST_${Number.isFinite(code) ? code : "INVALID"}`,
          p_requires_review: false,
        });
        throw new Error("PAYMENT_PROVIDER_REJECTED");
      }
      await rpc("romano_attach_payment_authority", {
        p_attempt: context.attemptId,
        p_authority: authority,
        p_provider_code: code,
      });
      return response(success({
        attemptId: context.attemptId,
        redirectUrl: `${providerBase}/pg/StartPay/${authority}`,
      }, requestId), 201, cors(allowedOrigin));
    }

    if (request.method === "GET" && path === "/callback") {
      const authority = url.searchParams.get("Authority") || "";
      const providerStatus = (url.searchParams.get("Status") || "").toUpperCase();
      if (!/^[A-Za-z0-9_-]{16,128}$/.test(authority)) {
        return Response.redirect(safeReturnUrl("failed", "unknown"), 303);
      }
      const context = await rpc("romano_payment_callback_context", { p_authority: authority });
      if (providerStatus !== "OK") {
        const final = await rpc("romano_finalize_payment", {
          p_authority: authority, p_success: false, p_provider_code: -1,
          p_reference: null, p_masked_card_pan: null, p_fee_minor: null,
          p_failure_code: "CUSTOMER_CANCELLED",
        });
        return Response.redirect(
          safeReturnUrl(final.successful === true ? "success" : "cancelled", String(context.orderId), String(final.reference || "")),
          303,
        );
      }
      const providerBase = baseUrl(context.sandbox === true);
      const provider = await zarinpalRequest(providerBase, "/pg/v4/payment/verify.json", {
        merchant_id: context.merchantId,
        amount: context.amountMinor,
        authority,
      });
      const code = Number(provider?.data?.code);
      const verified = code === 100 || code === 101;
      const reference = provider?.data?.ref_id == null ? "" : String(provider.data.ref_id);
      const final = await rpc("romano_finalize_payment", {
        p_authority: authority,
        p_success: verified,
        p_provider_code: Number.isFinite(code) ? code : -1,
        p_reference: reference || null,
        p_masked_card_pan: provider?.data?.card_pan || null,
        p_fee_minor: Number.isFinite(Number(provider?.data?.fee)) ? Number(provider.data.fee) : null,
        p_failure_code: verified ? null : `ZARINPAL_${Number.isFinite(code) ? code : "UNKNOWN"}`,
      });
      return Response.redirect(
        safeReturnUrl(final.successful === true ? "success" : "failed", String(context.orderId), String(final.reference || reference)),
        303,
      );
    }

    return response(failure("NOT_FOUND", "Route not found.", requestId), 404, cors(origin));
  } catch (error) {
    const [status, code, message] = publicError(error);
    if (status >= 500) console.error("romano payment API failure", { requestId, error });
    return response(failure(code, message, requestId), status, cors(origin));
  }
});
