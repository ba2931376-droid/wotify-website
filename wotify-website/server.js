/* =====================================================================
   WOTIFY — Video Order Website (server)
   Sirf Node.js chahiye (koi npm package nahi). Chalana:
       RADOX_API_KEY=your_key node server.js
   Phir browser mein:  http://localhost:8080
   Owner login:  username "owner"  (pehla password neeche OWNER_PASSWORD
   se set hota hai — baad mein owner khud Settings se badal sakta hai)
   Data isi folder ki data.json file mein save hota hai.
   ===================================================================== */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 8080;
const RADOX_KEY = process.env.RADOX_API_KEY || "";
const RADOX_BASE = "https://radoxai.com/v1";
const CHAT_MODEL = process.env.CHAT_MODEL || "claude-sonnet-5";
const DB_FILE = path.join(__dirname, "data.json");
const PUBLIC = path.join(__dirname, "public");
const OWNER_USERNAME = "owner";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "roshan780@";

/* ---------------- database (JSON file) ---------------- */
function hashPw(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function newUser(username, password, role) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id: crypto.randomUUID(),
    username, role,
    salt, passHash: hashPw(password, salt),
    blocked: false,
    credits: 0,
    createdAt: new Date().toISOString(),
  };
}
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch (e) {}
  }
  const db = {
    users: [newUser(OWNER_USERNAME, OWNER_PASSWORD, "owner")],
    sessions: {},
    loginEvents: [],
    orders: [],
    ledger: [],
    settings: { pricePerMinute: 1000 },
    seq: { client: 0 },
  };
  saveDB(db);
  return db;
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 1));
}
const db = loadDB();

function checkPw(user, password) {
  const h = hashPw(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(user.passHash));
}
function logEvent(type, username, detail) {
  db.loginEvents.unshift({
    at: new Date().toISOString(), type, username, detail: detail || "",
  });
  db.loginEvents = db.loginEvents.slice(0, 500);
}
function ledger(who, delta, why) {
  db.ledger.unshift({ at: new Date().toISOString(), who, delta, why });
  db.ledger = db.ledger.slice(0, 500);
}
function publicUser(u) {
  return { id: u.id, username: u.username, role: u.role,
           blocked: u.blocked, credits: u.credits, createdAt: u.createdAt };
}

/* ---------------- http helpers ---------------- */
function send(res, code, obj, headers) {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(code, Object.assign(
    { "Content-Type": typeof obj === "string" ? "text/plain" : "application/json" },
    headers || {}));
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch (e) { resolve({}); } });
  });
}
function sessionUser(req) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/sid=([a-f0-9]+)/);
  const auth = (req.headers.authorization || "").replace("Bearer ", "");
  const token = (m && m[1]) || auth || "";
  const s = db.sessions[token];
  if (!s || s.expires < Date.now()) return null;
  const u = db.users.find((x) => x.id === s.userId);
  if (!u || u.blocked) return null;
  return u;
}
function needLogin(req, res) {
  const u = sessionUser(req);
  if (!u) { send(res, 401, { error: "Login required" }); return null; }
  return u;
}
function needOwner(req, res) {
  const u = needLogin(req, res);
  if (!u) return null;
  if (u.role !== "owner") { send(res, 403, { error: "Owner only" }); return null; }
  return u;
}

/* ---------------- API ---------------- */
async function api(req, res, url) {
  const p = url.pathname;

  if (p === "/api/login" && req.method === "POST") {
    const { username, password } = await readBody(req);
    const u = db.users.find((x) => x.username === String(username || "").trim());
    if (!u) { logEvent("login_failed", username, "user not found"); saveDB(db); return send(res, 401, { error: "Wrong username or password" }); }
    if (u.blocked) { logEvent("login_blocked", u.username, "blocked user tried"); saveDB(db); return send(res, 403, { error: "This account is blocked. Contact the owner." }); }
    if (!checkPw(u, String(password || ""))) { logEvent("login_failed", u.username, "wrong password"); saveDB(db); return send(res, 401, { error: "Wrong username or password" }); }
    const token = crypto.randomBytes(32).toString("hex");
    db.sessions[token] = { userId: u.id, expires: Date.now() + 30 * 24 * 3600 * 1000 };
    logEvent("login", u.username, u.role);
    saveDB(db);
    return send(res, 200, { ok: true, user: publicUser(u) },
      { "Set-Cookie": `sid=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax` });
  }

  if (p === "/api/logout" && req.method === "POST") {
    const cookie = req.headers.cookie || "";
    const m = cookie.match(/sid=([a-f0-9]+)/);
    if (m) { const u = db.users.find((x) => db.sessions[m[1]] && x.id === db.sessions[m[1]].userId); delete db.sessions[m[1]]; if (u) logEvent("logout", u.username, ""); saveDB(db); }
    return send(res, 200, { ok: true }, { "Set-Cookie": "sid=; HttpOnly; Path=/; Max-Age=0" });
  }

  if (p === "/api/me" && req.method === "GET") {
    const u = needLogin(req, res); if (!u) return;
    return send(res, 200, { user: publicUser(u), pricePerMinute: db.settings.pricePerMinute });
  }

  /* ---------- orders (client) ---------- */
  if (p === "/api/orders" && req.method === "GET") {
    const u = needLogin(req, res); if (!u) return;
    const list = u.role === "owner" ? db.orders : db.orders.filter((o) => o.userId === u.id);
    return send(res, 200, { orders: list });
  }
  if (p === "/api/orders" && req.method === "POST") {
    const u = needLogin(req, res); if (!u) return;
    const b = await readBody(req);
    const minutes = Math.max(1, Math.min(60, parseInt(b.minutes) || 1));
    const cost = minutes * db.settings.pricePerMinute;
    if (u.role !== "owner") {
      if (u.credits < cost) return send(res, 402, { error: `Not enough credits. Need ${cost}, you have ${u.credits}.` });
      u.credits -= cost;
      ledger(u.username, -cost, `Video order (${minutes} min)`);
    }
    const order = {
      id: crypto.randomUUID(),
      userId: u.id, username: u.username,
      title: String(b.title || "Untitled video").slice(0, 120),
      briefType: ["topic", "script", "voiceover"].includes(b.briefType) ? b.briefType : "topic",
      brief: String(b.brief || "").slice(0, 8000),
      voice: String(b.voice || "Helio").slice(0, 40),
      hoodie: String(b.hoodie || "Yellow").slice(0, 20),
      mood: String(b.mood || "Tense").slice(0, 20),
      style: String(b.style || "Dusk").slice(0, 20),
      format: b.format === "9:16" ? "9:16" : "16:9",
      captions: !!b.captions,
      minutes, cost,
      stage: "Intake",
      deliveryLink: "",
      createdAt: new Date().toISOString(),
    };
    db.orders.unshift(order);
    saveDB(db);
    return send(res, 200, { ok: true, order, credits: u.credits });
  }

  /* ---------- chatbot (Radox AI) ---------- */
  if (p === "/api/chat" && req.method === "POST") {
    const u = needLogin(req, res); if (!u) return;
    if (!RADOX_KEY) return send(res, 500, { error: "AI key is not set on the server." });
    const b = await readBody(req);
    const messages = Array.isArray(b.messages) ? b.messages.slice(-12) : [];
    const payload = {
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: "You are the Wotify Studio assistant. Wotify makes animated 'What If' story videos (2D stick-figure style). Help the user shape video ideas, write and improve narration scripts (~130 words per minute), and answer questions about their orders. Be brief and practical. Reply in the user's language (Roman Urdu / English mix is fine)." },
        ...messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 4000) })),
      ],
    };
    try {
      const r = await fetch(RADOX_BASE + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RADOX_KEY}` },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      const text = data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content : "";
      if (!text) {
        const em = data && data.error && data.error.message;
        return send(res, 502, { error: em ? "AI service: " + em : "AI did not reply. Try again." });
      }
      return send(res, 200, { reply: text });
    } catch (e) {
      return send(res, 502, { error: "AI service unreachable." });
    }
  }

  /* ---------- owner admin ---------- */
  if (p === "/api/admin/overview" && req.method === "GET") {
    if (!needOwner(req, res)) return;
    return send(res, 200, {
      users: db.users.map(publicUser),
      orders: db.orders,
      loginEvents: db.loginEvents.slice(0, 100),
      ledger: db.ledger.slice(0, 100),
      settings: db.settings,
    });
  }
  if (p === "/api/admin/clients" && req.method === "POST") {
    if (!needOwner(req, res)) return;
    const b = await readBody(req);
    db.seq.client += 1;
    const username = "client" + String(db.seq.client).padStart(2, "0");
    const password = String(b.password || "").trim() ||
      crypto.randomBytes(4).toString("hex");
    const u = newUser(username, password, "client");
    db.users.push(u);
    logEvent("client_created", username, "by owner");
    saveDB(db);
    return send(res, 200, { ok: true, username, password, user: publicUser(u) });
  }
  const cm = p.match(/^\/api\/admin\/clients\/([0-9a-f-]{36})\/(password|block|credits)$/);
  if (cm && req.method === "POST") {
    if (!needOwner(req, res)) return;
    const target = db.users.find((x) => x.id === cm[1]);
    if (!target || target.role !== "client") return send(res, 404, { error: "Client not found" });
    const b = await readBody(req);
    if (cm[2] === "password") {
      const pw = String(b.password || "");
      if (pw.length < 4) return send(res, 400, { error: "Password too short (min 4)." });
      target.salt = crypto.randomBytes(16).toString("hex");
      target.passHash = hashPw(pw, target.salt);
      logEvent("password_changed", target.username, "by owner");
    } else if (cm[2] === "block") {
      target.blocked = !!b.blocked;
      if (target.blocked) {
        for (const t of Object.keys(db.sessions))
          if (db.sessions[t].userId === target.id) delete db.sessions[t];
        logEvent("blocked", target.username, "by owner");
      } else logEvent("unblocked", target.username, "by owner");
    } else if (cm[2] === "credits") {
      const amount = parseInt(b.credits);
      if (isNaN(amount) || amount < 0) return send(res, 400, { error: "Invalid credits" });
      const diff = amount - target.credits;
      target.credits = amount;
      ledger(target.username, diff, "set by owner");
      logEvent("credits_set", target.username, `balance=${amount}`);
    }
    saveDB(db);
    return send(res, 200, { ok: true, user: publicUser(target) });
  }
  const om = p.match(/^\/api\/admin\/orders\/([0-9a-f-]{36})$/);
  if (om && req.method === "POST") {
    if (!needOwner(req, res)) return;
    const order = db.orders.find((o) => o.id === om[1]);
    if (!order) return send(res, 404, { error: "Order not found" });
    const b = await readBody(req);
    const stages = ["Intake", "Script", "Voiceover", "Style Lock", "Scenes", "Sound", "Render & QC", "Delivery", "Cancelled"];
    if (stages.includes(b.stage)) order.stage = b.stage;
    if (typeof b.deliveryLink === "string") order.deliveryLink = b.deliveryLink.slice(0, 1000);
    saveDB(db);
    return send(res, 200, { ok: true, order });
  }
  if (p === "/api/admin/settings" && req.method === "POST") {
    const owner = needOwner(req, res); if (!owner) return;
    const b = await readBody(req);
    if (b.pricePerMinute != null) {
      const v = parseInt(b.pricePerMinute);
      if (v > 0) db.settings.pricePerMinute = v;
    }
    if (b.ownerPassword) {
      const pw = String(b.ownerPassword);
      if (pw.length < 6) return send(res, 400, { error: "Owner password too short (min 6)." });
      owner.salt = crypto.randomBytes(16).toString("hex");
      owner.passHash = hashPw(pw, owner.salt);
      logEvent("password_changed", "owner", "owner changed own password");
    }
    saveDB(db);
    return send(res, 200, { ok: true, settings: db.settings });
  }

  return send(res, 404, { error: "Not found" });
}

/* ---------------- static files ---------------- */
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/api/")) return api(req, res, url);
  let file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  file = path.normalize(path.join(PUBLIC, file));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
    file = path.join(PUBLIC, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "text/plain" });
  fs.createReadStream(file).pipe(res);
});
server.listen(PORT, () => {
  console.log(`Wotify website chal rahi hai: http://localhost:${PORT}`);
  console.log(`Owner login: username "${OWNER_USERNAME}"`);
  if (!RADOX_KEY) console.log("NOTE: RADOX_API_KEY set nahi hai — chatbot kaam nahi karega.");
});
