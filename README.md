# 🎪 EventOps — Unified Live Operations & Team Coordination Platform

> A Jira-inspired, multilingual on-ground event operations and team coordination Progressive Web App (PWA) and REST API built for high-stakes live productions, luxury destination weddings, and corporate summits.

![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)
![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)
![PWA](https://img.shields.io/badge/PWA-Offline_Ready-purple.svg)
![WCAG](https://img.shields.io/badge/WCAG_2.2-Level_AA-success.svg)
![Tests](https://img.shields.io/badge/Tests-43%2F43_Passed-brightgreen.svg)

---

## 📋 Table of Contents
1. [Platform Overview](#-platform-overview)
2. [Key Differentiators & Problem Solved](#-key-differentiators--problem-solved)
3. [User Roles & Permissions Matrix](#-user-roles--permissions-matrix)
4. [System Architecture & Tech Stack](#-system-architecture--tech-stack)
5. [Feature Catalog — What Each Feature Does](#-feature-catalog--what-each-feature-does)
   - [1. Authentication & Instant Multi-Role Demo Logins](#1-authentication--instant-multi-role-demo-logins)
   - [2. Multi-Tenant Organization Management](#2-multi-tenant-organization-management)
   - [3. Event Lifecycle & 4-Step Creation Wizard](#3-event-lifecycle--4-step-creation-wizard)
   - [4. Operational Team & Crew Management](#4-operational-team--crew-management)
   - [5. 7-State Task Engine, Microtasks & Dependency Locks](#5-7-state-task-engine-microtasks--dependency-locks)
   - [6. Two-Tier Evidence Pipeline & Proof Verification](#6-two-tier-evidence-pipeline--proof-verification)
   - [7. Real-Time Communications & Comms Engine (Socket.IO)](#7-real-time-communications--comms-engine-socketio)
   - [8. Live Operations Command Center & Timeline](#8-live-operations-command-center--timeline)
   - [9. QR Code Attendee Management & Contactless Check-In](#9-qr-code-attendee-management--contactless-check-in)
   - [10. High-Contrast Event Day Mode (Outdoor Operations)](#10-high-contrast-event-day-mode-outdoor-operations)
   - [11. Progressive Web App (PWA) & Offline-First Sync Architecture](#11-progressive-web-app-pwa--offline-first-sync-architecture)
   - [12. Trilingual Multilingual Engine (English, Hindi, Marathi)](#12-trilingual-multilingual-engine-english-hindi-marathi)
   - [13. WCAG 2.2 Level AA Accessibility & Responsive Design System](#13-wcag-22-level-aa-accessibility--responsive-design-system)
   - [14. Cross-Event Global Tasks & Team Directory](#14-cross-event-global-tasks--team-directory)
6. [REST API Reference](#-rest-api-reference)
7. [WebSocket Real-Time Events](#-websocket-real-time-events)
8. [Database Schema & Entity Models](#-database-schema--entity-models)
9. [Zero-Cost Infrastructure Blueprint](#-zero-cost-infrastructure-blueprint)
10. [Local Development & Quickstart](#-local-development--quickstart)
11. [Testing & Quality Assurance](#-testing--quality-assurance)
12. [Production Deployment Guide](#-production-deployment-guide)
13. [License](#-license)

---

## 🌟 Platform Overview

Live events such as luxury weddings, large conferences, and concerts fail when on-ground coordination breaks down between central management, specialized department leads, and floor workers. Standard project management tools (Jira, Asana, Monday) are designed for desk workers behind laptops, while consumer messaging apps (WhatsApp, Telegram) bury critical task updates, blockers, and sign-offs in chaotic chat streams.

**EventOps** bridges this divide by providing an intuitive, outdoor-ready, mobile-first operations hub designed specifically for fast-paced event execution:

- **Free-Form Team Creation**: Event Managers can create and name teams **anything** they need without rigid system taxonomies (*"Catering & Hospitality"*, *"Floral Mandap Staging"*, *"DJ & Overhead AV"*, *"VIP Golf Carts"*, *"Drone Coverage"*).
- **Two-Tier Delegation**: Managers assign high-level parent milestones; Team Leads break them into actionable microtasks assigned to individual crew members.
- **Proof-Gated Sign-Off**: Work cannot be marked complete without photographic, video, or document evidence reviewed and approved by leads and managers.
- **Offline Reliability**: Works seamlessly when cellular connectivity drops on crowded showgrounds via an IndexedDB offline queue and automatic background synchronization.
- **Zero-Friction Role Exploration**: 1-click Instant Demo Login buttons enable immediate testing as an **Event Manager**, **Team Lead**, or **Field Crew Member**.

---

## 💡 Key Differentiators & Problem Solved

| Traditional Issue on Event Day | How EventOps Solves It |
| :--- | :--- |
| **"Is the mandap done?"** Manager has to call lead; lead has to search for crew. | **Evidence Pipeline**: Crew uploads a photo via the app; lead approves; manager sees instant visual verification on their dashboard. |
| **Spotty cellular network** in basements or crowded banquets prevents task updates. | **IndexedDB Offline Queue**: Crew marks tasks, acknowledges assignments, or logs blockers offline; changes automatically sync when connectivity returns. |
| **Blinding outdoor sunlight** makes standard white web interfaces impossible to read. | **Event Day Mode**: Glare-resistant `#020617` dark UI with vivid accents and 52px+ touch targets optimized for thumbs and gloved hands. |
| **Critical blocker messages** get lost in 500-message group chats. | **1-Tap Blocker Alerts**: Crew marks a task `BLOCKED` with an explicit reason; immediate visual red alert cascades to lead and manager dashboards. |
| **Multilingual workforce**: Leads and workers speak Hindi, Marathi, or English. | **Trilingual Interface**: Full i18n support for English, Hindi (हिन्दी), and Marathi (मराठी) with auto-detection and persistent user preference. |

---

## 👥 User Roles & Permissions Matrix

The platform enforces strict role-based access control (RBAC) across both organization-level and event-level scopes:

| Capability | Organization Owner / Event Manager | Team Lead | Crew / Team Member | Configurable Permission Flag |
| :--- | :---: | :---: | :---: | :--- |
| **Create and configure events** | ✅ | ❌ | ❌ | Fixed |
| **Create & delete operational teams** | ✅ | ❌ | ❌ | Fixed |
| **Assign parent milestone tasks** | ✅ | ❌ | ❌ | Fixed |
| **Create & delegate microtasks** | ✅ | ✅ | ❌ | `allowLeadTaskCreation` |
| **Acknowledge assigned tasks** | ✅ | ✅ | ✅ | Standard |
| **Start task & mark in-progress** | ✅ | ✅ | ✅ | Standard |
| **Report on-ground blockers** | ✅ | ✅ | ✅ | Standard |
| **Upload photo/video evidence** | ✅ | ✅ | ✅ | Standard |
| **First-tier review of crew proof** | ✅ | ✅ | ❌ | `requireLeadReviewFirst` |
| **Final manager task sign-off** | ✅ | ❌ | ❌ | Fixed |
| **Self-assign unassigned tasks** | ✅ | ✅ | ❌ / ✅ | `allowWorkerSelfAssignment` |
| **Global venue-wide chat** | ✅ | ✅ | ✅ / ❌ | `allowWorkersGlobalChat` |
| **Internal team chat** | ✅ | ✅ | ✅ / ❌ | `allowWorkersTeamChat` |
| **QR code attendee check-in** | ✅ | ✅ | ✅ | Standard |
| **Configure event access rules** | ✅ | ❌ | ❌ | Fixed |

---

## 🏗️ System Architecture & Tech Stack

EventOps is architected as a modular TypeScript monorepo with clean separation between client, server, and shared data contracts:

```
Event_Operations_Platform_Master/
├── backend/                             # Node.js + Express + Socket.IO REST & Real-time Server
│   ├── src/
│   │   ├── config/                      # MongoDB connection & environment configuration
│   │   ├── constants/                   # Operational enums (TaskStatus, EventRole, OrgRole, etc.)
│   │   ├── controllers/                 # REST controllers (Auth, Events, Teams, Tasks, Evidence, Chat, etc.)
│   │   ├── middlewares/                 # JWT auth, RBAC guards, Multer file upload, Rate limiters
│   │   ├── models/                      # Mongoose schemas with validation, indexes & audit logging
│   │   ├── routes/                      # Express route definitions under /api/v1
│   │   ├── sockets/                     # Socket.IO connection manager, rooms & event broadcasters
│   │   └── utils/                       # JWT, VAPID push, sanitize, and auto-seeding utilities
│   ├── tests/                           # Vitest integration test suite (43 tests, 9 suites)
│   └── seeds/                           # Comprehensive operational seed script for luxury events
│
├── frontend/                            # Next.js 14 App Router + Tailwind CSS Progressive Web App
│   ├── public/
│   │   ├── icons/                       # PWA icons (192x192, 512x512, maskable, apple-touch-icon)
│   │   ├── locales/                     # Trilingual dictionaries (en/, hi/, mr/)
│   │   ├── sw.js                        # PWA Service Worker (App shell + Push + Cache + Fallback)
│   │   └── manifest.json                # Web App Manifest
│   ├── src/
│   │   ├── app/                         # App Router pages (/home, /events, /tasks, /day-mode, etc.)
│   │   ├── components/                  # UI components (tasks, teams, chat, check-in, layout)
│   │   ├── contexts/                    # React Contexts (AuthContext, EventContext, ThemeContext)
│   │   ├── hooks/                       # Real-time Socket.IO and media hooks
│   │   ├── lib/                         # Axios client, i18n, and IndexedDB offline queue
│   │   └── shared/types/                # Local mirrored TypeScript contracts for Docker builds
│
└── shared/
    └── types/                           # Monorepo-wide shared TypeScript interfaces
```

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript 5.7, Tailwind CSS, Lucide React, HTML5 Canvas API, Web Audio API (`MediaRecorder`).
- **Backend**: Node.js 22, Express 4, TypeScript 5.7, Socket.IO 4, Mongoose 8, Multer, bcryptjs, web-push.
- **Database**: MongoDB 7.0 (Docker) / MongoDB Atlas (Cloud) with compound indexes and unique constraints.
- **PWA & Offline**: Web App Manifest, Service Worker Cache API, IndexedDB (`idb`), Web Push (VAPID).
- **Testing & Quality**: Vitest, Supertest, mongodb-memory-server, Playwright E2E, axe-core (WCAG 2.2 AA).
- **Containerization**: Docker & Docker Compose multi-stage builds.

---

## ⚡ Feature Catalog — What Each Feature Does

### 1. Authentication & Instant Multi-Role Demo Logins
- **Email & Password Authentication**: Standard JWT-based sign-in and registration with password hashing (`bcryptjs`, 10 salt rounds) and brute-force rate limiting (`loginRateLimiter`, 10 attempts/min/IP).
- **1-Click Instant Demo Logins**:
  - **Manager (Vikram)**: Logs in as Event Manager with full administrative access across organizations, events, teams, and settings.
  - **Team Lead (Chef Sharma)**: Logs in as Catering & Hospitality Team Lead with department review and task delegation privileges.
  - **Member (Manoj)**: Logs in as Stage Decoration & Floral Crew Member with task acknowledgment, evidence submission, and team comms access.
- **Automated Self-Healing Demo Data (`ensureDemoData.ts`)**: On server startup, the backend idempotently verifies that the 3 demo accounts, organization, baseline events (*"The Grand Heritage Palace Wedding"*, *"TechConnect 2026"*), teams, tasks, and attendees exist, ensuring fresh Docker or local boots work immediately out-of-the-box.

### 2. Multi-Tenant Organization Management
- **Tenant Isolation**: Every event, task, attendee, and team belongs to an `Organization`. Strict middleware guards prevent cross-tenant data leakage.
- **Organization Roles**: `OWNER`, `ADMIN`, and `MEMBER`.
- **Custom Organization Settings**: Toggleable organization-wide defaults for member direct chats and evidence approval policies.

### 3. Event Lifecycle & 4-Step Creation Wizard
- **Event Status Engine**: Events progress through 5 distinct operational stages:
  - `planning`: Early preparation and venue booking.
  - `live_setup`: Physical on-site staging and vendor arrival.
  - `in_progress`: The event is currently underway.
  - `completed`: Event concluded; post-event teardown underway.
  - `archived`: Read-only historical record (new task creation is blocked; cannot archive while unresolved tasks remain).
- **4-Step Interactive Creation Wizard (`/events/create`)**:
  1. *Details*: Event name, event type (Wedding, Conference, Concert, Exhibition, Corporate, Sports, Private), and rich description.
  2. *Venue & Schedule*: Start date/time, end date/time, venue name, address, location details, event mode (in-person, hybrid, virtual), and operational zones.
  3. *Registration & Capacity*: Toggle public registration, maximum guest capacity, approval requirements, check-in gates, and entry requirements (e.g. Government ID, QR badge).
  4. *Review & Launch*: Summary preview with cover imagery selection and immediate workspace creation.
- **Operational Zones**: Flexible venue zoning (*"Main Stage"*, *"Royal Dining Lawns"*, *"VIP Lounge"*, *"Entry Archway"*) enabling localized task filtering.

### 4. Operational Team & Crew Management
- **Unrestricted Team Naming**: Event Managers can create custom teams with arbitrary naming, department descriptions, brand colors, and Lucide icons.
- **Lead Assignment & Crew Roster**: Assign a dedicated Team Lead and add crew members. If a new lead is assigned, the previous lead is automatically demoted to team member.
- **Automated Unassignment on Removal**: If a worker is removed from a team, their incomplete tasks are automatically unassigned and logged in the audit trail.
- **Workload Analytics**: Live counts of assigned tasks, completed tasks, and high-load warning triggers for overloaded staff.

### 5. 7-State Task Engine, Microtasks & Dependency Locks
- **Strict 7-State Operational State Machine**:
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
- **Parent Milestone to Microtask Breakdown**: Managers create high-level parent tasks; Team Leads break them down into granular microtasks assigned to individual floor workers.
- **Parent Completion Lock**: A parent task cannot be marked `COMPLETED` while any of its child microtasks remain open.
- **Prerequisite Dependency Locks**: Tasks with defined dependencies cannot transition to `IN_PROGRESS` until all prerequisite tasks are completed.
- **Fast Blocker Escalation**: 1-tap blocker reporting capturing the exact bottleneck reason (e.g., *"Power generator tripped in Lawn B"*), immediately flagging the task red across all dashboards.
- **Anti-Spam Rapid Creation Guard**: Prevents duplicate task creation within rapid succession windows.
- **Immutable Audit Trail (`TaskActivity`)**: Every state transition, assignment change, blocker report, rework note, and proof submission is permanently logged with timestamps and actor IDs.

### 6. Two-Tier Evidence Pipeline & Proof Verification
- **Multi-Media Evidence**: Supports photographic proof (`PHOTO`), video clips (`VIDEO`), voice memos (`AUDIO`), and documents (`DOCUMENT`).
- **Client-Side Canvas Compression**: Automatically resizes and compresses high-resolution smartphone camera photos in the browser before upload, slashing 15MB images to ~300KB for rapid upload over congested cellular networks.
- **Two-Tier Review Workflow**:
  - Crew member submits photo evidence and changes task status to `SUBMITTED_FOR_REVIEW`.
  - Team Lead conducts first-tier review: inspects high-res media in an image lightbox, approves proof, or requests rework with specific guidance.
  - Event Manager performs final operational verification.
- **Evidence Completion Lock**: Tasks flagged with `evidenceRequired: true` cannot transition to `COMPLETED` until approved evidence meets the `minEvidenceCount`.
- **Self-Approval Prevention**: Field workers are strictly blocked from approving their own submitted evidence.

### 7. Real-Time Communications & Comms Engine (Socket.IO)
- **3-Tier Channel Partitioning**:
  - `GLOBAL_EVENT`: Venue-wide announcements accessible to all event staff.
  - `TEAM_INTERNAL`: Private department channel for team leads and crew members.
  - `MANAGER_TEAM`: Dedicated coordination channel between the Event Manager and department leads.
- **In-App Voice Notes**: Built-in audio recorder using the browser `MediaRecorder` API with recording timers, waveform previews, and custom HTML5 audio playback.
- **Interactive Task Deep Links**: Messages can embed specific task links, rendering live task preview cards directly in the chat feed.
- **Real-Time Delivery**: Instant message broadcasting, typing indicators, and room authorization checks via WebSockets.

### 8. Live Operations Command Center & Timeline
- **Real-Time Activity Feed (`ActivityFeed.tsx`)**: Chronological streaming feed of on-ground actions (task completions, blocker alerts, evidence uploads, check-ins) powered by `activity:new` Socket.IO events.
- **Staff Workload & Capacity Matrix (`WorkloadMatrix.tsx`)**: Visual capacity grid showing active task counts per worker, with **HIGH LOAD** warning badges for personnel with >3 concurrent active tasks.
- **4-Slot Timeline Schedule View (`TimelineView.tsx`)**: Organizes the day's tasks into operational time horizons (*Morning Staging*, *Afternoon Tech Checks*, *Evening Main Event*, *Night Teardown*).
- **Executive Metrics**: Live tallies for open tasks, critical blockers, pending reviews, verified tasks, and attendee arrival velocity.

### 9. QR Code Attendee Management & Contactless Check-In
- **Digital Ticket Generation**: Generates unique ticket codes (e.g. `EO-W101`, `TC-101`) and cryptographically formatted QR payloads (`EVENTOPS:<eventId>:<ticketCode>`).
- **Guest Categorization**: Tracks ticket types (`VIP`, `General`, `Speaker`, `Staff`) with arrival status (`registered`, `checked_in`, `cancelled`).
- **Live Video QR Scanner**: In-browser camera scanning with front/rear camera switching, video feed mirroring, and torch/flashlight toggling.
- **Manual Ticket Lookup**: Fallback search bar allowing staff to check in attendees by name, email, or ticket code.
- **Offline Check-In with Idempotency Keys**: Generates UUID idempotency keys for check-ins performed offline, preventing duplicate check-in counts when synchronized with the server.

### 10. High-Contrast Event Day Mode (Outdoor Operations)
- **Glare-Resistant Dark Palette**: Designed for harsh outdoor sunlight and night stages with a `#020617` base and high-visibility neon accents (amber `#F59E0B`, emerald `#10B981`, red `#EF4444`).
- **Thumb-Optimized 52px+ Touch Targets**: All primary buttons and action controls meet or exceed 52px height for easy tapping with one hand, while on the move, or wearing rigging gloves.
- **Milestone Countdown Ticker**: Dynamic live countdown to major event milestones (e.g. *"Showtime in 02:45:12"*).
- **1-Tap Blocker Modal**: Dedicated prominent blocker button allowing crew to notify leadership of critical issues in seconds.
- **Floating Voice SOS Button**: One-touch voice recording floating trigger for urgent audio alerts.

### 11. Progressive Web App (PWA) & Offline-First Sync Architecture
- **Web App Manifest (`manifest.json`)**: Full PWA support with standalone display mode, orientation locking, theme colors, and custom icon sets (192x192, 512x512, maskable).
- **Service Worker (`sw.js`)**:
  - *CacheFirst*: Instant loading of static assets, fonts, icons, and shell templates.
  - *NetworkFirst with Offline Fallback*: API calls attempt network retrieval and fall back gracefully when offline.
- **IndexedDB Mutation Queue (`offlineQueue.ts`)**: When cellular or Wi-Fi connectivity drops, status changes, acknowledgments, and blocker notes are queued in browser storage.
- **Auto-Sync Engine**: Automatically detects network recovery via the `online` window event, flushes queued operations sequentially, and surfaces a sync notification banner.
- **Zero-Cost Web Push Notifications**: Uses standard browser VAPID keys via `web-push` to deliver push alerts for assignments, blocker alerts, and rework requests without SMS or third-party fees.

### 12. Trilingual Multilingual Engine (English, Hindi, Marathi)
- **Three Supported Languages**: Full localization for **English**, **Hindi (हिन्दी)**, and **Marathi (मराठी)**.
- **100% UTF-8 Fidelity**: Devanagari script for task titles, descriptions, venue zones, and chat messages is preserved with zero data corruption.
- **User Preference Sync**: Preferred language is stored in user profiles (`preferredLanguage`) and synced to `localStorage`, automatically applying upon login.

### 13. WCAG 2.2 Level AA Accessibility & Responsive Design System
- **0 axe-core Violations**: Audited and verified with Playwright and `axe-core` across all primary pages.
- **Color Contrast Ratios**: Strict compliance with WCAG 2.2 AA (minimum 4.5:1 for normal text, 3:1 for large text and graphical UI elements).
- **Full Keyboard Navigability**: Logical tab ordering, prominent visible focus indicators (`ring-2 ring-primary-500`), and skip navigation links.
- **Screen Reader Support**: Semantic HTML landmarks (`<main>`, `<nav>`, `<aside>`, `<header>`), descriptive `aria-label` attributes on icon-only buttons, and `aria-live` announcement regions for dynamic alerts.
- **Responsive Layout**: Fluid experience across 4K desktop displays, tablets, mobile browsers, and installed standalone PWAs.

### 14. Cross-Event Global Tasks & Team Directory
- **Global Tasks Dashboard (`/tasks`)**: Cross-event task overview for staff working across multiple concurrent events, with personal assigned filters, status tabs, and priority sorting.
- **Organization Team Directory (`/team`)**: Central directory of all organization members, their roles, contact details, language preferences, and active event assignments.
- **Operational Resources Catalog (`/resources`)**: Centralized repository for staging guidelines, vendor contracts, venue layout PDFs, and technical equipment manuals.

---

## 🔌 REST API Reference

All REST endpoints are prefixed with `/api/v1` and return standardized JSON responses:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional status message"
}
```

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/register` | Register a new user and organization | No |
| `POST` | `/auth/login` | Authenticate user and receive JWT | No (Rate limited) |
| `GET` | `/auth/me` | Retrieve profile and active organizations | Yes |
| `PATCH`| `/auth/language` | Update preferred language (`en`, `hi`, `mr`) | Yes |

### Events (`/api/v1/events`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/events` | List events belonging to user's organization | Yes |
| `POST` | `/events` | Create a new event workspace (4-step metadata) | Yes (Manager) |
| `GET` | `/events/:id` | Get event details, zones, and permissions | Yes |
| `PATCH`| `/events/:id` | Update event details or lifecycle status | Yes (Manager) |
| `PATCH`| `/events/:id/permissions` | Update configurable operational permissions | Yes (Manager) |
| `POST` | `/events/:id/archive` | Archive completed event (blocks if tasks open) | Yes (Manager) |

### Teams (`/api/v1/events/:eventId/teams`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/events/:eventId/teams` | List teams and members for an event | Yes |
| `POST` | `/events/:eventId/teams` | Create a new team with custom name and color | Yes (Manager) |
| `PATCH`| `/events/:eventId/teams/:teamId` | Update team details or reassign lead | Yes (Manager) |
| `DELETE`| `/events/:eventId/teams/:teamId` | Delete a team and unassign tasks | Yes (Manager) |
| `POST` | `/events/:eventId/teams/:teamId/members` | Add a worker to a team | Yes (Manager/Lead) |
| `DELETE`| `/events/:eventId/teams/:teamId/members/:userId` | Remove worker from team | Yes (Manager/Lead) |

### Tasks (`/api/v1/tasks`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/events/:eventId/tasks` | List tasks for an event with status/zone filters | Yes |
| `POST` | `/events/:eventId/tasks` | Create a parent milestone or microtask | Yes (Manager/Lead) |
| `GET` | `/tasks/:id` | Get task details, microtasks, and activity log | Yes |
| `PATCH`| `/tasks/:id/status` | Transition task status (Acknowledge, Start, etc.) | Yes |
| `POST` | `/tasks/:id/blocker` | Report an on-ground blocker with reason | Yes |
| `POST` | `/tasks/:id/resolve-blocker` | Clear blocker and return to in-progress | Yes |
| `PATCH`| `/tasks/:id/assign` | Assign or reassign task to a worker | Yes (Manager/Lead) |

### Evidence & Verification (`/api/v1/evidence`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/tasks/:taskId/evidence` | Upload photo/video evidence with notes | Yes |
| `GET` | `/tasks/:taskId/evidence` | List all evidence submitted for a task | Yes |
| `PATCH`| `/evidence/:id/review` | Approve evidence or request rework with notes | Yes (Manager/Lead) |

### Real-Time Chat (`/api/v1/chat`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/events/:eventId/conversations` | List accessible chat channels | Yes |
| `GET` | `/conversations/:id/messages` | Get paginated message history | Yes |
| `POST` | `/conversations/:id/messages` | Send text message or task deep link | Yes |
| `POST` | `/conversations/:id/voice-notes` | Upload voice note audio recording | Yes |

### Attendees & Check-In (`/api/v1/events/:eventId/attendees`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/events/:eventId/attendees` | List attendees with search & ticket filters | Yes |
| `POST` | `/events/:eventId/attendees` | Register new attendee with unique ticket code | Yes |
| `POST` | `/events/:eventId/check-in` | Execute QR code or ticket check-in | Yes |

### Operations & Dashboard (`/api/v1/dashboard`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/events/:eventId/dashboard/summary` | Live counts for tasks, blockers, attendees | Yes |
| `GET` | `/events/:eventId/dashboard/activities`| Chronological audit activity stream | Yes |
| `GET` | `/events/:eventId/dashboard/workload` | Staff capacity and active task distribution | Yes |

---

## 📡 WebSocket Real-Time Events

Real-time coordination is powered by Socket.IO over port `5000`:

| Event Name | Direction | Payload | Description |
| :--- | :---: | :--- | :--- |
| `join:event` | Client -> Server | `{ eventId }` | Joins event broadcast room |
| `join:conversation` | Client -> Server | `{ conversationId }` | Joins specific chat channel room |
| `message:new` | Server -> Client | `IMessageDoc` | Broadcasts new chat message or voice note |
| `task:updated` | Server -> Client | `{ taskId, status, assigneeId }` | Pushes task state change to all dashboards |
| `blocker:alert` | Server -> Client | `{ taskId, title, reason, zone }` | Fires high-priority red blocker alert |
| `evidence:submitted`| Server -> Client | `{ taskId, evidenceId }` | Notifies leads of pending proof review |
| `activity:new` | Server -> Client | `ITaskActivityDoc` | Appends real-time entry to Activity Feed |
| `attendee:checked_in`| Server -> Client | `{ attendeeId, ticketCode }` | Updates live check-in counter |

---

## 🗄️ Database Schema & Entity Models

EventOps utilizes MongoDB with Mongoose ODM:

```
┌─────────────────┐       ┌─────────────────┐
│  Organization   │◄──────┤      User       │
└────────┬────────┘       └────────┬────────┘
         │ 1                       │ 1
         │                         │
         ▼ *                       ▼ *
┌─────────────────┐       ┌─────────────────┐
│      Event      │◄──────┤ EventMembership │
└────────┬────────┘       └─────────────────┘
         │ 1
         ├───────────────────────────────┬───────────────────────────────┐
         ▼ *                             ▼ *                             ▼ *
┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
│      Team       │             │    Attendee     │             │  Conversation   │
└────────┬────────┘             └─────────────────┘             └────────┬────────┘
         │ 1                                                             │ 1
         ▼ *                                                             ▼ *
┌─────────────────┐                                             ┌─────────────────┐
│      Task       │                                             │     Message     │
└────────┬────────┘                                             └─────────────────┘
         │ 1
         ├───────────────────────────────┐
         ▼ *                             ▼ *
┌─────────────────┐             ┌─────────────────┐
│    Evidence     │             │  TaskActivity   │
└─────────────────┘             └─────────────────┘
```

- **User**: Name, email, hashed password, phone, preferredLanguage (`en`, `hi`, `mr`), active status.
- **Organization**: Name, unique slug, ownerId, settings (`allowMemberDirectChat`, `requireEvidenceApproval`).
- **OrganizationMembership**: Compound index `{ userId, orgId }`, role (`OWNER`, `ADMIN`, `MEMBER`).
- **Event**: Name, type, venue, schedule, status, zones, permissions flags, registrationConfig, managerId.
- **EventMembership**: Compound index `{ eventId, userId }`, role (`EVENT_MANAGER`, `TEAM_LEAD`, `TEAM_MEMBER`), teamId.
- **Team**: Name, description, eventId, leadId, memberIds array, colorHex, icon, active status.
- **Task**: Title, description, eventId, teamId, parentTaskId (nullable), status (7-state enum), priority, zone, assigneeId, creatorId, dueTime, dependencies, evidenceRequired, minEvidenceCount.
- **Evidence**: TaskId, uploaderId, mediaType (`PHOTO`, `VIDEO`, `AUDIO`, `DOCUMENT`), fileUrl, reviewStatus (`PENDING`, `APPROVED`, `REJECTED`, `CLARIFICATION_REQUESTED`), reviewerId, notes.
- **Attendee**: Name, email, phone, eventId, ticketCode, qrPayload, ticketType (`General`, `VIP`, `Speaker`, `Staff`), status (`registered`, `checked_in`, `cancelled`), checkedInAt, idempotencyKey.
- **Conversation**: EventId, type (`GLOBAL_EVENT`, `TEAM_INTERNAL`, `MANAGER_TEAM`), teamId, participantIds array.
- **Message**: ConversationId, senderId, messageType (`TEXT`, `PHOTO`, `VOICE_NOTE`, `TASK_LINK`), content, mediaUrl, taskLink.
- **TaskActivity**: Immutable audit document with taskId, actorId, action, previousValue, newValue, reason.

---

## 💰 Zero-Cost Infrastructure Blueprint

EventOps is verified to run 100% free on production-grade cloud tiers:

| Service Layer | Free Provider | Free Tier Limits | EventOps Architecture Compliance |
| :--- | :--- | :--- | :--- |
| **Frontend & PWA** | **Vercel** | 100 GB bandwidth / month, unlimited deployments | Pre-rendered static app shell + dynamic API client |
| **Backend & WebSockets**| **Render** | 750 free instance hours / month | Lightweight Node.js + Express + Socket.IO server |
| **Database** | **MongoDB Atlas** | M0 Sandbox: 512 MB storage, shared RAM | Efficient indexing, capped audit history |
| **Media Storage** | Local Disk / Object Store | Free tier storage / local disk volume | Client-side compression drops photos to ~300KB |
| **Push Notifications** | Web Push (VAPID) | Unlimited browser push alerts | Standard Web Push API (no SMS/WhatsApp costs) |
| **Maps / Location** | Free Zone Strings | No Google Maps API requirement | Free-form zone strings (*"Main Stage"*, *"Dining Lawns"*) |

---

## 🚀 Local Development & Quickstart

### Prerequisites
- **Node.js**: v20+ or v22+
- **npm**: v10+
- **Docker & Docker Compose** (Optional, for containerized run)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or free MongoDB Atlas URI

---

### Option A: Running with Docker Compose (Recommended)

Start the complete stack (MongoDB 7.0 + Backend API + Frontend Next.js PWA) in one command:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/event-operations-platform.git
cd event-operations-platform

# 2. Build and run containers in detached mode
docker compose up --build -d

# 3. Verify running containers
docker compose ps
```

The services will be available at:
- **Frontend PWA**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **API Health Check**: [http://localhost:5000/health](http://localhost:5000/health)
- **MongoDB**: `localhost:27017`

---

### Option B: Running Natively with Node.js

#### 1. Setup Backend
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Ensure MONGODB_URI and JWT_SECRET are set in backend/.env

# Compile TypeScript
npm run build

# Start development server on port 5000
npm run dev
```

#### 2. Setup Frontend
```bash
# In a new terminal window
cd frontend

# Install dependencies
npm install

# Start Next.js development server on port 3000
npm run dev
```

---

### Default Instant Demo Credentials

The backend automatically provisions these verified demo accounts on boot:

| Role | Demo Button Label | Email | Password |
| :--- | :--- | :--- | :--- |
| **Event Manager** | `Manager (Vikram)` | `manager@royalweddings.com` | `Password@123` |
| **Team Lead** | `Team Lead (Chef Sharma)` | `lead.catering@royalweddings.com` | `Password@123` |
| **Crew Member** | `Member (Manoj)` | `member.stage@royalweddings.com` | `Password@123` |

Additional pre-configured team lead accounts:
- Decor Lead: `lead.decor@royalweddings.com` / `Password@123`
- AV & Lights Lead: `lead.av@royalweddings.com` / `Password@123`
- Camera Lead: `lead.camera@royalweddings.com` / `Password@123`
- Logistics Lead: `lead.logistics@royalweddings.com` / `Password@123`

---

## 🧪 Testing & Quality Assurance

### Vitest Backend Integration Test Suite
The backend features an isolated integration test suite executed against an in-memory MongoDB runner (`mongodb-memory-server`):

```bash
cd backend
npm test
```

#### Verified Results:
```
 ✓ tests/integration/qa_100_verification.test.ts (24 tests)
 ✓ tests/integration/tasks.test.ts (2 tests)
 ✓ tests/integration/attendees_dashboard.test.ts (4 tests)
 ✓ tests/integration/phase5_phase6.test.ts (3 tests)
 ✓ tests/integration/evidence.test.ts (1 test)
 ✓ tests/integration/chat.test.ts (1 test)
 ✓ tests/integration/events.test.ts (2 tests)
 ✓ tests/integration/auth.test.ts (4 tests)
 ✓ tests/integration/demo_seed.test.ts (2 tests)

 Test Files  9 passed (9)
      Tests  43 passed (43)
```

### End-to-End & Accessibility Audits
- **WCAG 2.2 Level AA**: Audited using Playwright and `axe-core`, achieving **0 accessibility violations**.
- **Playwright E2E Flow**: Full verification of login, event creation, task microtask decomposition, photo evidence review, QR attendee check-in, and offline queue synchronization.

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
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGODB_URI`: `mongodb+srv://<user>:<password>@cluster0.mongodb.net/eventops?retryWrites=true&w=majority`
   - `JWT_SECRET`: `<secure-random-32-char-string>`
   - `CORS_ORIGIN`: `https://your-frontend-app.vercel.app`
5. Click **Deploy Web Service** and copy your URL (e.g. `https://eventops-api.onrender.com`).

---

### Deploying Frontend to Vercel
1. Create a free account at [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project** and import your repository.
3. Set the **Root Directory** to `frontend`.
4. In **Environment Variables**, set:
   - `NEXT_PUBLIC_API_URL`: `https://eventops-api.onrender.com/api/v1`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://eventops-api.onrender.com`
5. Click **Deploy**. Vercel will build and serve the Progressive Web App with automatic edge caching and HTTPS.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
