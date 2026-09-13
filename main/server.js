const express = require("express");
const cors = require("cors");
const path = require("path");
const { citizens } = require("../servers/data");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5000;

const STAFF = [
  { staffId: "OFF-101", password: "officer@123", name: "Officer Rao", role: "OFFICIAL", department: "Food & Civil Supplies" },
  { staffId: "OFF-102", password: "officer@123", name: "Officer Mehta", role: "OFFICIAL", department: "Social Welfare" },
  { staffId: "ADM-001", password: "admin@123", name: "Admin Rao", role: "ADMIN", department: "Platform Administration" }
];

const state = { applications: [], events: [], audit: [], notifications: [], exceptions: [], traffic: [] };
const sseClients = [];
let applicationCounter = 1001;
const ids = { event: 1, audit: 1, notification: 1, exception: 1 };

const services = [
  { code: "RATION_CARD", name: "Ration Card", icon: "🍚", department: "Food & Civil Supplies", description: "Subsidised food grains for eligible households.", eligibilityText: "Annual income <= Rs 1,00,000 (BPL)", eligibility: (inc, age) => inc.annualIncome <= 100000 },
  { code: "SCHOLARSHIP", name: "Post-Matric Scholarship", icon: "🎓", department: "Education Department", description: "Scholarship for students above Class 10.", eligibilityText: "Age 15-25 and income <= Rs 2,50,000", eligibility: (inc, age) => age >= 15 && age <= 25 && inc.annualIncome <= 250000 },
  { code: "PM_AWAS", name: "PM Awas Yojana", icon: "🏠", department: "Ministry of Housing", description: "Housing support for urban and rural poor.", eligibilityText: "BPL or income <= Rs 1,20,000", eligibility: (inc, age) => inc.category === "BPL" || inc.annualIncome <= 120000 },
  { code: "OLD_AGE_PENSION", name: "Old Age Pension", icon: "👵", department: "Social Welfare", description: "Monthly pension for senior citizens.", eligibilityText: "Age >= 60 and income <= Rs 1,00,000", eligibility: (inc, age) => age >= 60 && inc.annualIncome <= 100000 },
  { code: "INCOME_CERT", name: "Income Certificate", icon: "📜", department: "Revenue Department", description: "Official certificate of annual income.", eligibilityText: "Identity verification only", eligibility: () => true },
  { code: "CASTE_CERT", name: "Caste Certificate (SC/OBC/ST)", icon: "🪪", department: "Revenue Department", description: "Issued only to reserved categories; claimed caste cross-verified against DigiLocker civil record.", eligibilityText: "SC/OBC/ST as per DigiLocker record, and claim must match", eligibility: (inc, age, form, digi) => form.caste === digi.caste && digi.caste !== "GENERAL" },
  { code: "DOMICILE_CERT", name: "Domicile Certificate", icon: "📍", department: "Revenue Department", description: "Proof of residence for state scheme eligibility.", eligibilityText: "Identity + address verification only", eligibility: () => true },
  { code: "PM_JAY", name: "Ayushman Bharat (PM-JAY) Card", icon: "🏥", department: "Health & Family Welfare", description: "Rs 5 lakh health cover per eligible household.", eligibilityText: "BPL category", eligibility: (inc, age) => inc.category === "BPL" },
  { code: "UJJWALA", name: "PM Ujjwala Yojana", icon: "🔥", department: "Petroleum & Natural Gas", description: "Free LPG connection for eligible women.", eligibilityText: "Female, age >= 18, BPL", eligibility: (inc, age, form) => form.gender === "FEMALE" && age >= 18 && inc.category === "BPL" },
  { code: "ESHRAM_CARD", name: "e-Shram Labour Card", icon: "🛠️", department: "Labour Department", description: "Social security for unorganised workers.", eligibilityText: "Age 18-59 and income <= Rs 2,40,000", eligibility: (inc, age) => age >= 18 && age <= 59 && inc.annualIncome <= 240000 }
];

const connectors = [
  { id: "DIGILOCKER", name: "Mock DigiLocker", url: process.env.DIGI_URL || "http://localhost:5001", prefix: process.env.DIGI_PREFIX || "", format: "JSON", timeoutMs: 2500 },
  { id: "INCOME_DEPT", name: "Mock Income Department", url: process.env.INCOME_URL || "http://localhost:5002", prefix: process.env.INCOME_PREFIX || "", format: "XML", timeoutMs: 2500 }
];

const nowIso = () => new Date().toISOString();
const createToken = (user) => Buffer.from(JSON.stringify(user)).toString("base64");
const decodeToken = (t) => { try { return JSON.parse(Buffer.from(t, "base64").toString("utf8")); } catch { return null; } };

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "UNAUTHORIZED" });
  const user = decodeToken(token);
  if (!user) return res.status(401).json({ error: "INVALID_TOKEN" });
  req.user = user;
  next();
}

function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: "FORBIDDEN" });
    next();
  };
}

const logTraffic = (from, to, format, status, latencyMs) => state.traffic.unshift({ id: `TRF-${state.traffic.length + 1}`, at: nowIso(), from, to, format, status, latencyMs });
const broadcast = (payload) => { const msg = `data: ${JSON.stringify(payload)}\n\n`; sseClients.forEach((r) => r.write(msg)); };
const addAudit = (action, details) => state.audit.unshift({ id: `AUD-${ids.audit++}`, at: nowIso(), action, details });
const addEvent = (applicationId, type, description, metadata = {}) => { const seq = ids.event++; state.events.push({ id: `EVT-${seq}`, seq, applicationId, type, description, metadata, at: nowIso() }); };
const addNotification = (userAadhaar, title, body) => { const n = { id: `NTF-${ids.notification++}`, userAadhaar, title, body, at: nowIso() }; state.notifications.unshift(n); broadcast(n); };
const addException = (applicationId, field, errorType, details) => state.exceptions.unshift({ id: `EXC-${ids.exception++}`, applicationId, field, errorType, details, status: "OPEN", at: nowIso() });

async function fetchWithTimeout(url, options = {}, timeoutMs = 2500, label = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (label) logTraffic(label.from, label.to, label.format, response.ok ? "OK" : `HTTP_${response.status}`, Date.now() - started);
    return response;
  } catch (e) {
    if (label) logTraffic(label.from, label.to, label.format, "TIMEOUT/ERROR", Date.now() - started);
    throw e;
  } finally { clearTimeout(timer); }
}

function xmlLeafToJson(xml) {
  const result = {};
  const regex = /<([A-Za-z0-9_]+)>([^<]*)<\/\1>/g;
  let m;
  while ((m = regex.exec(xml))) result[m[1]] = m[2].trim();
  return result;
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}

function sim(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  return Math.max(0, 1 - levenshtein(x, y) / Math.max(x.length, y.length));
}

function tokenJaccard(a, b) {
  const A = new Set(norm(a).split(" ").filter(Boolean));
  const B = new Set(norm(b).split(" ").filter(Boolean));
  let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  const uni = A.size + B.size - inter;
  return uni ? inter / uni : 0;
}

const ageFromDob = (dob) => Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));

function computeMatch(form, digi, income) {
  const breakdown = [];
  let score = 0;
  const add = (field, submitted, source, sourceSystem, pts, max) => breakdown.push({ field, submitted, source, sourceSystem, pts, max });

  const aadhaarOk = form.aadhaar === digi.aadhaar;
  score += aadhaarOk ? 30 : 0;
  add("Aadhaar Number", form.aadhaar, digi.aadhaar, "DigiLocker", aadhaarOk ? 30 : 0, 30);

  const namePts = Math.round(sim(form.name, digi.name) * 20);
  score += namePts;
  add("Full Name", form.name, digi.name, "DigiLocker", namePts, 20);

  const dobOk = form.dob === digi.dob;
  score += dobOk ? 15 : 0;
  add("Date of Birth", form.dob, digi.dob, "DigiLocker", dobOk ? 15 : 0, 15);

  const addrPts = Math.round(tokenJaccard(form.address, digi.address) * 15);
  score += addrPts;
  add("Address", form.address, digi.address, "DigiLocker", addrPts, 15);

  const genOk = norm(form.gender) === norm(digi.gender);
  score += genOk ? 5 : 0;
  add("Gender", form.gender, digi.gender, "DigiLocker", genOk ? 5 : 0, 5);

  const crossPts = Math.round(sim(form.name, income.name) * 10);
  score += crossPts;
  add("Name cross-check", form.name, income.name, "Income Dept", crossPts, 10);

  const incOk = Math.abs(Number(form.declaredIncome) - Number(income.annualIncome)) <= Number(income.annualIncome) * 0.1;
  score += incOk ? 5 : 0;
  add("Declared Income", form.declaredIncome, income.annualIncome, "Income Dept", incOk ? 5 : 0, 5);

  return { score, breakdown };
}

app.get("/health", (req, res) => res.json({ service: "Main Interoperability Platform", status: "UP" }));

app.get("/api/demo-citizens", (req, res) => {
  const withIncome = citizens.filter((c) => c.income.exists);
  const bpl = withIncome.filter((c) => c.income.annualIncome <= 100000);
  const rich = withIncome.filter((c) => c.income.annualIncome > 250000);
  const missing = citizens.filter((c) => !c.income.exists);
  const pick = (arr) => { const c = arr[Math.floor(Math.random() * arr.length)]; return { aadhaar: c.aadhaar, name: c.name }; };
  res.json({ clean: pick(bpl), variation: pick(rich), missingIncome: pick(missing) });
});

app.post("/api/sso/login", (req, res) => {
  const body = req.body || {};
  const aadhaar = String(body.aadhaar || "").trim();
  const name = String(body.name || "").trim();
  const role = String(body.role || "CITIZEN").toUpperCase();

  let user;
  if (role === "CITIZEN") {
    if (!/^\d{12}$/.test(aadhaar)) return res.status(400).json({ error: "AADHAAR_MUST_BE_12_DIGITS" });
    if (!citizens.find((c) => c.aadhaar === aadhaar)) return res.status(404).json({ error: "CITIZEN_NOT_FOUND", message: "This Aadhaar is not in the master citizen registry. Open the DigiLocker portal and copy an exact Aadhaar, or use a demo login button." });
    if (!name || name.length < 3) return res.status(400).json({ error: "NAME_REQUIRED" });
    user = { aadhaar, name, role };
  } else {
    const staff = STAFF.find((s) => s.staffId === String(body.staffId || "").trim() && s.password === String(body.password || ""));
    if (!staff) return res.status(403).json({ error: "INVALID_STAFF_CREDENTIALS" });
    if (staff.role !== role) return res.status(403).json({ error: "ROLE_MISMATCH" });
    user = { aadhaar: staff.staffId, name: staff.name, role: staff.role, department: staff.department };
  }

  addAudit("SSO_LOGIN", { user: user.aadhaar, role: user.role });
  res.json({ token: createToken(user), user });
});

app.get("/api/services", auth, (req, res) => res.json(services.map(({ eligibility, ...rest }) => rest)));

app.get("/api/proxy/digilocker/:aadhaar", auth, async (req, res) => {
  try {
    const c = connectors[0];
    const r = await fetchWithTimeout(`${c.url}${c.prefix}/api/records/${req.params.aadhaar}`, { headers: { Accept: "application/json" } }, c.timeoutMs, { from: "SETU", to: "DigiLocker", format: "JSON" });
    if (!r.ok) return res.status(r.status).json({ message: "No DigiLocker record found for this Aadhaar. Open the DigiLocker portal and copy an exact Aadhaar." });
    res.json(await r.json());
  } catch (e) { res.status(502).json({ message: "DigiLocker connector unreachable: " + e.message }); }
});

app.get("/api/proxy/income", auth, async (req, res) => {
  try {
    const c = connectors[1];
    const r = await fetchWithTimeout(`${c.url}${c.prefix}/api/certificates`, {}, c.timeoutMs, { from: "SETU", to: "Income Dept", format: "XML" });
    if (!r.ok) return res.status(r.status).json({ message: "Income Department list unavailable." });
    res.json(await r.json());
  } catch (e) { res.status(502).json({ message: "Income connector unreachable: " + e.message }); }
});

app.post("/api/applications", auth, allow("CITIZEN"), async (req, res) => {
  try {
    const { serviceCode, form, consent } = req.body;
    const service = services.find((s) => s.code === serviceCode);
    if (!service) return res.status(404).json({ error: "SERVICE_NOT_FOUND" });
    if (consent !== true) return res.status(400).json({ error: "CONSENT_REQUIRED" });

    const application = {
      id: `APP-${applicationCounter++}`,
      userAadhaar: req.user.aadhaar,
      userName: req.user.name,
      serviceCode: service.code,
      serviceName: service.name,
      form,
      status: "INITIATED",
      finalStatus: "PROCESSING",
      consent: { granted: true, at: nowIso(), purpose: `${service.name} processing`, sharedWith: ["DigiLocker", "Income Department"], scope: ["aadhaar", "name", "dob", "gender", "caste", "address", "income"] },
      match: null,
      eligibility: null,
      remarks: "",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.applications.unshift(application);
    addAudit("APPLICATION_CREATED", { applicationId: application.id, serviceCode });
    addEvent(application.id, "APPLICATION_CREATED", `Application submitted for ${service.name}`, { serviceCode });

    let digi;
    try {
      const c = connectors[0];
      const r = await fetchWithTimeout(`${c.url}${c.prefix}/api/records/${form.aadhaar}`, { headers: { Accept: "application/json" } }, c.timeoutMs, { from: "SETU", to: "DigiLocker", format: "JSON" });
      if (!r.ok) throw new Error("RECORD_NOT_FOUND");
      digi = (await r.json()).payload;
      addEvent(application.id, "INTEGRATION_SUCCESS", "Fetched identity record from DigiLocker (JSON)", {});
    } catch (e) {
      addException(application.id, "DIGILOCKER", "CONNECTOR_ERROR", e.message);
      application.status = "CONNECTOR_ERROR"; application.finalStatus = "FAILED";
      application.remarks = "DigiLocker record unavailable"; application.updatedAt = nowIso();
      addEvent(application.id, "INTEGRATION_FAILED", "Could not reach DigiLocker record", { error: e.message });
      addNotification(application.userAadhaar, "Application Failed", `${application.id}: DigiLocker record not found.`);
      return res.status(502).json({ application, message: "No matching record in DigiLocker for this Aadhaar number. Verify the number on the DigiLocker portal and re-apply." });
    }

    let income;
    try {
      const c = connectors[1];
      const r = await fetchWithTimeout(`${c.url}${c.prefix}/api/certificates/${form.aadhaar}`, { headers: { Accept: "application/xml" } }, c.timeoutMs, { from: "SETU", to: "Income Dept", format: "XML" });
      if (!r.ok) throw new Error("RECORD_NOT_FOUND");
      income = xmlLeafToJson(await r.text());
      addEvent(application.id, "INTEGRATION_SUCCESS", "Fetched income record from Income Department (XML) and normalised to standard format", {});
    } catch (e) {
      addException(application.id, "INCOME_DEPT", "CONNECTOR_ERROR", e.message);
      application.status = "CONNECTOR_ERROR"; application.finalStatus = "FAILED";
      application.remarks = "Income record unavailable"; application.updatedAt = nowIso();
      addEvent(application.id, "INTEGRATION_FAILED", "Could not reach Income Department record", { error: e.message });
      addNotification(application.userAadhaar, "Application Failed", `${application.id}: Income record not found.`);
      return res.status(502).json({ application, message: "No income certificate found for this Aadhaar in the Income Department records. This application has been logged as a connector exception." });
    }

    const match = computeMatch(form, digi, income);
    application.match = match;
    addEvent(application.id, "VERIFICATION_SCORED", `Data matching completed across 2 departments. Match score: ${match.score}%`, { breakdown: match.breakdown });

    if (match.score < 60) {
      application.status = "AUTO_REJECTED"; application.finalStatus = "REJECTED";
      application.remarks = `Verification failed: match score ${match.score}% (below 60%)`;
      application.updatedAt = nowIso();
      addException(application.id, "MATCH_SCORE", "VERIFICATION_FAILED", `Score ${match.score}%`);
      addEvent(application.id, "AUTO_REJECTED", application.remarks, {});
      addNotification(application.userAadhaar, "Application Rejected", `${application.id}: ${application.remarks}`);
      return res.json({ application });
    }

    if (match.score < 85) {
      application.status = "MANUAL_REVIEW"; application.finalStatus = "PENDING_REVIEW";
      application.remarks = `Partial match (${match.score}%). Sent for manual verification.`;
      application.updatedAt = nowIso();
      addException(application.id, "MATCH_SCORE", "PARTIAL_MATCH", `Score ${match.score}%`);
      addEvent(application.id, "MANUAL_REVIEW", application.remarks, {});
      addNotification(application.userAadhaar, "Manual Review", `${application.id}: under official verification.`);
      return res.json({ application });
    }

    const age = ageFromDob(digi.dob);
    const passed = service.eligibility(income, age, form, digi);
    application.eligibility = { passed, text: service.eligibilityText, age, annualIncome: Number(income.annualIncome), category: income.category };

    if (!passed) {
      application.status = "AUTO_REJECTED"; application.finalStatus = "REJECTED";
      application.remarks = `Verified (${match.score}%) but ineligible: ${service.eligibilityText}`;
      application.updatedAt = nowIso();
      addEvent(application.id, "AUTO_REJECTED", application.remarks, { eligibility: application.eligibility });
      addNotification(application.userAadhaar, "Application Rejected", `${application.id}: eligibility criteria not met.`);
      return res.json({ application });
    }

    application.status = "AUTO_APPROVED"; application.finalStatus = "APPROVED";
    application.remarks = `Verified with ${match.score}% match and eligibility confirmed`;
    application.updatedAt = nowIso();
    addEvent(application.id, "AUTO_APPROVED", application.remarks, { eligibility: application.eligibility });
    addNotification(application.userAadhaar, "Application Approved", `${application.id} has been approved.`);
    addAudit("APPLICATION_APPROVED", { applicationId: application.id });
    return res.json({ application });
  } catch (error) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: error.message });
  }
});

app.get("/api/applications", auth, (req, res) => {
  let list = state.applications;
  if (req.user.role === "CITIZEN") list = list.filter((a) => a.userAadhaar === req.user.aadhaar);
  res.json(list);
});

app.get("/api/applications/:id", auth, (req, res) => {
  const application = state.applications.find((a) => a.id === req.params.id);
  if (!application) return res.status(404).json({ error: "APPLICATION_NOT_FOUND" });
  if (req.user.role === "CITIZEN" && application.userAadhaar !== req.user.aadhaar) return res.status(403).json({ error: "FORBIDDEN" });
  res.json({
    application,
    timeline: state.events.filter((e) => e.applicationId === application.id).sort((a, b) => a.seq - b.seq),
    exceptions: state.exceptions.filter((e) => e.applicationId === application.id)
  });
});

app.post("/api/applications/:id/decision", auth, allow("OFFICIAL", "ADMIN"), (req, res) => {
  const application = state.applications.find((a) => a.id === req.params.id);
  if (!application) return res.status(404).json({ error: "APPLICATION_NOT_FOUND" });
  const action = String(req.body.action || "").toUpperCase();
  if (!["APPROVE", "REJECT"].includes(action)) return res.status(400).json({ error: "INVALID_ACTION" });
  if (["APPROVED", "REJECTED"].includes(application.finalStatus)) return res.status(400).json({ error: "APPLICATION_ALREADY_FINAL" });

  application.status = action === "APPROVE" ? "MANUALLY_APPROVED" : "MANUALLY_REJECTED";
  application.finalStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  application.remarks = `${action === "APPROVE" ? "Approved" : "Rejected"} by ${req.user.name} after manual review`;
  application.updatedAt = nowIso();
  addEvent(application.id, action === "APPROVE" ? "MANUAL_APPROVAL" : "MANUAL_REJECTION", application.remarks, {});
  addAudit("MANUAL_DECISION", { applicationId: application.id, action, by: req.user.name });
  addNotification(application.userAadhaar, action === "APPROVE" ? "Application Approved" : "Application Rejected", `${application.id}: decision recorded by official.`);
  res.json({ application });
});

app.get("/api/admin/monitoring", auth, allow("OFFICIAL", "ADMIN"), async (req, res) => {
  const connectorHealth = await Promise.all(connectors.map(async (c) => {
    try {
      const r = await fetchWithTimeout(`${c.url}${c.prefix}/health`, {}, 1000, { from: "SETU", to: c.name, format: c.format });
      const d = await r.json().catch(() => ({}));
      return { id: c.id, name: c.name, status: r.ok ? "UP" : "DOWN", format: c.format, records: d.records || "-" };
    } catch { return { id: c.id, name: c.name, status: "DOWN", format: c.format, records: "-" }; }
  }));
  const byStatus = state.applications.reduce((acc, a) => { acc[a.finalStatus] = (acc[a.finalStatus] || 0) + 1; return acc; }, {});
  const scored = state.applications.filter((a) => a.match);
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + a.match.score, 0) / scored.length) : 0;
  const decided = state.applications.filter((a) => a.finalStatus !== "PROCESSING");
  const avgProcessingSec = decided.length ? Math.round(decided.reduce((s, a) => s + (new Date(a.updatedAt) - new Date(a.createdAt)), 0) / decided.length / 1000) : 0;
  res.json({
    generatedAt: nowIso(),
    connectors: connectorHealth,
    metrics: { total: state.applications.length, byStatus, exceptions: state.exceptions.length, auditLogs: state.audit.length, avgScore, avgProcessingSec },
    recentApplications: state.applications.slice(0, 6),
    recentExceptions: state.exceptions.slice(0, 6),
    recentTraffic: state.traffic.slice(0, 8)
  });
});

app.get("/api/admin/audit", auth, allow("ADMIN"), (req, res) => res.json(state.audit.slice(0, 100)));

app.get("/api/notifications", auth, (req, res) => {
  if (req.user.role === "CITIZEN") return res.json(state.notifications.filter((n) => n.userAadhaar === req.user.aadhaar));
  res.json(state.notifications);
});

app.get("/api/events", (req, res) => {
  const user = decodeToken(req.query.token || "");
  if (!user) return res.status(401).end();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  sseClients.push(res);
  req.on("close", () => { const i = sseClients.indexOf(res); if (i >= 0) sseClients.splice(i, 1); });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`[Main Interoperability Platform] running on http://localhost:${PORT}`));
}
module.exports = app;