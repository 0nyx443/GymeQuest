# GymeQuest – Threat Modeling Project Execution Guide

> This guide tells you **exactly what to write in each section** of your documentation, using GymeQuest as the subject system.

---

## First — Understand Your System in One Paragraph

**GymeQuest** is a gamified fitness Android application built with **React Native (Expo)**. It uses the device camera to track workout form via **MediaPipe Pose (WASM)**, validates exercise repetitions in real-time, and rewards users with RPG-style XP, stat boosts, and lore unlocks. User data (profiles, guilds, stats, matches) is persisted in **Supabase** — a cloud-hosted PostgreSQL database with a REST/Realtime API. Authentication is handled via **Supabase Auth** (email + password). The app communicates with the Supabase cloud backend over HTTPS.

---

## Section 1 – Title Page

Fill in with your group's actual info:

| Field | Value |
|---|---|
| **Project Title** | Threat Modeling & Cloud Security Analysis of GymeQuest |
| **System Modeled** | GymeQuest – Gamified Fitness Android Application |
| **Course & Section** | *(your course name and section)* |
| **Instructor** | *(instructor's name)* |
| **Date** | April 2026 |
| **Group Members** | *(list all names)* |

---

## Section 2 – Introduction

Write these four paragraphs (1–2 sentences each):

1. **System Description**
   > GymeQuest is a gamified fitness Android app that uses MediaPipe Pose estimation via an on-device WebView/WASM pipeline to detect and validate exercise repetitions through the device camera. It rewards users with RPG progression (XP, stat boosts, enemy lore) and supports social features such as guilds and leaderboards, backed by a Supabase cloud database.

2. **Objective**
   > The objective of this project is to systematically identify, analyze, and assess potential security threats and vulnerabilities in the GymeQuest mobile application and its cloud infrastructure using the STRIDE threat modeling framework and DREAD risk scoring model.

3. **Importance of Threat Modeling**
   > Threat modeling enables development teams to proactively discover design-level security weaknesses before deployment, reducing the cost and impact of security incidents. For a mobile fitness application handling personal health behavior data, this is especially critical.

4. **Cloud Security Relevance**
   > GymeQuest relies on **Supabase** (hosted on AWS) for cloud database storage, user authentication, and real-time guild operations. API endpoints are publicly accessible over the internet, making cloud-side misconfigurations, credential leakage, and insecure API access real attack surfaces.

---

## Section 3 – System Overview

### Description
GymeQuest is an Android-exclusive mobile application built with:
- **Frontend:** React Native (Expo), running on Android
- **On-device AI:** MediaPipe Pose WASM model inside a hidden WebView — detects 33 body landmarks
- **State Management:** Zustand (in-memory, resets on restart)
- **Cloud Backend:** Supabase (PostgreSQL, Auth, Realtime, REST API)
- **CDN:** MediaPipe CDN (loads the 5MB `.task` model on first launch)

### Key Features & Data Handled
| Feature | Data Type |
|---|---|
| User registration & login | Email, hashed password |
| Player profile | Username, level, XP, stats (STR/AGI/STA) |
| Guild system | Guild name, member IDs, raid results |
| Match history | Rep counts, battle outcomes, enemy defeated |
| Camera feed | Real-time video frames (processed on-device, not transmitted) |

### System Architecture (describe this in your doc)
```
[Android App (React Native)]
       |
       |── Camera → MediaPipe WebView (WASM) → usePoseEngine → Zustand
       |
       └── Supabase REST/Realtime API (HTTPS)
                  |
           [Supabase Cloud — AWS]
                  ├── PostgreSQL DB (User profiles, guilds, matches)
                  ├── Supabase Auth (JWT tokens)
                  └── Supabase Realtime (guild/leaderboard live updates)
```

### Users and Roles
| Role | Description |
|---|---|
| **Player** | Registers, logs in, performs exercises, joins guilds |
| **Guild Leader** | Creates/manages guild and raid sessions |
| **Admin** | Manages Supabase backend (database, IAM, configs) |
| **MediaPipe CDN** | External third-party serving the AI model |

---

## Section 4 – Methodology

### STRIDE
Use this table to explain STRIDE in your doc:

| Category | Description | GymeQuest Relevance |
|---|---|---|
| **Spoofing** | Acting as another entity | Fake login as another user via stolen JWT |
| **Tampering** | Modifying data | Altering XP/level values in Supabase DB |
| **Repudiation** | Denying actions | Player denies submitting fake rep count |
| **Information Disclosure** | Leaking data | Supabase API key exposed in `.env` file |
| **Denial of Service** | Crashing the system | Flooding Supabase API or MediaPipe CDN |
| **Elevation of Privilege** | Gaining unauthorized access | Player accessing admin-level Supabase operations |

### DREAD
| Category | Description |
|---|---|
| **D** – Damage | How severe is the damage if exploited? |
| **R** – Reproducibility | How easily can the attack be repeated? |
| **E** – Exploitability | How much skill/effort is required? |
| **A** – Affected Users | How many users are impacted? |
| **D** – Discoverability | How easy is the vulnerability to find? |
Scores range from **1 (low)** to **10 (critical)**. Average = (D+R+E+A+D) / 5.

### Tools Used
- **Diagramming:** Draw.io (https://draw.io) — free, used to create DFD
- **Risk Scoring:** Google Sheets or Excel — for STRIDE/DREAD tables
- **Cloud Security:** Supabase Dashboard (Row Level Security, Auth policies), Supabase Logs

---

## Section 5 – Data Flow Diagram (DFD)

### Components to draw in Draw.io:

| Symbol | Component |
|---|---|
| Rectangle | Android App (User's Phone) |
| Circle/Oval | MediaPipe WebView (on-device) |
| Cylinder | Supabase PostgreSQL (Cloud DB) |
| Rectangle | Supabase Auth Service (Cloud) |
| Rectangle | Supabase Realtime (Cloud) |
| Cloud shape | MediaPipe CDN (External) |
| Parallelogram | Player (External Entity) |

### Key Data Flows to draw as arrows:
1. Player → App: Email/Password (Login)
2. App → Supabase Auth: Credentials (JWT returned)
3. App Camera → MediaPipe WebView: Base64 JPEG frames @ 20fps
4. MediaPipe WebView → Zustand Store: Landmark data (local only)
5. App → Supabase DB: Write profile, match result, guild actions (HTTPS REST)
6. App → Supabase Realtime: Subscribe to guild/leaderboard updates
7. App → MediaPipe CDN: Fetch `.task` model file on first launch

### Entry Points (highlight with red ⚠️ in your diagram):
- Login/Registration form (Supabase Auth)
- Supabase REST API endpoint (anon key in app)
- MediaPipe CDN fetch (external, no auth)
- Supabase Realtime WebSocket connection

---

## Section 6 – STRIDE Analysis Table

Copy this into your document:

| Element | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| **Login / Registration** | ✔ | | | ✔ | | ✔ |
| **JWT Auth Token** | ✔ | ✔ | ✔ | ✔ | | ✔ |
| **Supabase REST API** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| **Supabase DB (PostgreSQL)** | | ✔ | | ✔ | ✔ | |
| **Player Profile (XP/Stats)** | | ✔ | ✔ | ✔ | | |
| **Guild System** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| **Camera / Pose Engine** | | ✔ | ✔ | | ✔ | |
| **MediaPipe CDN** | ✔ | ✔ | | | ✔ | |
| **Android App (.env Key)** | | | | ✔ | | ✔ |
| **Supabase Realtime WS** | | ✔ | | ✔ | ✔ | |

**Legend:** S=Spoofing, T=Tampering, R=Repudiation, I=Info Disclosure, D=Denial of Service, E=Elevation of Privilege

---

## Section 7 – DREAD Risk Assessment Table

| # | Threat | D | R | E | A | D | **Avg** |
|---|---|---|---|---|---|---|---|
| 1 | **Supabase anon key exposed in app bundle** | 8 | 9 | 7 | 10 | 9 | **8.6** |
| 2 | **SQL Injection via unvalidated API input** | 9 | 7 | 6 | 9 | 7 | **7.6** |
| 3 | **JWT token theft (session hijacking)** | 9 | 6 | 6 | 8 | 7 | **7.2** |
| 4 | **Supabase Row-Level Security misconfiguration** | 8 | 8 | 5 | 10 | 6 | **7.4** |
| 5 | **XP/Stats tampering (direct DB write)** | 7 | 8 | 6 | 7 | 8 | **7.2** |
| 6 | **Fake rep submission (pose bypass)** | 6 | 7 | 5 | 8 | 7 | **6.6** |
| 7 | **Repudiation of match outcome** | 5 | 7 | 4 | 7 | 6 | **5.8** |
| 8 | **MediaPipe CDN compromise (supply chain)** | 8 | 3 | 4 | 10 | 4 | **5.8** |
| 9 | **DoS attack on Supabase API endpoint** | 7 | 8 | 7 | 10 | 7 | **7.8** |
| 10 | **Weak password / no MFA on accounts** | 7 | 7 | 8 | 9 | 8 | **7.8** |
| 11 | **Misconfigured Supabase IAM/Admin roles** | 8 | 6 | 5 | 10 | 6 | **7.0** |
| 12 | **Insecure Supabase Realtime subscription** | 6 | 7 | 6 | 8 | 7 | **6.8** |
| 13 | **Camera permission abuse** | 6 | 4 | 5 | 7 | 6 | **5.6** |
| 14 | **Guild data leakage (missing RLS policy)** | 7 | 7 | 6 | 8 | 7 | **7.0** |

> **High Risk (≥7.5):** #1, #9, #10 — address first  
> **Medium Risk (5.5–7.4):** #2–#8, #11–#14

---

## Section 8 – Mitigation Strategies

Present in priority order (highest DREAD score first):

### 🔴 Critical (Avg ≥ 7.5)

**Threat #1 – Supabase anon key exposed in app**
- ✅ The anon key is designed to be public, BUT all access must be restricted by **Row-Level Security (RLS)** policies in Supabase
- Enforce RLS on all tables: `profiles`, `guilds`, `matches`, `guild_members`
- Never store the `service_role` key in the app — only use `anon` key

**Threat #9 – DoS on Supabase API**
- ✅ Enable Supabase rate limiting (available in Pro tier)
- Implement client-side request throttling in the app
- Use Supabase's built-in connection pooler (PgBouncer)

**Threat #10 – Weak passwords / no MFA**
- ✅ Enforce minimum password length (8+ chars, mixed case) via Supabase Auth settings
- Enable email verification on signup
- Add optional TOTP-based MFA using Supabase's built-in MFA support

### 🟡 High (Avg 7.0–7.4)

**Threat #2 – SQL Injection**
- ✅ Supabase uses parameterized queries by default via PostgREST — lower risk
- Validate all user inputs on the client before sending to API
- Use Supabase's typed client SDK (`supabase-js`) to avoid raw SQL

**Threat #3 – JWT Token Theft**
- ✅ Use short-lived JWTs (Supabase default: 1 hour)
- Store tokens in SecureStore (`expo-secure-store`), NOT AsyncStorage
- Implement refresh token rotation

**Threat #4 – RLS Misconfiguration**
- ✅ Audit all Supabase tables using Supabase Dashboard → Auth → Policies
- Test RLS with different user roles using the Supabase SQL editor
- Document every table's access policy

**Threat #5 – XP/Stats Tampering**
- ✅ Never trust client-sent XP values — validate battle results server-side
- Use Supabase Edge Functions to calculate and write XP on the backend
- Apply RLS: users can only UPDATE their own profile row

**Threat #11 – Misconfigured IAM / Admin Roles**
- ✅ Apply Principle of Least Privilege: only project admin has `service_role`
- Rotate Supabase project keys regularly
- Enable Supabase Audit Logs (Pro tier)

### 🟢 Moderate (Avg < 7.0)

**Threat #8 – MediaPipe CDN compromise**
- Bundle `pose_landmarker_lite.task` locally as an app asset instead of fetching from CDN
- Verify model file integrity with a checksum on load

**Threat #13 – Camera Permission Abuse**
- All camera processing happens on-device — no video is transmitted (✅ already secure)
- Document this in the privacy policy

---

## Section 9 – Conclusion

Write 3 paragraphs:

**Summary of Findings:**
> The STRIDE analysis of GymeQuest identified 14 threats across 10 system elements. The most critical vulnerabilities involve cloud backend exposure — particularly the Supabase anon key accessibility, lack of enforced Row-Level Security on all tables, and the absence of MFA. The average DREAD score of 7.08 indicates a medium-to-high overall risk profile that is manageable with proper cloud configuration.

**Cloud Security Insights:**
> The shift to a cloud-hosted backend (Supabase/AWS) introduces an entirely new attack surface beyond the mobile device. Authentication tokens, database access policies, and API rate limiting all require explicit configuration — they are not secure by default. Integrating cloud security reviews into the development lifecycle, rather than treating them as post-launch tasks, would significantly improve the app's security posture.

**Lessons Learned:** *(Each member writes 1–2 sentences personally)*

**Limitations & Recommendations:**
> This analysis is static and does not include penetration testing. Future work should include dynamic analysis (e.g., OWASP Mobile Top 10 checklist), automated scanning of Supabase policies, and a formal incident response plan.

---

## Section 10 – Members' Information

Create a table with:
| Full Name | Email Address | Role/Responsibility |
|---|---|---|
| *(Member 1)* | | STRIDE Analysis + DFD |
| *(Member 2)* | | DREAD Scoring + Risk Table |
| *(Member 3)* | | Mitigations + Cloud Security |
| *(Member 4)* | | Introduction + Conclusion |
| *(Member 5)* | | Formatting + Presentation |

---

## ✅ Step-by-Step Execution Checklist

- [ ] **Step 1:** Everyone reads this guide and the GymeQuest README
- [ ] **Step 2:** Assign documentation sections to members (see Section 10 above)
- [ ] **Step 3:** Create the DFD in Draw.io using the component list in Section 5
- [ ] **Step 4:** Fill in the STRIDE table (Section 6) — review each component's threats
- [ ] **Step 5:** Fill in the DREAD table (Section 7) — score each threat as a group
- [ ] **Step 6:** Write Mitigation Strategies (Section 8) in your own words
- [ ] **Step 7:** Write Introduction, Conclusion, Members Info
- [ ] **Step 8:** Assemble in Google Docs or Word. Format with proper headings
- [ ] **Step 9:** Export as PDF for submission

---

## 💡 Tips

- **DFD tool:** Go to https://draw.io → File → New → Blank. Use the shape library for process/data store/entity shapes.
- **STRIDE shortcut:** Ask yourself for each component: *"Can someone pretend to be this? Can someone modify it? Can someone deny using it? Can data leak from it? Can it be overwhelmed? Can access be escalated through it?"*
- **DREAD scoring:** Do it as a group discussion with each member voting — take the average of all votes for each column.
- **Word count tip:** The Introduction + System Overview alone should be ~500 words; Mitigations ~600 words; Conclusion ~300 words.
