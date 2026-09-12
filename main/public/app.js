let token = localStorage.getItem("token") || "";
let user = JSON.parse(localStorage.getItem("user") || "null");
let demoCitizens = null;
let eventSource = null;

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const hashCode = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(16).slice(0, 8).toUpperCase(); };

function showToast(title, body) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<b>${esc(title)}</b><br>${esc(body)}`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 4500);
}

function saveSession(t, u) { token = t; user = u; localStorage.setItem("token", t); localStorage.setItem("user", JSON.stringify(u)); renderApp(); }
function logout() { localStorage.removeItem("token"); localStorage.removeItem("user"); location.reload(); }

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  let data = null;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

function statusBadge(s) {
  const map = { APPROVED: "green", REJECTED: "red", PENDING_REVIEW: "yellow", PROCESSING: "blue", FAILED: "red" };
  return `<span class="badge ${map[s] || "gray"}">${s}</span>`;
}

function scoreBadge(score) {
  if (score == null) return "-";
  const cls = score >= 85 ? "green" : score >= 60 ? "yellow" : "red";
  return `<span class="badge ${cls}">${score}% match</span>`;
}

const scoreColor = (s) => (s >= 85 ? "#067647" : s >= 60 ? "#b54708" : "#b42318");

async function quickLogin(payload) {
  try {
    const data = await apiFetch("/api/sso/login", { method: "POST", body: JSON.stringify(payload) });
    saveSession(data.token, data.user);
  } catch (e) { $("login-error").textContent = e.message; }
}

function initLoginEvents() {
  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    quickLogin({
      role: $("role").value,
      name: $("name").value.trim(),
      aadhaar: $("aadhaar").value.trim(),
      staffId: $("staffId").value.trim(),
      password: $("password").value
    });
  });
  $("quick-citizen-success").addEventListener("click", () => quickLogin({ role: "CITIZEN", ...demoCitizens.clean }));
  $("quick-citizen-reject").addEventListener("click", () => quickLogin({ role: "CITIZEN", ...demoCitizens.variation }));
  $("quick-citizen-review").addEventListener("click", () => quickLogin({ role: "CITIZEN", ...demoCitizens.missingIncome }));
  $("quick-official").addEventListener("click", () => quickLogin({ role: "OFFICIAL", staffId: "OFF-101", password: "officer@123" }));
  $("quick-admin").addEventListener("click", () => quickLogin({ role: "ADMIN", staffId: "ADM-001", password: "admin@123" }));
}

function renderTabs() {
  const tabs = [];
  if (user.role === "CITIZEN") tabs.push({ id: "services", label: "Government Services" }, { id: "applications", label: "My Applications" }, { id: "notifications", label: "Notifications" });
  if (user.role === "OFFICIAL") tabs.push({ id: "review", label: "Review Applications" }, { id: "notifications", label: "Notifications" });
  if (user.role === "ADMIN") tabs.push({ id: "monitoring", label: "Monitoring" }, { id: "audit", label: "Audit Logs" }, { id: "notifications", label: "Notifications" });
  const nav = $("tabs");
  nav.innerHTML = "";
  tabs.forEach((t, i) => {
    const b = document.createElement("button");
    b.textContent = t.label; b.dataset.tab = t.id;
    b.addEventListener("click", () => openTab(t.id));
    nav.appendChild(b);
    if (i === 0) { b.classList.add("active"); openTab(t.id); }
  });
}

function openTab(id) {
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  $("content").innerHTML = "<p>Loading...</p>";
  if (id === "services") renderServices();
  if (id === "applications") renderApplications();
  if (id === "notifications") renderNotifications();
  if (id === "review") renderReview();
  if (id === "monitoring") renderMonitoring();
  if (id === "audit") renderAudit();
}

async function renderServices() {
  const services = await apiFetch("/api/services");
  $("content").innerHTML = `
    <h2>Unified Government Services</h2>
    <p class="muted">Apply once — SETU verifies your data across connected departments automatically.</p>
    <div class="service-grid">
      ${services.map((s) => `
        <div class="service-card">
          <div class="icon">${s.icon}</div>
          <h3>${esc(s.name)}</h3>
          <p class="muted">${esc(s.department)}</p>
          <p class="muted">${esc(s.description)}</p>
          <p class="muted"><b>Eligibility:</b> ${esc(s.eligibilityText)}</p>
          <button class="btn primary" onclick="openApplyForm('${s.code}')">Apply Now</button>
        </div>`).join("")}
    </div>`;
}

async function openApplyForm(code) {
  const services = await apiFetch("/api/services");
  const s = services.find((x) => x.code === code);
  $("content").innerHTML = `
    <h2>${s.icon} Apply: ${esc(s.name)}</h2>
    <p class="muted">${esc(s.department)} · Eligibility: ${esc(s.eligibilityText)}</p>
    <div class="form-grid">
      <label>Aadhaar Number<input id="f_aadhaar" value="${esc(user.aadhaar)}"></label>
      <label>Full Name (as per your records)<input id="f_name" value="${esc(user.name)}"></label>
      <label>Date of Birth<input id="f_dob" type="date"></label>
      <label>Gender<select id="f_gender"><option value="">Select</option><option>MALE</option><option>FEMALE</option><option>OTHER</option></select></label>
      <label>Caste (as per your records)<select id="f_caste"><option value="">Select</option><option>GENERAL</option><option>OBC</option><option>SC</option><option>ST</option></select></label>
      <label>Residential Address<input id="f_address" placeholder="House, Street, City"></label>
      <label>Declared Annual Income (Rs)<input id="f_income" type="number" placeholder="e.g. 85000"></label>
    </div>
    <div class="btn-group">
      <button class="btn ghost" onclick="autofill('exact')">⚡ Auto-fill my exact data (demo shortcut)</button>
      <button class="btn ghost" onclick="autofill('mismatch')">⚡ Auto-fill with mismatches (demo)</button>
    </div>
    <label class="consent-row"><input type="checkbox" id="consent" style="width:auto"> I provide consent for secure data sharing between government systems.</label>
    <div class="btn-group"><button class="btn primary" id="submit-btn">Submit Application</button></div>
    <div id="apply-result"></div>`;
  $("submit-btn").addEventListener("click", () => submitApplication(code));
}

async function autofill(mode) {
  const aadhaar = $("f_aadhaar").value.trim();
  try {
    const digi = await apiFetch(`/api/proxy/digilocker/${aadhaar}`);
    const list = await apiFetch("/api/proxy/income");
    const inc = list.find((x) => x.aadhaar === aadhaar);
    const p = digi.payload;
    let dob = p.dob, address = p.address, gender = p.gender, income = inc ? inc.annualIncome : 90000, name = p.name;
    if (mode === "mismatch") {
      const [y, m, d] = dob.split("-").map(Number);
      dob = `${y}-${String(m).padStart(2, "0")}-${String(d + 1 > 28 ? 1 : d + 1).padStart(2, "0")}`;
      address = address.split(",")[0] + ", " + (address.split(",")[2] || "");
      name = name.slice(0, -2);
      income = Math.round(income * 1.4);
    }
    $("f_name").value = name; $("f_dob").value = dob; $("f_gender").value = gender; $("f_caste").value = p.caste || "";
    $("f_address").value = address; $("f_income").value = income;
  } catch (e) { alert("Could not auto-fill: " + e.message); }
}

async function submitApplication(code) {
  const result = $("apply-result");
  if (!$("consent").checked) { result.innerHTML = `<div class="notice"><b>Consent is required to proceed.</b></div>`; return; }
  const form = {
    aadhaar: $("f_aadhaar").value.trim(),
    name: $("f_name").value.trim(),
    dob: $("f_dob").value,
    gender: $("f_gender").value,
    caste: $("f_caste").value,
    address: $("f_address").value.trim(),
    declaredIncome: Number($("f_income").value || 0)
  };
  $("submit-btn").disabled = true; $("submit-btn").textContent = "Verifying across departments...";
  try {
    const { application } = await apiFetch("/api/applications", { method: "POST", body: JSON.stringify({ serviceCode: code, form, consent: true }) });
    result.innerHTML = resultPanel(application);
  } catch (e) {
    result.innerHTML = `<div class="notice"><b>Error:</b> ${esc(e.message)}</div>`;
  }
  $("submit-btn").disabled = false; $("submit-btn").textContent = "Submit Application";
}

function resultPanel(a) {
  const score = a.match ? a.match.score : null;
  return `
    <div class="notice">
      <h3>Application ${esc(a.id)} — ${statusBadge(a.finalStatus)}</h3>
      ${score != null ? `
        <div style="margin:12px 0">
          <div class="muted">Inter-department data match score: <b style="color:${scoreColor(score)}">${score}%</b></div>
          <div class="score-bar"><div class="score-fill" style="width:${score}%;background:${scoreColor(score)}"></div></div>
        </div>
        <table><thead><tr><th>Field</th><th>You submitted</th><th>Department record</th><th>Source</th><th>Score</th></tr></thead>
        <tbody>${a.match.breakdown.map((b) => `<tr><td>${esc(b.field)}</td><td>${esc(b.submitted)}</td><td>${esc(b.source)}</td><td>${esc(b.sourceSystem)}</td><td>${b.pts}/${b.max}</td></tr>`).join("")}</tbody></table>` : ""}
      <p style="margin-top:10px"><b>Remarks:</b> ${esc(a.remarks)}</p>
      ${a.consent ? `<p class="muted" style="margin-top:8px">🔐 <b>Consent receipt:</b> ${esc(a.consent.purpose)} · shared with ${a.consent.sharedWith.join(" + ")} · fields: ${a.consent.scope.join(", ")} · ${new Date(a.consent.at).toLocaleString()}</p>` : ""}
      ${a.finalStatus === "APPROVED" ? `<div class="certificate"><div class="cert-head">🏛️ DIGITAL CERTIFICATE — ${esc(a.serviceName).toUpperCase()}</div><p>Issued to <b>${esc(a.userName)}</b> (Aadhaar ****${esc(String(a.userAadhaar).slice(-4))})</p><p>Verification ID: <b>SAM-${hashCode(a.id + (a.match ? a.match.score : 0))}</b> · Match score: <b>${a.match ? a.match.score : "-"}%</b></p><p class="muted">Digitally verified via SETU Match Engine on ${new Date(a.updatedAt).toLocaleString()}</p></div>` : ""}
    </div>`;
}

async function renderApplications() {
  const apps = await apiFetch("/api/applications");
  $("content").innerHTML = `<h2>My Applications</h2>` + (apps.length ? `
    <table><thead><tr><th>ID</th><th>Service</th><th>Match</th><th>Status</th><th>Updated</th><th></th></tr></thead>
    <tbody>${apps.map((a) => `<tr><td>${esc(a.id)}</td><td>${esc(a.serviceName)}</td><td>${scoreBadge(a.match?.score)}</td><td>${statusBadge(a.finalStatus)}</td><td>${new Date(a.updatedAt).toLocaleString()}</td><td><button class="btn small" onclick="viewApplication('${a.id}')">Details</button></td></tr>`).join("")}</tbody></table>
    <div id="application-detail"></div>` : `<p class="muted">No applications yet. Visit Government Services to apply.</p>`);
}

async function viewApplication(id) {
  const d = $("application-detail");
  d.innerHTML = "<p>Loading...</p>";
  const data = await apiFetch(`/api/applications/${id}`);
  d.innerHTML = `<div class="card">${resultPanel(data.application)}
    <h3 style="margin-top:16px">Processing Timeline</h3>
    <div class="timeline">${data.timeline.map((e) => `<div class="timeline-item"><b>${esc(e.type)}</b><br>${esc(e.description)}<br><span class="muted">${new Date(e.at).toLocaleString()}</span></div>`).join("")}</div></div>`;
}

async function renderReview() {
  const apps = await apiFetch("/api/applications");
  $("content").innerHTML = `<h2>Official Review Dashboard</h2>
    <table><thead><tr><th>ID</th><th>Citizen</th><th>Service</th><th>Match</th><th>Status</th><th>Remarks</th><th>Action</th></tr></thead>
    <tbody>${apps.map((a) => `<tr>
      <td>${esc(a.id)}<br><button class="btn small ghost" onclick="viewApplication('${a.id}')" style="margin-top:6px">Breakdown</button></td>
      <td>${esc(a.userName)}</td><td>${esc(a.serviceName)}</td><td>${scoreBadge(a.match?.score)}</td><td>${statusBadge(a.finalStatus)}</td><td>${esc(a.remarks || "-")}</td>
      <td>${a.finalStatus === "PENDING_REVIEW" ? `<button class="btn small" onclick="decide('${a.id}','APPROVE')">Approve</button> <button class="btn small" onclick="decide('${a.id}','REJECT')">Reject</button>` : "-"}</td>
    </tr>`).join("")}</tbody></table><div id="application-detail"></div>`;
}

async function decide(id, action) {
  await apiFetch(`/api/applications/${id}/decision`, { method: "POST", body: JSON.stringify({ action }) });
  renderReview();
}

async function renderMonitoring() {
  const d = await apiFetch("/api/admin/monitoring");
  $("content").innerHTML = `<h2>Monitoring Dashboard</h2>
    <div class="metric-grid">
      <div class="metric-card"><h3>${d.metrics.total}</h3><p class="muted">Total Applications</p></div>
      <div class="metric-card"><h3>${d.metrics.byStatus.APPROVED || 0}</h3><p class="muted">Approved</p></div>
      <div class="metric-card"><h3>${d.metrics.byStatus.PENDING_REVIEW || 0}</h3><p class="muted">Pending Review</p></div>
      <div class="metric-card"><h3>${d.metrics.byStatus.REJECTED || 0}</h3><p class="muted">Rejected</p></div>
      <div class="metric-card"><h3>${d.metrics.avgScore}%</h3><p class="muted">Avg Match Score</p></div>
      <div class="metric-card"><h3>${d.metrics.avgProcessingSec}s</h3><p class="muted">Avg Processing Time</p></div>
      <div class="metric-card"><h3>${d.metrics.exceptions}</h3><p class="muted">Exceptions</p></div>
    </div>
    <h3 style="margin-top:18px">Connector Health</h3>
    <table><thead><tr><th>Connector</th><th>Status</th><th>Format</th><th>Records</th></tr></thead>
    <tbody>${d.connectors.map((c) => `<tr><td>${esc(c.name)}</td><td><span class="badge ${c.status === "UP" ? "green" : "red"}">${c.status}</span></td><td>${esc(c.format)}</td><td>${esc(c.records)}</td></tr>`).join("")}</tbody></table>
    <h3 style="margin-top:18px">Connector Traffic (live)</h3>
    <table><thead><tr><th>Time</th><th>From → To</th><th>Format</th><th>Status</th><th>Latency</th></tr></thead>
    <tbody>${(d.recentTraffic || []).map((t) => `<tr><td>${new Date(t.at).toLocaleTimeString()}</td><td>${esc(t.from)} → ${esc(t.to)}</td><td>${esc(t.format)}</td><td><span class="badge ${t.status === "OK" ? "green" : "red"}">${esc(t.status)}</span></td><td>${t.latencyMs} ms</td></tr>`).join("")}</tbody></table>
    <h3 style="margin-top:18px">Recent Exceptions</h3>
    ${d.recentExceptions.length ? `<table><thead><tr><th>Application</th><th>Field</th><th>Type</th><th>Details</th></tr></thead><tbody>${d.recentExceptions.map((e) => `<tr><td>${esc(e.applicationId)}</td><td>${esc(e.field)}</td><td>${esc(e.errorType)}</td><td>${esc(e.details)}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No exceptions found.</p>`}`;
}

async function renderAudit() {
  const logs = await apiFetch("/api/admin/audit");
  $("content").innerHTML = `<h2>Audit Logs</h2>` + (logs.length ? `
    <table><thead><tr><th>Time</th><th>Action</th><th>Details</th></tr></thead>
    <tbody>${logs.map((l) => `<tr><td>${new Date(l.at).toLocaleString()}</td><td>${esc(l.action)}</td><td>${esc(JSON.stringify(l.details))}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No logs yet.</p>`);
}

async function renderNotifications() {
  const list = await apiFetch("/api/notifications");
  $("content").innerHTML = `<h2>Notifications</h2>` + (list.length ? list.map((n) => `<div class="notice"><b>${esc(n.title)}</b><br>${esc(n.body)}<br><span class="muted">${new Date(n.at).toLocaleString()}</span></div>`).join("") : `<p class="muted">No notifications.</p>`);
}

function renderApp() {
  $("login-view").classList.add("hidden");
  $("app-view").classList.remove("hidden");
  $("session-info").innerHTML = `<div style="text-align:right"><b>${esc(user.name)}</b><br><span style="color:#dbe7ff;font-size:13px">${esc(user.role)}</span><br><button class="btn small" style="margin-top:8px" onclick="logout()">Logout</button></div>`;
  renderTabs();
  if (eventSource) eventSource.close();
  eventSource = new EventSource(`/api/events?token=${token}`);
  eventSource.onmessage = (e) => {
    const n = JSON.parse(e.data);
    if (user.role === "CITIZEN" && n.userAadhaar !== user.aadhaar) return;
    showToast(n.title, n.body);
  };
}

async function init() {
  try { demoCitizens = await (await fetch("/api/demo-citizens")).json(); }
  catch { demoCitizens = { clean: { aadhaar: "200000100000", name: "Aarav Sharma" }, variation: { aadhaar: "200300123737", name: "Ananya Iyer" }, missingIncome: { aadhaar: "202300282137", name: "Shalini Iyer" } }; }
  initLoginEvents();
  if (token && user) renderApp();
}
init();