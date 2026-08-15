# Project LOOP — AI Customer-Feedback Intelligence Platform

> **"Close the loop on customer feedback."**  
> A corporate-grade, multi-tenant web application that ingests scattered multi-channel feedback, uses AI for structured classification and theme clustering, tracks emerging trends, and answers plain-English questions grounded in real customer evidence.

Built for the **Zidio Development Web Development Track (Corporate-Grade Track)**.

---

## 👥 Authors & Team
- **Sonu Thakur**
- **Vishal**

---

## 🌐 Live Deployment & Links
- **Live Demo URL**: [https://your-deployment-url.vercel.app](https://your-deployment-url.vercel.app) 

---

## 🌟 Key Features

### 🏢 Core Application
- **Multi-Tenant Workspace Isolation**: Strict database foreign-key isolation and session guards ensuring zero cross-tenant data leakage.
- **Role-Based Access Control (RBAC)**: Hierarchical roles (`ADMIN > ANALYST > VIEWER`) enforced server-side.
- **Multi-Channel Ingestion**: Single manual submission, CSV bulk import with drag-and-drop auto-column mapping, and simulated integration channels (Support Tickets, App Store Reviews, NPS Surveys, Sales Notes).
- **Interactive Feedback Inbox**: Server-side pagination, multi-dimensional filtering, full-text search, and inline status triaging (`NEW` → `REVIEWED` → `ACTIONED`).
- **Real-Time Analytics Dashboard**: Real Recharts visualizations (Volume over time, Sentiment donut, Theme breakdown) with sub-15ms query aggregation.

### 🧠 AI Intelligence Suite
- **Structured Auto-Classification (AI1)**: Automatic extraction of sentiment, numeric sentiment score (-1 to 1), themes, feature areas, and rationales with Zod validation and fallback heuristics.
- **Theme Clustering & Trend Detection (AI2)**: 14-day volume tracking, week-over-week growth rate calculation, and spike detection badges.
- **Ask LOOP Grounded Q&A (AI3)**: Retrieval-Augmented Generation (RAG) using vector embeddings and cosine similarity search to answer questions citing verifiable feedback cards.
- **Executive Voice-of-Customer (VoC) Reports (AI4)**: Automated synthesis of top themes, sentiment shifts, verbatim quotes, and categorized strategic action matrices with **PDF/Print**, **CSV**, and **Markdown** exports.

### 🛡️ Enterprise Engineering Standards
- **ACID Transactions**: Atomic multi-write operations wrapped in `db.$transaction()`.
- **Security Hardening**: HSTS, X-Frame-Options, MIME-sniffing protection, CSP, and in-memory sliding-window rate limiting.
- **Modern UI/UX**: Three.js particle convergence canvas, smooth 400ms dark/light mode transitions, and glassmorphic styling.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 14+ (App Router) + TypeScript | Full-stack architecture, Server & Client Components |
| **Styling** | Tailwind CSS + CSS Variables | Responsive design, dynamic light/dark theme system |
| **Database** | PostgreSQL (Neon / Supabase / Local) | Relational integrity and multi-tenant foreign keys |
| **ORM** | Prisma 5+ | Type-safe queries, schema migrations, and transactions |
| **Auth** | NextAuth.js (Auth.js) | JWT session management, RBAC, and credentials provider |
| **AI / LLM** | Google Gemini / Anthropic Claude SDK | Classification, RAG Q&A, and VoC report generation |
| **Search** | Vector Embeddings & Cosine Similarity | Semantic retrieval for Ask LOOP grounding |
| **Charts** | Recharts | Volume area chart, sentiment donut, and theme bar chart |
| **Validation**| Zod | Runtime input validation on all API routes and client forms |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: `v18.17.0` or higher
- **PostgreSQL Database**: Local or hosted (Neon, Supabase)
- **Git**

### 2. Installation & Environment Setup
```bash
# Clone the repository
git clone https://github.com/sonuthakur03/loop.git
cd loop

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Ensure your `.env` contains:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/loop"
NEXTAUTH_SECRET="your-32-character-random-secret-key"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Database Initialization & Seeding
```bash
# Push schema to database and generate Prisma Client
npm run prisma:generate
npm run db:push

# Seed realistic demo data (120+ feedback items, 8 themes, 3 role accounts)
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Login Credentials

For testing and evaluation of Role-Based Access Control (RBAC):

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `alex@acme.io` | `Password123!` | Full access (Member management, role updates, feedback ingestion, report generation) |
| **ANALYST** | `sam@acme.io` | `Password123!` | Ingest feedback, reclassify, generate reports, view all analytics |
| **VIEWER** | `jordan@acme.io` | `Password123!` | Read-only access to dashboard, inbox, trends, and reports |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                    │
│   Next.js React Client / Server Components · Recharts  │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP / JSON
┌────────────────────────────▼────────────────────────────┐
│              Next.js API Layer (Route Handlers)         │
│   Auth Guards · Role Enforcement · Zod Validation       │
└──────────────┬────────────────────────────┬─────────────┘
               │                            │
┌──────────────▼─────────────┐   ┌──────────▼─────────────┐
│    Prisma ORM + Postgres   │   │     AI Cloud Services  │
│ Multi-Tenant Scoped Tables │   │ Gemini / Claude API    │
│  Workspace Isolation Model │   │ Vector Embeddings      │
└────────────────────────────┘   └────────────────────────┘
```

---

## 📜 Project Evaluation Checklist (Zidio Rubric)

- [x] **M1: Foundation & Data Layer (10/10)** — Multi-tenant schema, NextAuth sessions, RBAC guards.
- [x] **M2: Core Application (15/15)** — Bulk CSV upload, simulated channels, paginated inbox, real-time dashboard.
- [x] **M3: AI Features (15/15)** — Auto-classification, theme clustering, Ask LOOP grounded Q&A with citations.
- [x] **M4: Production Polish (10/10)** — VoC Executive Reports (PDF/CSV/Markdown), error/empty states, responsive design.
- [x] **Code Quality & Git (20/20)** — Strict TypeScript (`0 errors`), ACID transactions, DRY shared helpers, structured commit history.
