const PBKDF2_ITERATIONS = 100000;
const JWT_EXPIRY_SEC = 60 * 60 * 24 * 7; // 7 days
const MIN_AUTH_JWT_SECRET_LENGTH = 10;

function bytesToB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlEncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeToString(b64url) {
  const pad = 4 - (b64url.length % 4);
  const b64 = (b64url + "====".slice(0, pad === 4 ? 0 : pad)).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const saltB64 = bytesToB64(salt);
  const hashB64 = bytesToB64(new Uint8Array(bits));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = b64ToBytes(parts[2]);
  const expectedB64 = parts[3];
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: Number.isFinite(iterations) ? iterations : PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const actualB64 = bytesToB64(new Uint8Array(bits));
  if (actualB64.length !== expectedB64.length) return false;
  let diff = 0;
  for (let i = 0; i < actualB64.length; i++) {
    diff |= actualB64.charCodeAt(i) ^ expectedB64.charCodeAt(i);
  }
  return diff === 0;
}

export async function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64urlEncodeUtf8(JSON.stringify(header));
  const p = b64urlEncodeUtf8(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  let bin = "";
  const sigBytes = new Uint8Array(sig);
  for (let i = 0; i < sigBytes.length; i++) bin += String.fromCharCode(sigBytes[i]);
  const sigB64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${data}.${sigB64}`;
}

export async function verifyJwt(token, secret) {
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  let bin = "";
  const sigUrl = parts[2];
  const pad = 4 - (sigUrl.length % 4);
  const sigB64 = (sigUrl + "====".slice(0, pad === 4 ? 0 : pad)).replace(/-/g, "+").replace(/_/g, "/");
  const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(data)
  );
  if (!ok) return null;
  try {
    return JSON.parse(b64urlDecodeToString(parts[1]));
  } catch {
    return null;
  }
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  const n = normalizeEmail(email);
  return EMAIL_RE.test(n) && n.length <= 254;
}

export async function authRegister(c) {
  const db = c.env?.DB;
  if (!db) {
    return c.json({ error: "Database not configured. Add D1 binding DB and run migrations." }, 503);
  }
  const secret = c.env?.AUTH_JWT_SECRET;
  if (!secret || secret.length < MIN_AUTH_JWT_SECRET_LENGTH) {
    return c.json(
      {
        error: `AUTH_JWT_SECRET missing or too short. Set wrangler secret (min ${MIN_AUTH_JWT_SECRET_LENGTH} chars).`
      },
      500
    );
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!validateEmail(email)) {
    return c.json({ error: "Invalid email" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }
  if (password.length > 256) {
    return c.json({ error: "Password too long" }, 400);
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const createdAt = Math.floor(Date.now() / 1000);

  try {
    await db
      .prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
      .bind(id, email, passwordHash, createdAt)
      .run();
  } catch (e) {
    const msg = String(e?.message || e || "");
    if (/unique|constraint|already exists/i.test(msg)) {
      return c.json({ error: "An account with this email already exists" }, 409);
    }
    console.error(e);
    return c.json({ error: "Could not create account" }, 500);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signJwt(
    { sub: id, email, iat: now, exp: now + JWT_EXPIRY_SEC },
    secret
  );

  return c.json({
    token,
    user: { id, email }
  });
}

export async function authLogin(c) {
  const db = c.env?.DB;
  if (!db) {
    return c.json({ error: "Database not configured. Add D1 binding DB and run migrations." }, 503);
  }
  const secret = c.env?.AUTH_JWT_SECRET;
  if (!secret || secret.length < MIN_AUTH_JWT_SECRET_LENGTH) {
    return c.json(
      {
        error: `AUTH_JWT_SECRET missing or too short. Set wrangler secret (min ${MIN_AUTH_JWT_SECRET_LENGTH} chars).`
      },
      500
    );
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  const row = await db
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first();

  if (!row) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const good = await verifyPassword(password, row.password_hash);
  if (!good) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signJwt(
    { sub: row.id, email: row.email, iat: now, exp: now + JWT_EXPIRY_SEC },
    secret
  );

  return c.json({
    token,
    user: { id: row.id, email: row.email }
  });
}

export async function authMe(c) {
  const secret = c.env?.AUTH_JWT_SECRET;
  if (!secret) {
    return c.json({ error: "AUTH_JWT_SECRET not configured" }, 500);
  }
  const auth = c.req.header("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const payload = await verifyJwt(m[1].trim(), secret);
  if (!payload?.sub || !payload?.exp) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return c.json({ error: "Token expired" }, 401);
  }

  return c.json({
    user: { id: payload.sub, email: payload.email }
  });
}
