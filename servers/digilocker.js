const express = require("express");
const cors = require("cors");
const { citizens } = require("./data");

const app = express();
app.use(cors());
app.use(express.json());

const PAGE = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>DigiLocker (Mock)</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;margin:0;background:#eef3fa;color:#12305e}
header{background:linear-gradient(90deg,#0b3d91,#1565d8);color:#fff;padding:18px 32px;display:flex;justify-content:space-between;align-items:center}
header h1{margin:0;font-size:22px} header p{margin:2px 0 0;font-size:12px;color:#cfe0ff}
.badge{background:#ffffff22;border:1px solid #ffffff55;padding:6px 12px;border-radius:999px;font-size:12px}
.wrap{max-width:1100px;margin:24px auto;padding:0 20px}
.bar{background:#fff;border:1px solid #d5e2f5;border-radius:10px;padding:14px 16px;display:flex;gap:12px;align-items:center;margin-bottom:16px}
.bar input{flex:1;padding:10px 12px;border:1px solid #c8d4e8;border-radius:8px;font-size:14px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d5e2f5;border-radius:10px;overflow:hidden}
th{background:#0b3d91;color:#fff;text-align:left;padding:10px 12px;font-size:13px}
td{padding:9px 12px;border-top:1px solid #e4ecf8;font-size:13px}
tr.row{cursor:pointer} tr.row:hover{background:#f2f7ff}
.detail{background:#fff;border:1px solid #d5e2f5;border-radius:10px;padding:18px;margin-top:16px}
.chip{display:inline-block;background:#e8f0fe;color:#0b3d91;border-radius:6px;padding:4px 10px;margin:0 6px 6px 0;font-size:12px;font-weight:600}
.sim{background:#fff3cd;border:1px solid #ffe69c;color:#7a5b00;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 24px;font-size:14px}
.muted{color:#68789a;font-size:12px}
@media(max-width:700px){header{flex-direction:column;align-items:flex-start;gap:8px;padding:14px 16px}.wrap{margin:14px auto;padding:0 12px}.bar{flex-direction:column;align-items:stretch}table{display:block;overflow-x:auto;white-space:nowrap}.grid{grid-template-columns:1fr}}
</style></head><body>
<header>
  <div><h1>🗂️ DigiLocker <span style="font-size:12px;font-weight:400">(Mock Simulation)</span></h1>
  <p>National Document Repository · Government of India · Legacy Silo #1</p></div>
  <span class="badge">Data Format: JSON</span>
</header>
<div class="wrap">
  <div class="sim">⚠️ SIMULATION ONLY — This is a mock legacy system for the setu Interoperability prototype. Not connected to real DigiLocker.</div>
  <div class="bar"><strong>Search Citizen:</strong><input id="q" placeholder="Search by name or Aadhaar..." oninput="draw()"><span class="muted" id="count"></span></div>
  <table><thead><tr><th>Aadhaar</th><th>Name</th><th>DOB</th><th>Gender</th><th>Caste</th><th>Address</th></tr></thead><tbody id="tb"></tbody></table>
  <div id="detail"></div>
</div>
<script>
var records = [];
fetch("api/records").then(function(r){return r.json();}).then(function(d){ records = d; draw(); });
function draw(){
  var q = document.getElementById("q").value.toLowerCase();
  var list = records.filter(function(r){ return r.name.toLowerCase().indexOf(q) >= 0 || r.aadhaar.indexOf(q) >= 0; });
  document.getElementById("count").textContent = list.length + " records";
  document.getElementById("tb").innerHTML = list.map(function(r){
    return "<tr class='row' onclick=\\"show('" + r.aadhaar + "')\\"><td>" + r.aadhaar + "</td><td>" + r.name + "</td><td>" + r.dob + "</td><td>" + r.gender + "</td><td>" + r.caste + "</td><td>" + r.address + "</td></tr>";
  }).join("");
}
function show(a){
  var r = records.find(function(x){ return x.aadhaar === a; });
  document.getElementById("detail").innerHTML = "<div class='detail'><h3 style='margin:0 0 10px'>" + r.name + "</h3><div class='grid'><div><b>Aadhaar:</b> " + r.aadhaar + "</div><div><b>DOB:</b> " + r.dob + "</div><div><b>Gender:</b> " + r.gender + "</div><div><b>Caste:</b> " + r.caste + "</div><div><b>Address:</b> " + r.address + "</div></div><div style='margin-top:12px'><b>Stored Documents:</b><br><span style='display:inline-block;margin-top:6px'>" + r.documents.map(function(d){return "<span class='chip'>📄 " + d + "</span>";}).join("") + "</span></div></div>";
}
</script>
</body></html>`;

app.get("/", (req, res) => res.send(PAGE));

app.get("/health", (req, res) => {
  res.json({ service: "Mock DigiLocker", status: "UP", format: "JSON", records: citizens.length });
});

app.get("/api/records", (req, res) => res.json(citizens.map((c) => c.digilocker)));

app.get("/api/records/:aadhaar", (req, res) => {
  const citizen = citizens.find((c) => c.aadhaar === req.params.aadhaar);
  if (!citizen) return res.status(404).json({ error: "RECORD_NOT_FOUND", service: "Mock DigiLocker" });
  setTimeout(() => res.json({ sourceSystem: "DIGILOCKER", format: "JSON", payload: citizen.digilocker }), 300);
});

if (require.main === module) app.listen(5001, () => console.log("[Mock DigiLocker] running on http://localhost:5001"));
module.exports = app;