const express = require("express");
const cors = require("cors");
const { citizens } = require("./data");

const app = express();
app.use(cors());
app.use(express.json());

const PAGE = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Income Department (Mock)</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;margin:0;background:#f4efe3;color:#3d2020}
header{background:#7a1f1f;color:#fff;padding:16px 32px;border-bottom:4px double #d9b96a}
header h1{margin:0;font-size:21px} header p{margin:2px 0 0;font-size:12px;color:#e8cfcf}
.wrap{max-width:1100px;margin:22px auto;padding:0 20px}
.sim{background:#f8e7e7;border:1px solid #d9a1a1;padding:10px 14px;font-size:13px;margin-bottom:14px}
.bar{background:#fffdf6;border:1px solid #d8c9a8;padding:12px 14px;display:flex;gap:12px;align-items:center;margin-bottom:14px}
.bar input{flex:1;padding:9px 12px;border:1px solid #c9b78d;border-radius:4px;font-size:14px;font-family:inherit}
table{width:100%;border-collapse:collapse;background:#fffdf6;border:2px solid #7a1f1f}
th{background:#7a1f1f;color:#fff;text-align:left;padding:9px 12px;font-size:13px}
td{padding:8px 12px;border-top:1px solid #e2d6ba;font-size:13px}
tr.row{cursor:pointer} tr.row:hover{background:#f7efdb}
.bpl{color:#0a6b2d;font-weight:bold} .apl{color:#8a4b00;font-weight:bold}
.detail{background:#fffdf6;border:1px solid #d8c9a8;padding:16px;margin-top:14px}
.muted{color:#8a7a5c;font-size:12px}
@media(max-width:700px){header{padding:14px 16px}.wrap{margin:14px auto;padding:0 12px}.bar{flex-direction:column;align-items:stretch}table{display:block;overflow-x:auto;white-space:nowrap}.detail p{font-size:13px}}
</style></head><body>
<header>
  <h1>🏛️ Department of Income Verification — State Records Portal (Mock)</h1>
  <p>Revenue &amp; Welfare Records Division · Legacy Silo #2 · System last upgraded: 2009</p>
</header>
<div class="wrap">
  <div class="sim">⚠️ SIMULATION ONLY — Mock legacy system for the setu Interoperability prototype. Records served in legacy XML format.</div>
  <div class="bar"><strong>Certificate Search:</strong><input id="q" placeholder="Search by name or Aadhaar..." oninput="draw()"><span class="muted" id="count"></span></div>
  <table><thead><tr><th>Certificate No</th><th>Name</th><th>Aadhaar</th><th>Annual Income</th><th>Category</th><th>Issued On</th></tr></thead><tbody id="tb"></tbody></table>
  <div id="detail"></div>
</div>
<script>
var records = [];
fetch("api/certificates").then(function(r){return r.json();}).then(function(d){ records = d; draw(); });
function draw(){
  var q = document.getElementById("q").value.toLowerCase();
  var list = records.filter(function(r){ return r.name.toLowerCase().indexOf(q) >= 0 || r.aadhaar.indexOf(q) >= 0; });
  document.getElementById("count").textContent = list.length + " certificates";
  document.getElementById("tb").innerHTML = list.map(function(r){
    return "<tr class='row' onclick=\\"show('" + r.aadhaar + "')\\"><td>" + r.certificateNo + "</td><td>" + r.name + "</td><td>" + r.aadhaar + "</td><td>Rs " + r.annualIncome.toLocaleString("en-IN") + "</td><td class='" + (r.category === "BPL" ? "bpl" : "apl") + "'>" + r.category + "</td><td>" + r.issueDate + "</td></tr>";
  }).join("");
}
function show(a){
  var r = records.find(function(x){ return x.aadhaar === a; });
  document.getElementById("detail").innerHTML = "<div class='detail'><h3 style='margin:0 0 8px'>Certificate " + r.certificateNo + "</h3><p><b>Holder (as per legacy records):</b> " + r.name + "</p><p><b>Aadhaar:</b> " + r.aadhaar + "</p><p><b>Annual Income:</b> Rs " + r.annualIncome.toLocaleString("en-IN") + " (" + r.category + ")</p><p><b>Issue Date:</b> " + r.issueDate + "</p><p class='muted'>Exposed to authorised systems only in XML format via /api/certificates/{aadhaar}</p></div>";
}
</script>
</body></html>`;

app.get("/", (req, res) => res.send(PAGE));

app.get("/health", (req, res) => {
  res.json({ service: "Mock Income Department", status: "UP", format: "XML", records: citizens.length });
});

app.get("/api/certificates", (req, res) => res.json(citizens.filter((c) => c.income.exists).map((c) => c.income)));

app.get("/api/certificates/:aadhaar", (req, res) => {
  const citizen = citizens.find((c) => c.aadhaar === req.params.aadhaar);
  if (!citizen || !citizen.income.exists) {
    return res.status(404).type("application/xml").send(`<?xml version="1.0"?><error><code>RECORD_NOT_FOUND</code></error>`);
  }
  const r = citizen.income;
  const xml = `<?xml version="1.0"?>
<incomeRecord>
  <aadhaar>${r.aadhaar}</aadhaar>
  <name>${r.name}</name>
  <annualIncome>${r.annualIncome}</annualIncome>
  <category>${r.category}</category>
  <certificateNo>${r.certificateNo}</certificateNo>
  <issueDate>${r.issueDate}</issueDate>
</incomeRecord>`;
  setTimeout(() => res.type("application/xml").send(xml), 400);
});

if (require.main === module) app.listen(5002, () => console.log("[Mock Income Department] running on http://localhost:5002"));
module.exports = app;