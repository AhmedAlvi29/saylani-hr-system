# HCM Lite — AI-Powered Human Capital Management System

[![Saylani Hackathon](https://img.shields.io/badge/Saylani%20Hackathon-2026-6366F1.svg)](https://lms.saylaniit.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An enterprise-grade, soft-light **Human Capital Management (HCM) Lite** SaaS application built for the **Saylani Hackathon 2026**. Designed with zero dummy data on start, strict server-side role-based access control (RBAC), and an integrated **AI Assistant** grounded in live database tool calling and company policy guardrails.

---

## 🌟 Executive Summary & Features

### 🏢 3 Role Personas with Scoped Access
1. **Admin (Company Governance):**
   - First-run wizard for company setup (office hours, grace period, geofence coordinates & radius).
   - Manages departments, designations, public holidays, and HR login accounts.
   - Finalizes and permanently locks monthly payroll runs.
   - Organization-wide analytics, attrition rates, and live tamper-evident audit logs.
2. **HR (People Operations):**
   - Employee registration with automatic portal login credential generation.
   - CSV bulk import with live dry-run error validation and CSV export.
   - Daily attendance board with manual attendance correction approvals.
   - Leave request approvals/rejections with custom reviewer comments.
   - Prepares and reviews monthly payroll draft calculations.
3. **Employee (Self-Service):**
   - Daily web check-in & check-out with server-stamped timestamps.
   - **Optional Bonus:** Camera attendance with face detection preview and GPS geofence radius check.
   - Leave balance tracking (Annual 14, Sick 8, Casual 10, Unpaid unlimited) and date overlap validation.
   - **Smart Leave AI:** Apply for leaves using natural English or Roman Urdu sentences.
   - Personal payslips with official downloadable PDF salary slips.
   - Personal dashboard with weekly target hours progress and late arrival monitoring.

---

## 🧠 AI Assistant (M8) with Backend Tool Calling

The AI Assistant is accessible via a responsive slide-over drawer and is strictly grounded in database queries:
- **Hosted Model Integration:** Powered by Google Gemini (`@google/genai`) with an offline resilient heuristic fallback engine that guarantees instant, real-data answers even without an external API key!
- **Strict Role Scoping:**
  - When an Employee queries a colleague's salary (e.g. *"What is John's salary?"*), the assistant **politely refuses** to disclose private compensation data.
  - Employees only access their own remaining leave balances and personal attendance.
  - Managers can query organization-wide headcount, department distributions, attendance rates, top late-comers, and payroll summaries.
- **Smart Leave Application:** Converts natural queries like *"Need next Monday and Tuesday off for sister's wedding"* or Roman Urdu *"Mujhe aglay peer aur mangal ko chutti chahiye"* into structured, prefilled leave forms for user confirmation.
- **Dashboard KPI Summarizer:** Generates 3–5 concise executive bullets using verified metrics.
- **Audit Logging:** Every AI request and tool execution is logged in the `ai_logs` collection and labeled with *"AI-generated"*.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Lucide React, Recharts, Canvas Confetti |
| **Backend** | Node.js, Express, TypeScript, Mongoose, Zod, JWT, bcryptjs, PDFKit, Geolib |
| **Database** | MongoDB (with automatic embedded `mongodb-memory-server` fallback for 100% zero-config evaluation) |
| **AI / LLM** | Google Gemini 2.5 Flash API with server-side Tool Calling & System Guardrails |

---

## 🚀 Quickstart: Run in Under 3 Minutes

### Prerequisites
- Node.js v18 or higher
- npm v9 or higher

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/saylani-hackathon/saylani-hr-system.git
cd saylani-hr-system

# Install all dependencies (root, server, and client)
npm run install:all
```

### 2. Environment Configuration
The project is pre-configured with default values in `server/.env.example`.
```bash
# Server configuration
cp server/.env.example server/.env
```
*(Optional)* Add your Google Gemini API key to `GEMINI_API_KEY` in `server/.env` if you wish to use live hosted Gemini. If left empty, the intelligent heuristic engine will query the database directly!

### 3. Run the Development Server
```bash
npm run dev
```
- **Backend API:** `http://localhost:5000`
- **Frontend Web Portal:** `http://localhost:3000`

---

## 🧪 Running Automated Tests

Run the comprehensive unit and integration test suite:
```bash
npm test
```
Tests cover:
- Gross salary formulas (`Gross = 1.5 × Basic`, HRA 40%, Medical 10%).
- Challenge income tax slabs (0%, 5%, 15%, 25%, 35%).
- Duplicate check-in rejection with HTTP 409 Conflict.
- Working days calculation excluding weekends and public holidays.
- Leave quota overflow and overlap rejection (HTTP 422).
- AI role scoping and colleague salary query refusal.

---

## 📋 5-Minute Live Judging Demo Script

Follow this step-by-step walkthrough to evaluate all 25 checklist functionalities:

1. **First-Run Setup Wizard (`http://localhost:3000`):**
   - The application opens directly to the **First-Run Setup Wizard** (no dummy data exists).
   - Enter Company Name: `Saylani Tech Ltd`.
   - Configure Office Hours: `09:00`, Grace: `15 mins`, Half Day: `5 hrs`, Geofence: `150m`.
   - Create the initial Admin account: `admin@saylani.org` / `Admin@123456`.
   - Click **Complete Setup & Launch** (celebrated with confetti 🎉).

2. **Admin Setup & HR Account Creation:**
   - Go to **Organization Setup > HR Logins Management**.
   - Create an HR account: `hr@saylani.org` / `Hr@123456`.
   - Log out, or switch to HR login.

3. **HR Registers Employees:**
   - Sign in as `hr@saylani.org`.
   - Open **Employees** and click **Add Employee**.
   - Fill in details: `Ali Raza`, basic salary `100,000` (notice live preview calculates Gross = `150,000`).
   - Copy the generated temporary credentials (`ali.raza@saylani.org` / `Welcome@123`).

4. **Employee First Login, Password Change & Check-in:**
   - Sign in as `ali.raza@saylani.org`.
   - The system detects `mustChangePassword` and forces setting a permanent password.
   - Land on Employee Dashboard. Click **Web Check-in** (server stamps attendance).
   - Try clicking Web Check-in again (gracefully rejected: *"Employee has already checked in for today"*).
   - *(Optional)* Test **Camera & GPS Check-in** modal.

5. **Smart Leave Application with AI:**
   - Click **AI Assistant** or **Smart Leave AI**.
   - Type: *"Need next Monday and Tuesday off for sister's wedding"*.
   - AI extracts Casual Leave, calculates working days (skipping weekends), and pre-fills the form.
   - Click **Confirm & Submit**.

6. **HR Approval & Monthly Payroll Run:**
   - Sign in as HR (`hr@saylani.org`).
   - Open **Leaves**: approve Ali Raza's leave with comment: *"Approved, enjoy the event!"*.
   - Open **AI Assistant** and ask: *"Who is on leave today?"* and *"What is today's attendance rate?"*.
   - Open **Payroll Lite**: select month (e.g. `2026-10`) and click **Generate Draft**.
   - Review transparent breakdown (Basic, HRA, Medical, Deductions, Income Tax).

7. **Admin Finalization, Payslip PDF & Security Audit:**
   - Sign in as Admin (`admin@saylani.org`).
   - Finalize and permanently **Lock Payroll**.
   - Sign in as Employee (`ali.raza@saylani.org`): download the official **PDF Payslip**.
   - In AI Assistant, as employee ask: *"What is Ahmed's salary?"* (AI politely refuses: *"As an employee, you can only access your own personal salary"*).
   - Sign back in as Admin and show the **System Audit Trail** recording every action with before/after state!

---

## 🔒 Security & Data Scope Integrity

- **Server-Side Authorization:** Every protected route verifies JWT token and data scope. Hiding a UI button is never relied upon.
- **Data Scope Guard:** Employees are physically restricted on the database level to records where `employeeId == req.user.employeeId`.
- **Password Protection:** Encrypted using bcrypt with 10 salt rounds. Password hashes are stripped from all JSON responses.
- **Audit Logs:** All create, update, approve, and finalize actions are logged with actor email, role, IP address, timestamp, and JSON payloads. Only Super Admin has access.
