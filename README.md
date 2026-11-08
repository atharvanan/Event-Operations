# 🎪 EventOps — Live Operations & Team Coordination Platform

> A Jira-inspired, multilingual on-ground event operations and team coordination Progressive Web App (PWA) and REST API built for high-stakes live productions, luxury destination weddings, and corporate summits.

![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)
![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)
![PWA](https://img.shields.io/badge/PWA-Offline_Ready-purple.svg)
![Tests](https://img.shields.io/badge/Tests-13%2F13_Passed-brightgreen.svg)

---

## 📋 Table of Contents
1. [Platform Overview](#-platform-overview)
2. [Responsibilities & Permissions Matrix](#-responsibilities--permissions-matrix)
3. [Architecture & System Design](#-architecture--system-design)
4. [Flagship Features](#-flagship-features)
   - [Event Day Mode](#1-event-day-mode-outdoor-high-contrast)
   - [7-State Task Engine & Microtasks](#2-7-state-task-engine--microtasks)
   - [Evidence Pipeline & Proof Verification](#3-evidence-pipeline--proof-verification)
   - [Live Operations Command Center](#4-live-operations-command-center)
   - [PWA Offline Resilience & Push Notifications](#5-pwa-offline-resilience--push-notifications)
   - [Real-Time Comms & Voice Notes](#6-real-time-comms--voice-notes)
5. [Verified Zero-Cost Infrastructure Blueprint](#-verified-zero-cost-infrastructure-blueprint)
6. [Local Development & Quickstart](#-local-development--quickstart)
7. [Running Tests](#-running-tests)
8. [Production Deployment Guide](#-production-deployment-guide)
   - [Deploying Backend to Render](#deploying-backend-to-render)
   - [Deploying Frontend to Vercel](#deploying-frontend-to-vercel)

---

## 🌟 Platform Overview

Live events (weddings, exhibitions, concerts) fail when coordination breaks down between management, department leads, and floor crew. Standard project management tools are designed for desk workers, while messaging apps cause critical task updates to be buried in noise.

**EventOps** bridges this divide with:
- **Zero-barrier team creation**: Event Managers can create and name teams **anything** they want (e.g., *"VIP Hospitality"*, *"Dhol Tasha Crew"*, *"Drone Coverage"*, *"Pyro & Stage FX"*). No restrictive presets.
- **Microtask delegation**: Managers assign outcome-focused parent milestones (e.g., *"Complete Main Mandap Floral Canopy"*); Team Leads decompose them into microtasks and assign them to crew.
- **Evidence-gated sign-off**: Tasks cannot be marked complete without photographic/video proof verified by leads or managers.
- **Outdoor-optimized Day Mode**: Glare-resistant dark theme with 52px+ touch targets designed for on-the-move staff wearing gloves or holding gear.
- **Native offline resilience**: IndexedDB queue for caching updates offline and automatically synchronizing when back on venue Wi-Fi.
- **Multilingual localization**: Native support for **English**, **Hindi (हिन्दी)**, and **Marathi (मराठी)** with auto-language detection.

---

## 👥 Responsibilities & Permissions Matrix

The platform enforces a strict, hierarchical role-based access control (RBAC) model with **configurable operational permissions**:

| Capability | Manager | Team Lead | Worker / Crew | Configurable Setting |
| :--- | :---: | :---: | :---: | :--- |
| **Create events** | ✅ | ❌ | ❌ | Fixed |
| **Create/manage teams (Free-form names)** | ✅ | ❌ | ❌ | Fixed |
| **Assign team-level (parent) tasks** | ✅ | ❌ | ❌ | Fixed |
| **Assign individual / microtasks** | ✅ | ✅ | ❌ | Configurable (`allowLeadTaskCreation`) |
| **Acknowledge assigned tasks** | ✅ | ✅ | ✅ | Standard |
| **Upload photo/video proof** | ✅ | ✅ | ✅ | Standard |
| **Review worker submissions** | ✅ | ✅ | ❌ | Configurable (`requireLeadReviewFirst`) |
| **Verify overall team work** | ✅ | ✅ | ❌ | Manager final sign-off |
| **Global event chat** | ✅ | ✅ | ✅ / ❌ | Configurable (`allowWorkersGlobalChat`) |
| **Team department chat** | ✅ | ✅ | ✅ / ❌ | Configurable (`allowWorkersTeamChat`) |
| **Self-assign open backlog tasks** | ✅ | ✅ | ❌ / ✅ | Configurable (`allowWorkerSelfAssignment`) |

> ⚙️ **Configurable Settings Panel**: Event Managers can toggle chat access, lead task delegation, two-tier verification, and self-assignment in real-time from the **Operations & Access Permissions** modal (`PATCH /api/v1/events/:id/permissions`).

---

## 🏗️ Architecture & System Design

EventOps is architected as a modular TypeScript monorepo:

```
Event_Operations_Platform_Master/
├── backend/                       # Node.js + Express + Socket.IO API
│   ├── src/
│   │   ├── config/                # Environment and MongoDB Atlas setup
│   │   ├── constants/             # Enums: TaskStatus, Priority, Roles
│   │   ├── controllers/           # Auth, Events, Teams, Tasks, Evidence, Chat, Notifications
│   │   ├── middlewares/           # JWT auth, OrgRole and EventRole checks, Multer
│   │   ├── models/                # Mongoose models with validation & audit logs
│   │   ├── routes/                # REST endpoints under /api/v1
│   │   ├── sockets/               # Socket.IO rooms and real-time event broadcasting
│   │   └── utils/                 # Storage, VAPID push notifications, JWT helpers
│   ├── tests/                     # Vitest integration test suite (13 tests)
│   └── seeds/                     # Realistic luxury wedding operational seed script
│
├── frontend/                      # Next.js 14 App Router + Tailwind CSS PWA
│   ├── public/
│   │   ├── icons/                 # PWA icons (192x192, 512x512)
│   │   ├── locales/               # en/, hi/, mr/ translation dictionaries
│   │   ├── sw.js                  # PWA Service Worker (App shell + Push + Fallback)
│   │   └── manifest.json          # Web app manifest
│   ├── src/
│   │   ├── app/                   # App Router pages (/events, /tasks, /day-mode, /chat, etc.)
│   │   ├── components/            # UI components (tasks, teams, evidence, chat, operations)
│   │   ├── contexts/              # Auth & Event context providers
│   │   ├── hooks/                 # Socket.IO & real-time hooks
│   │   └── lib/                   # Axios API client, i18n, IndexedDB offline queue
│
└── shared/
    └── types/                     # Shared TypeScript contracts & interfaces
```

---

## ⚡ Flagship Features

### 1. Event Day Mode (Outdoor High-Contrast)
- **High-contrast, glare-resistant dark theme** (`#020617` base with vivid yellow `#F59E0B`, emerald `#10B981`, and red `#EF4444` highlights).
- **52px+ oversized single-hand touch targets** engineered for thumb use on smartphones without precision taps.
- **Milestone Countdown Ticker**: Dynamic countdown timer to event start or key milestones (e.g. *Main Stage Showtime*).
- **Fast Blocker Reporting**: 1-tap modal to report on-ground bottlenecks (generator tripped, missing cabling, vendor delays).
- **Direct Voice SOS**: Quick-access voice note recording floating button to ping leads without opening chat.

### 2. 7-State Task Engine & Microtasks
Implements a strict operational state machine:
```
[ TO_DO ] ──(Acknowledge)──> [ ACKNOWLEDGED ] ──(Start Work)──> [ IN_PROGRESS ]
                                                                       │
                       ┌───────────────────────────────────────────────┼──────────────────────────────┐
                       │                                               │                              │
                (Report Blocker)                              (Submit for Review)              (Mark Complete)
                       ▼                                               ▼                              ▼
                 [ BLOCKED ]                                [ SUBMITTED_FOR_REVIEW ]            [ COMPLETED ]
                       │                                               │                              ▲
                (Resolve Blocker)                                      ├──────(Approve Proof)─────────┘
                       │                                               │
                       └─────────────> [ IN_PROGRESS ] <──(Rework)─────┴────── [ REWORK_REQUIRED ]
```
- **Prerequisite Dependency Gating**: Tasks cannot transition to `IN_PROGRESS` if prerequisite tasks are incomplete.
- **Evidence Completion Lock**: Tasks requiring proof cannot be marked `COMPLETED` until approved verification items meet `minEvidenceCount`.
- **Immutable Audit Trail**: Every status transition, rework note, and proof upload logs an immutable `TaskActivity` entry.

### 3. Evidence Pipeline & Proof Verification
- **Client-Side Compression**: Pre-compresses photos on an HTML5 canvas prior to upload, reducing 15MB camera shots to ~300KB for lightning-fast mobile uploads over cellular connections.
- **Review Inbox**: Leads and managers filter pending submissions by department, inspect high-res photos in an image lightbox, and approve or request rework with notes.
- **Local Disk & Zero-Cost Cloud Storage**: Uses standard disk storage with strict MIME-type validation (JPEG, PNG, WebP, MP4, WebM) capped at 15MB.

### 4. Live Operations Command Center
- **Live Audit Feed (`ActivityFeed.tsx`)**: Chronological audit trail across all teams with real-time Socket.IO updates (`activity:new`).
- **Workload & Capacity Matrix (`WorkloadMatrix.tsx`)**: Visual breakdown per team and staff member with **HIGH LOAD** warning badges for staff with >3 concurrent active tasks.
- **Timeline Schedule View (`TimelineView.tsx`)**: Groups operational tasks into 4 time slots (*Morning Staging*, *Afternoon Tech Checks*, *Evening Main Event*, *Night Teardown*).

### 5. PWA Offline Resilience & Push Notifications
- **IndexedDB Offline Queue (`offlineQueue.ts`)**: When on-site cellular drops, status updates, acknowledgments, and blocker notes are queued in browser storage.
- **Auto-Sync Engine**: Listens to browser `online` events, drains the IndexedDB queue in sequence, and shows an auto-dismissing sync banner.
- **Web Push Notifications**: Employs standard browser VAPID keys via `web-push` to dispatch push alerts for blockers, rework, and assignments with **$0 API cost** (no Twilio, WhatsApp, or Firebase fees).

### 6. Real-Time Comms & Voice Notes
- **Channel Partitioning**:
  - `GLOBAL_EVENT`: Venue-wide announcements.
  - `TEAM_INTERNAL`: Department-only operational talk.
  - `MANAGER_TEAM`: Private manager-to-lead coordination.
- **Voice Notes**: In-app MediaRecorder capture with duration timer, waveform preview, and custom HTML5 audio playback.
- **Task Deep Links**: Messages can reference specific task IDs, displaying rich interactive task previews directly in the chat stream.

---

## 💰 Verified Zero-Cost Infrastructure Blueprint

| Service Layer | Free Provider | Free Tier Limits | EventOps Architecture Compliance |
| :--- | :--- | :--- | :--- |
| **Frontend & PWA** | **Vercel** | 100 GB bandwidth / month, unlimited deployments | Static app shell + dynamic API proxy |
| **Backend & WebSockets**| **Render** | 750 free instance hours / month | Node.js + Express + Socket.IO server |
| **Database** | **MongoDB Atlas** | M0 Sandbox: 512 MB storage, shared RAM | Efficient indexing, capped audit history |
| **Media Storage** | Local Disk / Object Store | Free tier storage / local disk volume | Client-side compression drops photos to ~300KB |
| **Push Notifications** | Web Push (VAPID) | Unlimited browser push alerts | Standard Web Push API (no SMS/WhatsApp costs) |
| **Maps / Location** | Free Zone Strings | No Google Maps API requirement | Free-form zone strings (*"Main Stage"*, *"Dining Lawns"*) |

---

## 🚀 Local Development & Quickstart

### Prerequisites
- **Node.js**: v20+ or v22+
- **npm**: v10+
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or free MongoDB Atlas URI

### Option A: Running with Docker (Recommended)
```bash
# 1. Clone repository
git clone https://github.com/your-org/event-operations-platform.git
cd event-operations-platform

# 2. Start MongoDB, Backend, and Frontend containers
docker-compose up -d --build

# 3. Access applications
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api/v1
# Health Check: http://localhost:5000/health
```

### Option B: Running Natively with Node.js
```bash
# 1. Install Backend dependencies
cd backend
npm install

# 2. Configure Backend environment
cp .env.example .env
# Set MONGODB_URI and JWT_SECRET in backend/.env

# 3. Seed realistic luxury wedding operational data
npm run seed

# 4. Start Backend development server (Port 5000)
npm run dev

# 5. In a second terminal, install and run Frontend
cd ../frontend
npm install
npm run dev
# Frontend is accessible at http://localhost:3000
```

### Default Seed Credentials
The database seeder provisions realistic accounts for instant testing:
- **Event Manager**: `manager@royalweddings.com` / `Password@123`
- **Catering Lead**: `lead.catering@royalweddings.com` / `Password@123`
- **Stage Decor Lead**: `lead.decor@royalweddings.com` / `Password@123`
- **Sound & Lights Lead**: `lead.av@royalweddings.com` / `Password@123`

---

## 🧪 Running Tests

The backend includes a comprehensive Vitest integration test suite covering authentication, RBAC, teams, tasks, evidence gating, real-time communications, configurable permissions, and push subscriptions.

Tests utilize an isolated in-memory MongoDB runner (`mongodb-memory-server`) with zero external network dependencies:

```bash
cd backend
npm test
```

### Test Suite Results:
```
 ✓ tests/integration/tasks.test.ts (2 tests)
 ✓ tests/integration/phase5_phase6.test.ts (3 tests)
 ✓ tests/integration/evidence.test.ts (1 test)
 ✓ tests/integration/chat.test.ts (1 test)
 ✓ tests/integration/events.test.ts (2 tests)
 ✓ tests/integration/auth.test.ts (4 tests)

 Test Files  6 passed (6)
      Tests  13 passed (13)
```

---

## 🌐 Production Deployment Guide

### Deploying Backend to Render

1. Create a free account at [render.com](https://render.com).
2. Click **New +** -> **Web Service** and connect your GitHub repository.
3. Configure the service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add the following **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGODB_URI`: `mongodb+srv://<user>:<password>@cluster0.mongodb.net/eventops?retryWrites=true&w=majority`
   - `JWT_SECRET`: `your_secure_random_production_secret_key_minimum_32_chars`
   - `CORS_ORIGIN`: `https://your-frontend-app.vercel.app`
5. Click **Deploy Web Service**. Copy the assigned URL (e.g., `https://eventops-api.onrender.com`).

---

### Deploying Frontend to Vercel

1. Create a free account at [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project** and import your repository.
3. Set the **Root Directory** to `frontend`.
4. In **Environment Variables**, configure:
   - `NEXT_PUBLIC_API_URL`: `https://eventops-api.onrender.com/api/v1`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://eventops-api.onrender.com`
5. Click **Deploy**. Vercel will build and serve the Next.js Progressive Web App with automatic edge caching and HTTPS.

---

## 📄 License
This project is licensed under the MIT License.
