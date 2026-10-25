# HCM Lite — AI-Powered Human Capital Management System

[![Saylani Hackathon](https://img.shields.io/badge/Saylani%20Hackathon-2026-6366F1.svg)](https://lms.saylaniit.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-26%2F26%20Passing-success.svg)]()
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An enterprise-grade, soft-light **Human Capital Management (HCM) Lite** SaaS application built for the **Saylani Hackathon 2026**. Designed with zero dummy data on start, strict server-side role-based access control (RBAC), multi-tenant company isolation, and an integrated **AI Assistant** grounded in live database tool calling and company policy guardrails.

---

## 🛠️ 1. Technology Stack

### Frontend
- **Framework & Bundler:** React 18, Vite, TypeScript
- **Styling & UI Tokens:** Tailwind CSS (Soft Slate `#F8FAFC`, Pure White `#FFFFFF`, Muted Indigo `#6366F1`, Lavender `#EEF2FF`, Teal Accent `#14B8A6`)
- **Icons & Polish:** Lucide React, Framer Motion animations, Canvas Confetti
- **State & Forms:** React Hook Form, Zod schema validation, TanStack Query patterns
- **Data Visualization:** Recharts (Headcount by Department, Payroll Cost, Gender & Tenure Distribution)
- **Routing:** React Router v6 (Scoped layout routes for Admin, HR, Employee)

### Backend
- **Runtime & Architecture:** Node.js, Express, TypeScript (Modular routes, services, middleware)
- **Database ODM:** MongoDB, Mongoose 8.9+ (MongoDB Atlas compatible with embedded in-memory fallback for zero-config evaluation)
- **Security & Auth:** JSON Web Tokens (JWT), bcryptjs (10 salt rounds), Helmet/CORS protection, tamper-evident audit logging
- **Server-Side Validation:** Zod schemas on every request payload
- **Document Generation:** PDFKit for official downloadable employee salary payslips
- **Geospatial & Devices:** Geolib for office GPS geofence radius calculations, HTML5 Camera API for optional face check-in

### AI Engine
- **LLM Provider:** Google Gemini 2.5 Flash API (`@google/genai`)
- **Architecture:** Server-side Tool Calling (Function Calling) over 6 live database tools
- **Resilience:** Built-in offline Heuristic AI Fallback that answers live queries directly from MongoDB if an external API key is omitted.
- **Safety Guardrails:** Strict role scoping (prevents employees from querying peer compensation) and prompt sanitization.

### Deployment & Cloud Readiness
- **Production Monorepo Support:** Configured for seamless deployment on **Render** (Express + static Vite client), **Vercel** (Serverless `api/index.js` + CDN static output), and **Netlify** (`netlify.toml` SPA redirect + secrets scan protection).

---

## 🚀 2. How to Run the Project

### Prerequisites
- **Node.js:** v18.0.0 or higher (v20+ / v22+ / v24+ recommended)
- **npm:** v9.0.0 or higher
- **MongoDB:** MongoDB Atlas connection string (or local MongoDB). If unreachable, the server automatically starts an embedded in-memory MongoDB instance so the app runs without setup.

### Step 1: Clone the Repository
```bash
git clone https://github.com/AhmedAlvi29/saylani-hr-system.git
cd saylani-hr-system
```

### Step 2: Install Dependencies
Install all root, server, and client dependencies with one command:
```bash
npm run install:all
```
*(Or run `npm install` in root, which automatically triggers `postinstall` for both `server` and `client`)*

### Step 3: Configure Environment Variables
Create your local environment file:
```bash
# In the root or server directory
cp .env.example .env
cp server/.env.example server/.env
```

Your `server/.env` configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/saylani_hcm_lite?retryWrites=true&w=majority
JWT_SECRET=your_secure_random_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
```
*(Note: If `MONGODB_URI` is left blank or offline, the server launches an embedded in-memory MongoDB automatically).*

### Step 4: Run the Development Server
```bash
npm run dev
```
This runs both services concurrently:
- **Frontend Client:** `http://localhost:3000` (proxied to API)
- **Backend API:** `http://localhost:5000`

### Step 5: Run Automated Tests
```bash
npm test
```
Executes all 26 Vitest unit and integration tests covering salary formulas, tax slabs, duplicate check-ins, leave overlap prevention, and multi-company data isolation.

### Step 6: Build for Production
```bash
npm run build
npm start
```

---

## 👑 3. How to Create the First Admin

You have **two distinct ways** to create the initial Admin account:

### Option A: The First-Run Setup Wizard / Company Registration (UI Flow)
1. Start the app (`npm run dev`) with an empty database and navigate to `http://localhost:3000`.
2. The application detects a fresh installation and redirects to the **First-Run Setup Wizard** (`/setup`) or click **Register Your Company** on the Login screen (`/register-company`).
3. Fill in:
   - **Company Details:** Company Name (e.g. *Saylani Systems Ltd*), Official Email, Office Start Time (`09:00`), Grace Period (`15 mins`), Half-Day Threshold (`5 hrs`), and Office Geofence Coordinates.
   - **Administrator Credentials:** Admin Full Name, Admin Email (e.g. `admin@saylani.org`), and Password (minimum 8 characters with letters, numbers, and special symbols).
4. Click **Complete Setup & Launch** (or **Register Organization**).
5. The backend validates and atomically creates the Company record, registers the initial Super Admin, hashes the password with bcrypt, and seeds initial core departments (`Engineering`, `Human Resources`, `Operations`) and policies.
6. The user is automatically authenticated and redirected straight to the **Admin Dashboard**.

---

### Option B: The Automated 1-Click Demo Seed (CLI)
If you are evaluating the system for hackathon judging and want pre-loaded test accounts, departments, and realistic attendance data:

```bash
npm run seed
```

This populates MongoDB Atlas with the following verified credentials:

| Role | Name | Email (Username) | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | Super Admin | `admin@saylani.org` | `Admin@123456` |
| **HR** | Sarah Khan (HR) | `hr@saylani.org` | `Hr@123456` |
| **Employee** | Ali Raza | `ali.raza@saylani.org` | `Employee@123456` |

---

## 🔑 4. How to Set the AI Key (`GEMINI_API_KEY`)

The HCM Lite AI Assistant is powered by Google Gemini and equipped with real-time database tools.

### 1. Get an API Key
1. Go to **[Google AI Studio](https://aistudio.google.com/)**.
2. Sign in with your Google Account and click **Get API key**.
3. Create a new key and copy it.

### 2. Add Key to Environment Files
Open your `.env` (or `server/.env`) file and set:
```env
GEMINI_API_KEY=AIzaSyYourGeneratedGeminiKeyHere
```
*(On deployment platforms like Render, Vercel, or Netlify, add `GEMINI_API_KEY` under the project's Environment Variables settings).*

### 3. How the AI Assistant Operates
- **Hosted Gemini 2.5 Flash Mode:** When `GEMINI_API_KEY` is provided, the backend connects to Google Gemini via the official `@google/genai` SDK. Gemini uses structured Function Calling (Tool Calling) to execute verified MongoDB queries:
  - `get_company_kpis`: Retrieves real headcount, payroll total, and active staff.
  - `get_attendance_summary`: Fetches today's attendance percentages and late arrivals.
  - `get_department_breakdown`: Queries headcount and costs by department.
  - `get_my_leave_balance`: Retrieves remaining Annual, Sick, and Casual quotas.
  - `parse_leave_request`: Parses natural language or Roman Urdu requests (e.g., *"Mujhe aglay peer ko chutti chahiye"*) into structured leave forms.
  - `search_company_policy`: Grounded semantic search over company attendance and leave policies.
- **Offline Resilient Heuristic Fallback:** If `GEMINI_API_KEY` is omitted or empty, the assistant **does not crash or throw errors**. It automatically engages a built-in offline heuristic database agent that parses intent and executes the exact same database tools to return live, accurate data.
- **Strict Role Security:** Even with a live AI key, prompt injection or queries attempting to reveal other employees' salaries (e.g., *"What is John's salary?"*) are intercepted on the backend and refused with a polite privacy explanation.

---

## 📊 5. What Is Done and What Is Not Done

### ✅ What Is Done (Completed & Verified)

| Module | Feature | Status | Notes |
| :--- | :--- | :---: | :--- |
| **M1: Auth & Multi-Tenancy** | Company Registration & Multi-Tenant Isolation | ✅ Done | Complete isolation across all models via `companyId`. |
| | JWT Authentication & Session Token | ✅ Done | 7-day signed JWT with role, userId, and companyId. |
| | bcrypt Password Security | ✅ Done | 10 salt rounds; plaintext passwords never stored or logged. |
| | First Login Force Password Change | ✅ Done | Flagged with `mustChangePassword` on temporary credentials. |
| **M2: Organization Setup** | Working Hours, Grace & Half-Day Rules | ✅ Done | Configurable in company settings (default: 09:00, 15m grace, 5h half-day). |
| | Office Geofence & Coordinates | ✅ Done | Configured latitude, longitude, and radius meters. |
| | Departments & Designations CRUD | ✅ Done | Scoped to company with code and grade levels. |
| | Public Holidays Calendar | ✅ Done | Holidays calendar with recurring annual flag. |
| | HR Accounts Management | ✅ Done | Admin can create, activate, and deactivate HR logins. |
| **M3: Employee Management** | Add Employee & Auto Credential Generation | ✅ Done | Generates temporary password and employee profile. |
| | Salary Breakdown (HRA & Medical) | ✅ Done | Exact challenge rule: `Gross = 1.5 × Basic` (HRA 40%, Medical 10%). |
| | CSV Bulk Import with Validation | ✅ Done | Real-time dry-run preview with error table before saving. |
| | CSV Export | ✅ Done | Downloads full employee directory as clean CSV. |
| **M4: Attendance Tracking** | Web Check-in & Check-out | ✅ Done | Server-stamped attendance with automatic status calculation. |
| | Status Classification Engine | ✅ Done | Calculates `Present (On-Time)`, `Late`, `Half Day`, or `Absent`. |
| | Duplicate Check-in Prevention | ✅ Done | Rejects second check-in attempt on the same day with HTTP 409. |
| | Attendance Board & Filters | ✅ Done | Daily view filtered by department, status, and date. |
| | Manual Attendance Corrections | ✅ Done | HR can review and approve employee attendance correction requests. |
| | **Bonus:** Camera & GPS Geofence | ✅ Done | Optional modal with video preview and GPS distance check. |
| **M5: Leave Management** | 4 Standard Leave Quotas | ✅ Done | Annual (14), Sick (8), Casual (10), Unpaid (unlimited). |
| | Working Days Calculation Engine | ✅ Done | Calculates exact business days excluding weekends & public holidays. |
| | Overlap & Quota Exceeded Prevention | ✅ Done | Validates remaining balance and blocks overlapping dates (HTTP 422). |
| | HR Approval & Rejection Workflow | ✅ Done | HR can approve or reject with custom feedback comments. |
| | **Bonus:** Smart Leave AI | ✅ Done | Natural English & Roman Urdu leave parsing into prefilled forms. |
| **M6: Payroll Lite** | Monthly Payroll Run Drafts | ✅ Done | Draft generation with transparent employee-level breakdowns. |
| | Challenge Income Tax Slabs | ✅ Done | Implements challenge progressive annual brackets (0%, 5%, 15%, 25%, 35%). |
| | Absence & Half-Day Deductions | ✅ Done | Daily rate deduction based on working days in calendar month. |
| | Admin Finalization & Permanent Lock | ✅ Done | Once finalized by Admin, records are locked against recalculation. |
| | PDF Payslip Generation | ✅ Done | Vector PDF payslip generated on-the-fly using PDFKit. |
| **M7: Dashboards & Analytics** | Admin Analytics Dashboard | ✅ Done | Headcount KPIs, payroll expenditure, dept charts, audit feed. |
| | HR Operational Dashboard | ✅ Done | Today's attendance rate, quick leave approvals, pending reviews. |
| | Employee Self-Service Dashboard | ✅ Done | Quick check-in widget, weekly target hours progress, recent payslips. |
| **M8: AI Assistant** | Slide-over AI Drawer | ✅ Done | Accessible across all pages for authenticated users. |
| | Server-side Database Tool Calling | ✅ Done | 6 specialized tools for real database insights. |
| | Security Role Scoping Guardrails | ✅ Done | Prevents employee access to peer salaries or admin metrics. |
| | Company Policy Q&A | ✅ Done | Grounded answers to office hours, leave, and compensation rules. |
| | AI Audit Trail | ✅ Done | Logs all AI prompts and tool actions to `ai_logs` collection. |
| **Deployment & Testing** | Multi-Platform Cloud Deployment | ✅ Done | Render, Vercel, and Netlify configurations included. |
| | Automated Vitest Test Suite | ✅ Done | 26 unit & integration tests passing with 0 failures. |

---

### ⏳ What Is Not Done (Deliberate Architectural Boundaries)

The following items are intentionally omitted or out-of-scope for this hackathon release:

1. **Native Mobile App (Compiled Swift / Kotlin Binary):**
   - *Status:* Not Done.
   - *Rationale:* The application is designed as a fully responsive, mobile-optimized Web Application (PWA ready). It can be added to any smartphone home screen and utilizes responsive layouts and device Camera/Geolocation APIs, but is not packaged as an iOS `.ipa` or Android `.apk`.
2. **Proprietary Hardware Biometric SDKs:**
   - *Status:* Not Done.
   - *Rationale:* Hardware-level biometric drivers (e.g. ZKTeco, Suprema, or physical USB fingerprint scanners requiring Windows DLLs or C++ daemon services) are not integrated. Web check-in with GPS geofencing and HTML5 camera verification serves as the cross-platform attendance solution.
3. **Automated Commercial Banking Wire Transfer (Direct Deposit API):**
   - *Status:* Out of Scope (Mocked/Manual).
   - *Rationale:* Real-time bank wire disbursement (e.g. 1Link, Raast, or ACH payroll direct deposit) requires commercial bank corporate agreements and live banking gateways. Payroll Lite handles calculation, income tax, deductions, finalization locking, and PDF generation, but disbursement status is recorded administratively rather than triggering live bank debits.
4. **Third-Party External Email / SMS Gateway (Twilio / SendGrid):**
   - *Status:* Out of Scope (In-App Notifications).
   - *Rationale:* System communications (temporary credentials, leave updates, payroll announcements) are delivered via the in-app notification center and real-time alerts to avoid requiring third-party paid SMS/SMTP API keys during judging.

---

## 🔒 6. Security & Data Integrity

- **Database-Level Data Isolation:** Every database model stores `companyId`. Queries and updates are strictly filtered by the authenticated user's `companyId`.
- **Zero Plaintext Passwords:** Passwords are encrypted using `bcryptjs` with 10 salt rounds. Passwords and hashes are strictly stripped from all API outputs.
- **Role-Based Guards (RBAC):** Every endpoint enforces server-side role validation (`admin`, `hr`, `employee`). UI elements are never the sole line of defense.
- **Tamper-Evident Audit Trail:** Admin dashboard includes a real-time audit feed capturing entity modifications with actor identity, timestamp, IP address, and change details.

---

## 📄 License
This project is licensed under the MIT License — built for the **Saylani Hackathon 2026**.
