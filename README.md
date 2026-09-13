# 🏛️ SETU Interoperability Hub

> **One Nation. One Portal. Every Service.**
> A consent-based interoperability middleware that connects fragmented government systems — citizens submit data **once**, and departments verify it **automatically**.
>
> *Prototype built for the Smart India Hackathon 2026.*

![Node](https://img.shields.io/badge/Node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Backend-Express-black)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%2B%20CSS-yellow)
![Status](https://img.shields.io/badge/Status-Prototype-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**🌐 Live Demo:** <https://setu-hub.onrender.com>
**📱 Mobile-ready:** fully responsive; open the live URL on any phone.

---

## 📌 Problem Statement

Government departments operate multiple portals, registries and databases developed independently. Differences in **data formats, identifiers, authentication, APIs and ownership** prevent seamless information exchange. Citizens re-submit the same documents repeatedly and track applications across portals; officials lack a consolidated view of beneficiaries, approvals and grievances.

**The challenge:** enable secure, standards-based interoperability **without replacing existing systems**.

---

## 💡 Our Solution

**SETU** sits *above* legacy silos as a federated service-delivery layer:

- 🔗 **Reusable connectors** to legacy & modern systems (JSON **and** XML)
- 🎯 **Field-level Match Engine** scoring inter-department data consistency (0–100%)
- ⚖️ **Configurable eligibility workflows** for 10 government schemes
- 🔐 **Consent-based sharing**, role-based access (RBAC), consent receipts & full **audit trail**
- 🔔 **Event-driven (live) notifications** via Server-Sent Events
- 📊 **Monitoring dashboards**: connector health, live traffic log, avg match score, avg processing time, exception registry
- 🧾 **Unified tracking** with per-application event timeline + printable **digital certificate** on approval

Legacy systems are **never replaced** — they are simply connected.

---

## 🏗️ Architecture

```
 ┌───────────────────────────┐
 │ Citizen / Official / Admin│   Web UI (responsive)
 └────────────┬──────────────┘
              │
 ┌────────────▼───────────────────────────────────────────┐
 │             SETU INTEROPERABILITY PLATFORM         │
 │  Orchestrator · Match Engine · Eligibility Rules        │
 │  RBAC · Consent Receipts · Audit · Exceptions · SSE     │
 │  Connector Health + Live Traffic Monitor                │
 └──────┬──────────────────────────────────┬──────────────┘
        │ JSON                             │ XML → normalised
 ┌──────▼───────────────┐        ┌─────────▼────────────────┐
 │ Mock DigiLocker      │        │ Mock Income Department   │
 │ :5001 · 50 records   │        │ :5002 · 50 records       │
 │ (Legacy Silo #1)     │        │ (Legacy Silo #2, "2009") │
 └──────────────────────┘        └──────────────────────────┘
```

**Two run modes:**
- **Development:** three independent processes (`npm start`) on ports 5000/5001/5002.
- **Production / demo:** single process (`node allinone.js`) on one port — portals served at `/digilocker` and `/income` (used for Render deployment).

---

## ✅ Features ↔ Problem Statement Mapping

| Requirement | Implemented |
|---|---|
| API-based exchange | REST APIs between 3 independent systems |
| Common data standards | Legacy XML normalised into standard JSON payload |
| Consent-based sharing | Mandatory consent + stored **consent receipt** (purpose, recipients, fields, timestamp) |
| SSO / federated identity | Mock SSO endpoint with staff credentials + RBAC (Citizen/Official/Admin) |
| Unified application tracking | Citizen timeline with inter-department events |
| Configurable workflows | Per-scheme eligibility rules + auto-approve / review / reject routing |
| Reusable connectors | Connector registry with JSON & XML adapters, timeouts, health checks |
| Audit logs | Admin-only audit trail (logins, applications, decisions) |
| Data-quality checks | Aadhaar format, fuzzy name/address, cross-department name & caste checks |
| Exception handling | Connector errors, partial matches & missing records raised as exceptions |
| Monitoring dashboards | Totals, avg match score, avg processing time, connector health, live traffic |
| Event-driven notifications | Live SSE push + toast popups on every state change |

---

## 🎯 The Match Engine (core innovation)

| Field | Source | Weight |
|---|---|---|
| Aadhaar Number | DigiLocker | 30 |
| Full Name (fuzzy, Levenshtein) | DigiLocker | 20 |
| Date of Birth | DigiLocker | 15 |
| Address (token Jaccard) | DigiLocker | 15 |
| Gender | DigiLocker | 5 |
| Name cross-check (fuzzy) | Income Dept | 10 |
| Declared Income (±10%) | Income Dept | 5 |

**Decision workflow:**

| Match Score | Outcome |
|---|---|
| **≥ 85%** | Auto-verified → scheme eligibility rules → Approve / Reject |
| **60 – 84%** | Official manual review (human-in-the-loop, with field-level evidence) |
| **< 60%** | Auto-rejected (verification failed) |
| Connector failure / missing record | Graceful failure + exception logged + citizen notified |

---

## 🧾 Services & Eligibility Rules (10 live schemes)

| Service | Department | Eligibility |
|---|---|---|
| 🍚 Ration Card | Food & Civil Supplies | Income ≤ ₹1,00,000 (BPL) |
| 🎓 Post-Matric Scholarship | Education | Age 15–25 and income ≤ ₹2,50,000 |
| 🏠 PM Awas Yojana | Housing | BPL or income ≤ ₹1,20,000 |
| 👵 Old Age Pension | Social Welfare | Age ≥ 60 and income ≤ ₹1,00,000 |
| 📜 Income Certificate | Revenue | Identity verification only |
| 🪪 Caste Certificate (SC/OBC/ST) | Revenue | Reserved category **and** claimed caste matches DigiLocker civil record |
| 📍 Domicile Certificate | Revenue | Identity + address verification |
| 🏥 Ayushman Bharat (PM-JAY) | Health | BPL category |
| 🔥 PM Ujjwala Yojana | Petroleum & Gas | Female, age ≥ 18, BPL |
| 🛠️ e-Shram Labour Card | Labour | Age 18–59 and income ≤ ₹2,40,000 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS + modern responsive CSS (zero build step), SSE live notifications |
| Backend | Node.js ≥ 18 + Express (3 services + all-in-one production mode) |
| Legacy simulators | 2 independent Express portals (JSON & XML, 50 searchable records each) |
| Matching | Levenshtein similarity + Jaccard token overlap, weighted scoring |
| Data | In-memory master registry (50 citizens); PostgreSQL planned Phase 2 |
| Hosting | GitHub + Render (free tier); UptimeRobot keep-awake |

---

## 📁 Project Structure

```
sih-interop-prototype/
├── allinone.js          # Production entry: all 3 systems on one port
├── package.json
├── .gitignore
├── README.md
├── main/
│   ├── server.js        # Interoperability platform (:5000)
│   └── public/
│       ├── index.html   # Shell UI (hero login, tricolor theme)
│       ├── styles.css   # Design system + mobile responsiveness
│       └── app.js       # Citizen / Official / Admin front-end
└── servers/
    ├── data.js          # 50-citizen master dataset (realistic variations)
    ├── digilocker.js    # Legacy Silo #1 — JSON portal (:5001)
    └── income.js        # Legacy Silo #2 — XML portal (:5002)
```

---

## 🚀 Quick Start

**Prerequisites:** Node.js **18+** (`node -v`).

```bash
npm install

# Development mode — three independent systems
npm start
```

| System | URL |
|---|---|
| SETU Hub | http://localhost:5000 |
| Mock DigiLocker | http://localhost:5001 |
| Mock Income Dept | http://localhost:5002 |

Individual servers: `npm run digilocker`, `npm run income`, `npm run main`.

**Production / single-port mode (same as hosted demo):**

```bash
node allinone.js
# Hub: http://localhost:5000 · Portals: /digilocker · /income
```

---

## ☁️ Deployment (Render)

1. Push repo to GitHub.
2. Render → **New → Web Service** → select repo.
3. Build Command: `npm install` · Start Command: `node allinone.js` · Plan: **Free**.
4. Optional: Health Check Path `/health`; add an UptimeRobot ping (every 5 min) to prevent free-tier sleep.
5. Live URL serves hub + `/digilocker` + `/income`; auto-redeploys on every push.

---

## 🔑 Demo Credentials

| Role | Credentials |
|---|---|
| Official | `OFF-101` / `officer@123` (Officer Piyush) · `OFF-102` / `officer@123` (Officer Ayush) |
| Admin | `ADM-001` / `admin@123` (Admin Piyush) |
| Citizen | Any of the 50 registry citizens via the demo buttons |

**Citizen demo buttons (login page):**

| Button | What it does |
|---|---|
| 🎲 Citizen - Random Record | Logs in as a random citizen with a complete record — the Match Engine + scheme rules decide the outcome live |
| ⚠️ Citizen - No Income Record | Logs in as the one citizen missing from the Income Department → demonstrates graceful connector-exception handling |

**Guaranteed-outcome cheat-sheet (works with any random citizen):**

| Want to show | Apply to | Why it's guaranteed |
|---|---|---|
| ✅ APPROVED + digital certificate | Domicile Certificate or Income Certificate | Eligibility = identity verification only |
| ❌ REJECTED despite 100% match | Caste Certificate (if caste shows GENERAL) or Post-Matric Scholarship (if age > 25) | Scheme rulebook blocks it — verification ≠ eligibility |
| 🟡 Partial match → manual review | Any scheme, using "Auto-fill with mismatches" | Score drops into the 60–84 review band |
| 💥 Connector exception | Any scheme, via the ⚠️ No Income Record login | Income Dept has no record for that Aadhaar |

## 🎬 5-Minute Demo Walkthrough

1. **Citizen:** 🎲 Random Record login → apply for **Domicile Certificate** → consent → auto-fill exact → **APPROVED (100%)** with field-by-field breakdown, consent receipt & digital certificate.
2. Same citizen → **Caste Certificate** (if GENERAL) or **Post-Matric Scholarship** (if age > 25) → 100% identity match but **REJECTED by eligibility rules** — verification ≠ eligibility.
3. Same citizen → **Auto-fill with mismatches** on any scheme → score drops to 60–84% → **PENDING_REVIEW**.
4. **Official login** (`OFF-101`) → review queue → inspect field-level evidence → **Approve** → citizen sees a **live toast notification** instantly.
5. **⚠️ No Income Record** citizen applies → Income Dept returns nothing → **graceful connector exception** logged and citizen notified.
6. **Admin login** (`ADM-001`) → Monitoring: totals, avg match score, avg processing time, connector health, **live connector traffic**, exceptions → **Audit Logs**.

## 🔌 Core API Reference

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/sso/login` | Public | Mock federated login (citizen / staff) |
| GET | `/api/services` | Auth | Scheme catalogue |
| POST | `/api/applications` | Citizen | Submit application (triggers interoperability flow) |
| GET | `/api/applications` / `/:id` | Auth | List / timeline + match breakdown |
| POST | `/api/applications/:id/decision` | Official/Admin | Manual approve / reject |
| GET | `/api/proxy/digilocker/:aadhaar` | Auth | Proxied DigiLocker fetch |
| GET | `/api/proxy/income` | Auth | Proxied Income Dept list |
| GET | `/api/events?token=` | Auth | SSE live notification stream |
| GET | `/api/admin/monitoring` | Official/Admin | Metrics, connector health, traffic |
| GET | `/api/admin/audit` | Admin | Audit trail |
| GET | `/api/records/:aadhaar` | — | Mock DigiLocker (:5001 or `/digilocker`) |
| GET | `/api/certificates/:aadhaar` | — | Mock Income Dept XML (:5002 or `/income`) |

---

## 🧪 Dataset Realism (50 citizens)

- Ages ~20–76 (no minors holding income certificates).
- Income spread: ~50% BPL (₹48k–₹96k), ~30% middle, ~20% high — every scheme cutoff has citizens on both sides.
- **Surname-consistent caste categories** (GENERAL/OBC/SC/ST) for visual realism.
- Real-world messiness: spelling variants (`Aarav` vs `Arav`), initials (`S. Joshi`), abbreviated addresses (`Rd`/`St`), and one citizen with **no income record** (exception path).

> *Note: surname–category pairing is a demo-data simplification. In production, caste is read only from the issued DigiLocker certificate — never inferred from names.*

---

## 🗺️ Roadmap — Phase 2 (External Round)

- [ ] PostgreSQL persistence + master-data management
- [ ] Real federated identity (OpenID Connect / SSO)
- [ ] API Gateway + schema registry + rate limiting
- [ ] Message queue (Redis/RabbitMQ) for event-driven workflows
- [ ] `fast-xml-parser` transformation engine (XSLT-style mappings)
- [ ] Additional silos: Land Records, Civil Registry (marital status), Caste Registry
- [ ] Docker Compose + CI/CD with dependency scanning

---

## ⚠️ Known Limitations (by design, prototype round)

- In-memory storage (resets on restart) — chosen for zero-setup demos.
- Base64 session tokens instead of JWT — OIDC planned Phase 2.
- Legacy systems simulated locally to prove the integration pattern.
- Advisory notices in transitive dev dependencies; Phase 2 pins patched versions behind CI scanning.

---

## 👥 Team & License

Built by **Team AIGNITE** for the Smart India Hackathon 2026.

> **Disclaimer:** All systems, citizens and records in this repository are **simulated**. This project is not connected to any real government infrastructure.
