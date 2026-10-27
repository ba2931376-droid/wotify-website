"use strict";
const $ = (s, el) => (el || document).querySelector(s);
const root = document.getElementById("root");

const HOODIES = [
  { name: "Yellow", hex: "#f2b41a" }, { name: "Red", hex: "#e8472b" },
  { name: "Blue", hex: "#2e6db4" }, { name: "Green", hex: "#3fa34d" },
  { name: "Purple", hex: "#8b5cf6" }, { name: "Pink", hex: "#ff7bac" },
];
const MOODS = [
  { name: "Happy", bg: "#f7b733", eye: 1, mouth: "smile" },
  { name: "Tense", bg: "#5b2a86", eye: 1.35, mouth: "flat" },
  { name: "Calm", bg: "#3a7ca5", eye: 0.8, mouth: "smile" },
  { name: "Dark", bg: "#191924", eye: 1.1, mouth: "flat" },
  { name: "Funny", bg: "#e86aa8", eye: 0.9, mouth: "grin" },
];
const STYLES = [
  { name: "Dusk", top: "#26204a", bot: "#7a3e6e" },
  { name: "Midnight", top: "#06081a", bot: "#16224a" },
  { name: "Golden", top: "#402656", bot: "#f0a03c" },
  { name: "Neon", top: "#0a0622", bot: "#46105c" },
  { name: "Storybook", top: "#608cc8", bot: "#c4e2f5" },
];
const VOICES = ["Helio", "Confident Trumpet", "Bold Flag", "Boomy Mountain",
  "Satiny Moon", "Gruff Brick", "Loud Gravel", "Burnished Trophy",
  "Wise Lighthouse", "Intense Cymbal"];
const STAGES = ["Intake", "Script", "Voiceover", "Style Lock", "Scenes",
  "Sound", "Render & QC", "Delivery", "Cancelled"];

function heroSVG(hoodie, mood, style) {
  const m = MOODS.find((x) => x.name === mood) || MOODS[1];
  const s = STYLES.find((x) => x.name === style) || STYLES[0];
  const gid = Math.random().toString(36).slice(2, 8);
  const eyeH = 9 * m.eye;
  const mouth = m.mouth === "smile"
    ? '<path d="M44 40 Q50 45 56 40" stroke="#fff" stroke-width="2" fill="none"/>'
    : m.mouth === "grin"
    ? '<path d="M44 39 Q50 47 56 39 Z" fill="#fff"/>'
    : '<line x1="45" y1="41" x2="55" y2="41" stroke="#fff" stroke-width="2"/>';
  return `<svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="g${gid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${s.top}"/><stop offset="1" stop-color="${s.bot}"/>
  </linearGradient></defs>
  <rect width="100" height="110" fill="url(#g${gid})"/>
  <circle cx="84" cy="16" r="6" fill="${m.bg}"/>
  <rect y="88" width="100" height="22" fill="#14101f"/>
  <line x1="38" y1="76" x2="31" y2="98" stroke="#0c0c0e" stroke-width="4"/>
  <line x1="62" y1="76" x2="69" y2="98" stroke="#0c0c0e" stroke-width="4"/>
  <rect x="31" y="46" width="38" height="33" rx="9" fill="${hoodie}"/>
  <line x1="33" y1="52" x2="24" y2="72" stroke="#0c0c0e" stroke-width="4"/>
  <line x1="67" y1="52" x2="76" y2="72" stroke="#0c0c0e" stroke-width="4"/>
  <text x="50" y="70" font-size="15" font-weight="bold" fill="#fff" text-anchor="middle">W</text>
  <circle cx="50" cy="29" r="17" fill="#0c0c0e"/>
  <ellipse cx="43.5" cy="28" rx="3.6" ry="${eyeH}" fill="#fff"/>
  <ellipse cx="56.5" cy="28" rx="3.6" ry="${eyeH}" fill="#fff"/>
  ${mouth}</svg>`;
}

let me = null, price = 1000, tab = "order";
let sel = { hoodie: "Yellow", mood: "Tense", style: "Dusk" };
let chatMsgs = [];

async function api(path, method, body) {
  const r = await fetch(path, {
    method: method || "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

/* ---------------- LOGIN ---------------- */
function viewLogin(err) {
  root.innerHTML = `<div class="wrap"><div class="center">
    <div class="logo">WOTI<span>FY</span></div>
    <div class="tagline">ONE QUESTION. INFINITE POSSIBILITIES.</div>
    <div class="card">
      <h2>Login</h2>
      ${err ? `<div class="err">${esc(err)}</div>` : ""}
      <label>Username</label>
      <input id="lu" placeholder="owner ya client01" autocomplete="username">
      <label>Password</label>
      <input id="lp" type="password" placeholder="Password" autocomplete="current-password">
      <div style="margin-top:16px"><button id="lgo" style="width:100%">Login</button></div>
      <p class="muted" style="margin-top:12px">Clients: apna username aur password owner se lein.</p>
    </div></div></div>`;
  $("#lgo").onclick = async () => {
    try {
      const d = await api("/api/login", "POST", { username: $("#lu").value, password: $("#lp").value });
      me = d.user; price = d.pricePerMinute || price;
      tab = me.role === "owner" ? "clients" : "order";
      viewApp();
    } catch (e) { viewLogin(e.message); }
  };
  $("#lp").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#lgo").click(); });
}

/* ---------------- APP SHELL ---------------- */
async function refreshMe() {
  const d = await api("/api/me");
  me = d.user; price = d.pricePerMinute;
}
function header() {
  return `<header class="top">
    <div class="logo" style="font-size:26px">WOTI<span>FY</span> STUDIO</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span class="badge">👤 <b>${esc(me.username)}</b>${me.role === "owner" ? " (owner)" : ""}</span>
      ${me.role !== "owner" ? `<span class="badge">Credits: <b>${me.credits}</b></span>` : ""}
      <button class="ghost small" id="logout">Logout</button>
    </div></header>`;
}
function tabsHTML(list) {
  return `<div class="tabs">${list.map(([id, nm]) =>
    `<button data-tab="${id}" class="${tab === id ? "on" : ""}">${nm}</button>`).join("")}</div>`;
}
async function viewApp() {
  await refreshMe();
  if (me.role === "owner") return viewOwner();
  return viewClient();
}
function bindTabs() {
  document.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => { tab = b.dataset.tab; viewApp(); }));
  $("#logout").onclick = async () => { await api("/api/logout", "POST", {}); me = null; viewLogin(); };
}

/* ---------------- CLIENT ---------------- */
function picksHTML(kind, items, current) {
  return `<div class="grid">${items.map((it) => {
    const svg = kind === "hoodie" ? heroSVG(it.hex, sel.mood, sel.style)
      : kind === "mood" ? heroSVG(selHex(), it.name, sel.style)
      : heroSVG(selHex(), sel.mood, it.name);
    return `<div class="pick ${current === it.name ? "on" : ""}" data-kind="${kind}" data-name="${esc(it.name)}">${svg}<div class="nm">${esc(it.name)}</div></div>`;
  }).join("")}</div>`;
}
function selHex() { return (HOODIES.find((h) => h.name === sel.hoodie) || HOODIES[0]).hex; }

async function viewClient() {
  let body = "";
  if (tab === "order") {
    body = `<div class="card"><h2>Nayi Video Order Karein</h2>
      <label>Video ka title</label><input id="o_title" placeholder="What If ...?">
      <label>Aap kya dein ge?</label>
      <select id="o_type"><option value="topic">Sirf topic / idea</option>
      <option value="script">Mera apna script</option>
      <option value="voiceover">Meri apni voiceover (details neeche likhein)</option></select>
      <label>Details (topic, script, ya voiceover ki malomat)</label>
      <textarea id="o_brief" rows="5" placeholder="Yahan likhein..."></textarea>
      <label>Narrator voice</label>
      <select id="o_voice">${VOICES.map((v) => `<option>${v}</option>`).join("")}</select>
      <label>Hoodie color (dekh kar chunein)</label><div id="pk_hoodie">${picksHTML("hoodie", HOODIES, sel.hoodie)}</div>
      <label>Mood (dekh kar chunein)</label><div id="pk_mood">${picksHTML("mood", MOODS, sel.mood)}</div>
      <label>Style (dekh kar chunein)</label><div id="pk_style">${picksHTML("style", STYLES, sel.style)}</div>
      <div class="row">
        <div><label>Format</label><select id="o_format"><option>16:9</option><option>9:16</option></select></div>
        <div><label>Minutes</label><input id="o_min" type="number" value="1" min="1" max="60"></div>
        <div><label>Captions</label><select id="o_cap"><option value="1">On</option><option value="0">Off</option></select></div>
      </div>
      <p class="muted" id="o_cost" style="margin-top:12px"></p>
      <div id="o_msg"></div>
      <div style="margin-top:12px"><button id="o_go">Order Karein</button></div></div>`;
  } else if (tab === "videos") {
    const d = await api("/api/orders");
    body = `<div class="card"><h2>Meri Videos</h2>` + (d.orders.length ? "" : `<p class="muted">Abhi koi order nahi.</p>`) +
      d.orders.map((o) => `<div class="card" style="background:var(--card2)">
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <b>${esc(o.title)}</b><span class="stage ${o.stage === "Delivery" ? "done" : ""}">${esc(o.stage)}</span></div>
        <p class="muted">${esc(o.minutes)} min · ${esc(o.voice)} · hoodie ${esc(o.hoodie)} · ${esc(o.mood)} · ${esc(o.style)} · ${esc(o.format)} · ${esc(o.cost)} credits</p>
        ${o.deliveryLink ? `<code class="linkbox">${esc(o.deliveryLink)}</code>` : `<p class="muted">Video abhi ban rahi hai — stage upar dekh sakte hain.</p>`}
      </div>`).join("") + `</div>`;
  } else if (tab === "chat") {
    body = `<div class="card"><h2>Studio Chat (AI Assistant)</h2>
      <div class="chatbox" id="chatbox">${chatMsgs.map((m) =>
        `<div class="msg ${m.role === "user" ? "me" : "ai"}">${esc(m.content)}</div>`).join("")}</div>
      <div class="row" style="margin-top:10px">
        <div style="flex:4"><input id="chat_in" placeholder="Idea ya script ke liye poochhein..."></div>
        <div style="flex:1"><button id="chat_go" style="width:100%">Send</button></div>
      </div><div id="chat_err"></div></div>`;
  }
  root.innerHTML = `<div class="wrap">${header()}${tabsHTML([["order", "🎬 New Order"], ["videos", "📼 My Videos"], ["chat", "💬 Studio Chat"]])}${body}</div>`;
  bindTabs();
  if (tab === "order") {
    const cost = () => { const m = parseInt($("#o_min").value) || 1; $("#o_cost").textContent = `Cost: ${m * price} credits (${price}/minute) — aap ke paas ${me.credits} credits hain.`; };
    $("#o_min").addEventListener("input", cost); cost();
    document.querySelectorAll(".pick").forEach((pk) => pk.addEventListener("click", () => {
      sel[pk.dataset.kind] = pk.dataset.name; viewClient();
    }));
    $("#o_go").onclick = async () => {
      try {
        const d = await api("/api/orders", "POST", {
          title: $("#o_title").value, briefType: $("#o_type").value, brief: $("#o_brief").value,
          voice: $("#o_voice").value, hoodie: sel.hoodie, mood: sel.mood, style: sel.style,
          format: $("#o_format").value, captions: $("#o_cap").value === "1",
          minutes: parseInt($("#o_min").value) || 1,
        });
        me.credits = d.credits; tab = "videos"; viewApp();
      } catch (e) { $("#o_msg").innerHTML = `<div class="err">${esc(e.message)}</div>`; }
    };
  }
  if (tab === "chat") {
    const box = $("#chatbox"); box.scrollTop = box.scrollHeight;
    const send = async () => {
      const v = $("#chat_in").value.trim(); if (!v) return;
      chatMsgs.push({ role: "user", content: v }); viewClient();
      try {
        const d = await api("/api/chat", "POST", { messages: chatMsgs });
        chatMsgs.push({ role: "assistant", content: d.reply });
      } catch (e) { chatMsgs.push({ role: "assistant", content: "⚠ " + e.message }); }
      if (me && tab === "chat") viewClient();
    };
    $("#chat_go").onclick = send;
    $("#chat_in").addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    const inp = $("#chat_in"); if (inp) inp.focus();
  }
}

/* ---------------- OWNER ---------------- */
async function viewOwner() {
  const d = await api("/api/admin/overview");
  let body = "";
  if (tab === "clients") {
    const clients = d.users.filter((u) => u.role === "client");
    body = `<div class="card"><h2>Clients</h2><div id="c_msg"></div>
      <div class="row">
        <div><label>Naya client — password (khaali chhorein to auto banega)</label><input id="nc_pw" placeholder="password"></div>
        <div style="flex:0"><button id="nc_go">+ Client Banayein</button></div>
      </div>
      <table><tr><th>Username</th><th>Credits</th><th>Status</th><th>Set Credits</th><th>Change Password</th><th>Block</th></tr>
      ${clients.map((c) => `<tr>
        <td><b>${esc(c.username)}</b></td><td>${c.credits}</td>
        <td>${c.blocked ? "🚫 Blocked" : "✅ Active"}</td>
        <td><div style="display:flex;gap:5px"><input type="number" id="cr_${c.id}" value="${c.credits}" style="width:90px"><button class="small ghost" data-act="credits" data-id="${c.id}">Set</button></div></td>
        <td><div style="display:flex;gap:5px"><input id="pw_${c.id}" placeholder="new password" style="width:130px"><button class="small ghost" data-act="password" data-id="${c.id}">Change</button></div></td>
        <td><button class="small ${c.blocked ? "" : "danger"}" data-act="block" data-id="${c.id}" data-on="${c.blocked ? 0 : 1}">${c.blocked ? "Unblock" : "Block"}</button></td>
      </tr>`).join("") || `<tr><td colspan="6" class="muted">Abhi koi client nahi.</td></tr>`}
      </table></div>`;
  } else if (tab === "orders") {
    body = `<div class="card"><h2>Sare Orders</h2>` + (d.orders.length ? "" : `<p class="muted">Koi order nahi.</p>`) +
      d.orders.map((o) => `<div class="card" style="background:var(--card2)">
        <b>${esc(o.title)}</b> <span class="muted">— ${esc(o.username)} · ${esc(o.minutes)} min · ${esc(o.cost)} credits</span>
        <p class="muted">${esc(o.briefType)} · ${esc(o.voice)} · hoodie ${esc(o.hoodie)} · ${esc(o.mood)} · ${esc(o.style)} · ${esc(o.format)}${o.captions ? " · captions" : ""}</p>
        <p class="muted" style="white-space:pre-wrap">${esc(o.brief).slice(0, 400)}</p>
        <div class="row">
          <div><label>Stage</label><select id="st_${o.id}">${STAGES.map((s) => `<option ${s === o.stage ? "selected" : ""}>${s}</option>`).join("")}</select></div>
          <div style="flex:2"><label>Delivery link (plain text)</label><input id="dl_${o.id}" value="${esc(o.deliveryLink)}" placeholder="https://..."></div>
          <div style="flex:0"><button class="small" data-save="${o.id}">Save</button></div>
        </div></div>`).join("") + `</div>`;
  } else if (tab === "logins") {
    body = `<div class="card"><h2>Login Activity</h2>
      <table><tr><th>Time</th><th>Event</th><th>User</th><th>Detail</th></tr>
      ${d.loginEvents.map((e) => `<tr><td class="muted">${esc(e.at.replace("T", " ").slice(0, 19))}</td><td>${esc(e.type)}</td><td>${esc(e.username)}</td><td class="muted">${esc(e.detail)}</td></tr>`).join("")}
      </table></div>
      <div class="card"><h2>Credits Ledger</h2>
      <table><tr><th>Time</th><th>User</th><th>Change</th><th>Reason</th></tr>
      ${d.ledger.map((e) => `<tr><td class="muted">${esc(e.at.replace("T", " ").slice(0, 19))}</td><td>${esc(e.who)}</td><td>${e.delta > 0 ? "+" : ""}${e.delta}</td><td class="muted">${esc(e.why)}</td></tr>`).join("")}
      </table></div>`;
  } else if (tab === "settings") {
    body = `<div class="card"><h2>Settings</h2><div id="s_msg"></div>
      <label>Price per minute (credits)</label><input id="set_price" type="number" value="${d.settings.pricePerMinute}">
      <label>Apna owner password badlein</label><input id="set_pw" type="password" placeholder="new password (min 6)">
      <div style="margin-top:14px"><button id="set_go">Save Settings</button></div>
      <p class="muted" style="margin-top:10px">Owner username hamesha <b>owner</b> rehta hai.</p></div>`;
  }
  root.innerHTML = `<div class="wrap">${header()}${tabsHTML([["clients", "👥 Clients"], ["orders", "🎬 Orders"], ["logins", "📜 Logins & Ledger"], ["settings", "⚙ Settings"]])}${body}</div>`;
  bindTabs();
  if (tab === "clients") {
    $("#nc_go").onclick = async () => {
      const d2 = await api("/api/admin/clients", "POST", { password: $("#nc_pw").value });
      $("#c_msg").innerHTML = `<div class="ok">Client ban gaya — Username: <b>${esc(d2.username)}</b> · Password: <b>${esc(d2.password)}</b><br>Ye password client ko de dein (dobara nahi dikhega).</div>`;
      setTimeout(viewApp, 2500);
    };
    document.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.dataset.id, act = b.dataset.act;
      if (act === "credits") await api(`/api/admin/clients/${id}/credits`, "POST", { credits: parseInt($("#cr_" + id).value) || 0 });
      if (act === "password") { const v = $("#pw_" + id).value; if (v) await api(`/api/admin/clients/${id}/password`, "POST", { password: v }); }
      if (act === "block") await api(`/api/admin/clients/${id}/block`, "POST", { blocked: b.dataset.on === "1" });
      viewApp();
    }));
  }
  if (tab === "orders") {
    document.querySelectorAll("[data-save]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.dataset.save;
      await api(`/api/admin/orders/${id}`, "POST", { stage: $("#st_" + id).value, deliveryLink: $("#dl_" + id).value });
      viewApp();
    }));
  }
  if (tab === "settings") {
    $("#set_go").onclick = async () => {
      try {
        await api("/api/admin/settings", "POST", { pricePerMinute: parseInt($("#set_price").value) || 1000, ownerPassword: $("#set_pw").value || undefined });
        $("#s_msg").innerHTML = `<div class="ok">Settings save ho gayi.</div>`;
      } catch (e) { $("#s_msg").innerHTML = `<div class="err">${esc(e.message)}</div>`; }
    };
  }
}

/* ---------------- boot ---------------- */
(async () => {
  try { await refreshMe(); tab = me.role === "owner" ? "clients" : "order"; viewApp(); }
  catch (e) { viewLogin(); }
})();
