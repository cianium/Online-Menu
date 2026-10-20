export {};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRODUCT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]+$/;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const languages = new Set(["fa", "en", "tr", "ar"]);

type QrPayload = { branchId: string; tableId: string; qrVersion: number };
type JsonObject = Record<string, unknown>;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/,
    "",
  );
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("INVALID_QR_TOKEN");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function hmac(message: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(message)),
  );
}

export async function signQrToken(
  { branchId, tableId, qrVersion }: QrPayload,
  secret: string,
) {
  if (!UUID_PATTERN.test(branchId) || !UUID_PATTERN.test(tableId)) {
    throw new Error("INVALID_QR_PAYLOAD");
  }
  if (
    !Number.isSafeInteger(qrVersion) || qrVersion < 1 || qrVersion > 2147483647
  ) {
    throw new Error("INVALID_QR_PAYLOAD");
  }
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("INVALID_QR_SECRET");
  }
  const message =
    `v1.${branchId.toLowerCase()}.${tableId.toLowerCase()}.${qrVersion}`;
  return `${message}.${bytesToBase64Url(await hmac(message, secret))}`;
}

export async function verifyQrToken(
  token: unknown,
  secret: string,
): Promise<QrPayload> {
  if (
    typeof token !== "string" || token.length > 512 ||
    typeof secret !== "string" || secret.length < 32
  ) {
    throw new Error("INVALID_QR_TOKEN");
  }
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") {
    throw new Error("INVALID_QR_TOKEN");
  }
  const [, branchId, tableId, versionText, signatureText] = parts;
  if (
    !UUID_PATTERN.test(branchId) || !UUID_PATTERN.test(tableId) ||
    !/^[1-9][0-9]{0,9}$/.test(versionText)
  ) {
    throw new Error("INVALID_QR_TOKEN");
  }
  const qrVersion = Number(versionText);
  if (!Number.isSafeInteger(qrVersion) || qrVersion > 2147483647) {
    throw new Error("INVALID_QR_TOKEN");
  }
  const actual = base64UrlToBytes(signatureText);
  const message = parts.slice(0, 4).join(".");
  const expected = await hmac(message, secret);
  if (!constantTimeEqual(actual, expected)) throw new Error("INVALID_QR_TOKEN");
  return {
    branchId: branchId.toLowerCase(),
    tableId: tableId.toLowerCase(),
    qrVersion,
  };
}

export function randomSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function isSessionToken(value: unknown): value is string {
  return typeof value === "string" && SESSION_TOKEN_PATTERN.test(value);
}

export async function sha256Hex(value: string) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function isPlainObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeOrderRequest(body: unknown) {
  if (!isPlainObject(body)) throw new Error("INVALID_ORDER_REQUEST");
  const language = typeof body.language === "string" ? body.language : "fa";
  const idempotencyKey = body.idempotencyKey;
  const notes = body.notes === undefined || body.notes === null
    ? null
    : body.notes;
  if (
    !languages.has(language) ||
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 160 ||
    !IDEMPOTENCY_PATTERN.test(idempotencyKey) ||
    (notes !== null && (typeof notes !== "string" || notes.length > 1000)) ||
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > 50
  ) {
    throw new Error("INVALID_ORDER_REQUEST");
  }

  const seen = new Set();
  const rawItems = body.items as unknown[];
  const items = rawItems.map((item) => {
    if (
      !isPlainObject(item) ||
      typeof item.productId !== "string" ||
      item.productId.length > 80 ||
      !PRODUCT_PATTERN.test(item.productId) ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99 ||
      (item.notes !== undefined && item.notes !== null &&
        (typeof item.notes !== "string" || item.notes.length > 500)) ||
      (item.modifiers !== undefined &&
        (!Array.isArray(item.modifiers) || item.modifiers.length !== 0))
    ) {
      throw new Error("INVALID_ORDER_ITEM");
    }
    if (seen.has(item.productId)) throw new Error("DUPLICATE_ORDER_ITEM");
    seen.add(item.productId);
    return {
      productId: item.productId,
      quantity: item.quantity,
      notes: item.notes === undefined || item.notes === null
        ? null
        : item.notes.trim() || null,
      modifiers: [],
    };
  });

  const normalized = {
    language,
    notes: notes === null ? null : notes.trim() || null,
    items,
  };
  return {
    ...normalized,
    idempotencyKey,
    fingerprintInput: JSON.stringify(normalized),
  };
}

export function parseCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
