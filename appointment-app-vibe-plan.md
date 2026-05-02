# APPOINTMENT APP — VIBE CODING MASTER PLAN
## The Perfect Booking System | Odoo Hackathon
### Complete Copy-Paste Plan for Claude Code / Antigravity

---

> **How to use this doc:** Feed each Phase prompt to your vibe coding platform as a single message. Each prompt is self-contained. Start a new context only when explicitly told to. Never skip a phase — each builds on the previous.

---

## DESIGN REVIEW & IMPROVEMENTS

### What the original spec got right
- Prisma schema is well-normalized — no JSON blobs for structured data
- Slot engine logic (generate → subtract bookings → return remaining) is correct
- Double booking prevention via `prisma.$transaction` is the right call
- Sarvam AI integration is clean (STT → Chat → TTS in one service file)
- Redis for JWT blacklist + OTP TTL is production-correct

### Design Decisions Improved in This Plan

#### 1. Payment Flow (Added Mock)
The original spec mentions `requiresAdvancePayment` and `advancePaymentAmount` in the schema but never defines the payment step UI or flow. **Fix:** Added a full mock payment step between the Questions Form and Confirmation pages. Mock accepts any card (Stripe-style UI) and always succeeds — sets `paymentStatus: "PAID"` in the booking. No real payment gateway. Judges see a real flow, not a missing screen.

#### 2. Booking Flow Sequence Fix
Original flow: Select Service → Date/Slot → Questions → Confirm.
**Improved flow:**
```
Select Service → Select Provider (if multiple) → Date Picker → Slot Grid
  → Capacity Selector (if enabled) → Questions Form
  → [Payment Screen if advance payment ON] → Confirmation Page
```
The provider selection was buried — it's now a dedicated step before the calendar.

#### 3. Slot Locking with Redis (Added)
Original spec mentions Redis for JWT blacklist but not slot locking. Race condition risk: two users simultaneously passing the capacity check before either commits. **Fix:** Add a 5-minute Redis lock key `slot_lock:{serviceId}:{startTime}:{resourceId}` acquired before the Prisma transaction, released after. Eliminates TOCTOU race even before the DB transaction kicks in.

#### 4. OTP Flow Clarification
Original spec says "return otpToken" from signup. This was ambiguous. **Clarified:** `otpToken` is a short-lived Redis key reference (UUID), not the OTP itself. The OTP (6-digit number) is stored in Redis under `otp:{otpToken}` with 5-min TTL. The `otpToken` UUID is returned to the client and sent back with the OTP on verify — prevents brute force enumeration.

#### 5. Reschedule Flow Fix
Original spec allowed reschedule to change "only date/time" but didn't enforce same-service constraint at the API level. **Fix:** `PATCH /bookings/:id/reschedule` explicitly rejects if `appointmentTypeId` in body differs from existing booking. Also creates a `RESCHEDULED` audit log entry with `metadata: { oldStart, newStart }`.

#### 6. Working Hours vs. Flexible Slots Edge Case
If `slotScheduleType = FLEXIBLE` but no `FlexibleSlot` records exist for that date, the original spec would return an empty array silently. **Fix:** Slot service returns `{ slots: [], message: "No slots configured for this date" }` — frontend shows a dedicated empty state instead of a blank grid.

#### 7. Capacity Selector UX
Original spec: capacity selector shown "if manageCapacity is enabled." Didn't specify min/max UI. **Fix:** CapacitySelector is a stepper input (- / count / +) capped at `Math.min(availableCapacity, 10)`. Shows "X spots remaining" label that updates as slots are selected.

#### 8. AI Session Expiry
Original spec stored AI sessions in DB with no expiry. **Fix:** Sessions older than 24 hours are soft-expired — the system starts a fresh session but shows "Starting new conversation" in the chat widget. Prevents infinite context growth crashing Sarvam's token limit.

#### 9. Admin Can Also Book (Not Just Customer)
Original RBAC matrix said `POST /bookings → CUSTOMER, ORGANISER, ADMIN`. But Admin booking on behalf of a customer wasn't modeled. **Fix:** Admin can pass optional `customerId` in booking body to book on behalf of someone — useful for phone bookings. Audit log records `actorId: adminId` + `metadata: { bookedOnBehalfOf: customerId }`.

#### 10. Confirmation Code Display
Original confirmation page showed `confirmationCode` but no copy button. **Fix:** Confirmation code displayed in a monospace pill with a one-click copy icon (lucide `Copy`), shows "Copied!" toast for 2 seconds.

---

## COMPLETE FILE STRUCTURE

Every file in the project, annotated with its purpose. Use this as a checklist — every file here must exist before the demo.

```
appointment-app/
├── docker-compose.yml                        # Postgres 15 + Redis 7 containers
├── .env.example                              # All env vars documented (no real secrets)
├── .gitignore                                # node_modules, .env, dist, .next
├── package.json                             # Workspace root — concurrently scripts
│
├── apps/
│   │
│   ├── api/                                 # Express + TypeScript backend
│   │   ├── package.json                     # Backend deps + prisma seed script ref
│   │   ├── tsconfig.json                    # Strict mode, commonjs, outDir: dist
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma                # Full DB schema (see DATABASE SCHEMA section)
│   │   │   ├── migrations/                  # Auto-generated by prisma migrate dev
│   │   │   └── seed.ts                      # Demo data: 4 users, 2 services, 8 bookings
│   │   │
│   │   └── src/
│   │       ├── index.ts                     # Express app bootstrap, middleware chain, route mounts
│   │       │
│   │       ├── config/
│   │       │   ├── env.ts                   # Zod env validation — throws on missing vars at startup
│   │       │   ├── database.ts              # Prisma client singleton (global for hot-reload safety)
│   │       │   └── redis.ts                 # ioredis client singleton + connection logging
│   │       │
│   │       ├── middleware/
│   │       │   ├── auth.ts                  # JWT verify from cookie/header + Redis blacklist check
│   │       │   ├── rbac.ts                  # requireRole(...roles) factory — throws 403 if mismatch
│   │       │   ├── validate.ts              # Zod schema middleware: validate(schema) → 422 on fail
│   │       │   ├── errorHandler.ts          # Global error handler: ApiError, Prisma P2002, Zod, 500
│   │       │   └── rateLimiter.ts           # authLimiter (10/15min) + generalLimiter (100/min)
│   │       │
│   │       ├── routes/
│   │       │   ├── auth.routes.ts           # /api/auth — signup, verify-otp, login, logout, me
│   │       │   ├── users.routes.ts          # /api/users — CRUD, role management [Admin]
│   │       │   ├── services.routes.ts       # /api/services — CRUD + sub-resources (hours, slots, questions)
│   │       │   ├── slots.routes.ts          # /api/slots/available — slot generation engine endpoint
│   │       │   ├── bookings.routes.ts       # /api/bookings — create, cancel, reschedule, status updates
│   │       │   ├── analytics.routes.ts      # /api/analytics — summary, trend, peak-hours, utilization
│   │       │   └── ai.routes.ts             # /api/ai — chat, voice (multer), confirm-booking
│   │       │
│   │       ├── controllers/
│   │       │   ├── auth.controller.ts       # Thin: calls service → sets cookies → returns response
│   │       │   ├── users.controller.ts      # CRUD + activate/deactivate + role change
│   │       │   ├── services.controller.ts   # CRUD + publish toggle + share token
│   │       │   ├── slots.controller.ts      # Calls slot.service.generateAvailableSlots()
│   │       │   ├── bookings.controller.ts   # Create + lifecycle actions + export CSV
│   │       │   ├── analytics.controller.ts  # Calls analytics.service, returns JSON
│   │       │   └── ai.controller.ts         # Chat, voice round-trip, confirm-booking
│   │       │
│   │       ├── services/
│   │       │   ├── auth.service.ts          # signup, verifyOtp, login, logout, forgotPassword, reset
│   │       │   │                            # generateTokens(), setAuthCookies(), OTP → Redis
│   │       │   ├── slot.service.ts          # ★ CRITICAL: generateAvailableSlots()
│   │       │   │                            # Weekly + Flexible schedule logic, capacity subtraction
│   │       │   ├── booking.service.ts       # ★ CRITICAL: createBooking() with Redis lock + Prisma tx
│   │       │   │                            # cancelBooking(), rescheduleBooking(), status transitions
│   │       │   ├── ai.service.ts            # speechToText(), chatWithAI(), textToSpeech()
│   │       │   │                            # buildSystemPrompt(), extractBookingAction(), session mgmt
│   │       │   └── analytics.service.ts     # getSummary(), getPeakHours(), getTrend(), getByService()
│   │       │                                # getProviderUtilization() — all raw Prisma aggregate queries
│   │       │
│   │       ├── validators/
│   │       │   ├── auth.validator.ts        # signupSchema, verifyOtpSchema, loginSchema, resetSchema
│   │       │   ├── service.validator.ts     # createServiceSchema, workingHoursSchema, flexibleSlotSchema
│   │       │   ├── booking.validator.ts     # createBookingSchema, rescheduleSchema, cancelSchema
│   │       │   └── slot.validator.ts        # availableSlotsQuerySchema (serviceId, date, resourceId?)
│   │       │
│   │       └── utils/
│   │           ├── logger.ts                # Winston: JSON in prod, colorized in dev
│   │           ├── ApiError.ts              # ApiError(statusCode, message, errors?) extends Error
│   │           └── asyncHandler.ts          # (fn) => (req, res, next) => Promise.resolve(fn).catch(next)
│   │
│   └── web/                                 # Next.js 14 App Router frontend
│       ├── package.json                     # Frontend deps
│       ├── tsconfig.json                    # Strict, path alias @/*
│       ├── tailwind.config.ts               # Extended with brand colors, Plus Jakarta Sans
│       ├── next.config.js                   # Image domains, env vars
│       ├── middleware.ts                    # Route protection: redirect /dashboard → /login if no cookie
│       │
│       ├── app/
│       │   ├── layout.tsx                   # Root layout: ThemeProvider, QueryClientProvider, Toaster
│       │   ├── globals.css                  # ★ Brand design system: CSS vars, slot pills, status badges
│       │   │
│       │   ├── (auth)/                      # Auth pages — NO sidebar, centered layout
│       │   │   ├── layout.tsx               # Centered card layout, logo at top
│       │   │   ├── login/
│       │   │   │   └── page.tsx             # Email + password form, forgot password link
│       │   │   └── signup/
│       │   │       └── page.tsx             # Step 1: name/email/password/role → Step 2: 6-digit OTP
│       │   │
│       │   └── (dashboard)/                 # All authenticated pages — sidebar + topbar layout
│       │       ├── layout.tsx               # Sidebar + Topbar shell + ChatWidget + Framer page transition
│       │       ├── page.tsx                 # Customer home: ServiceGrid with search + filter pills
│       │       │
│       │       ├── book/
│       │       │   ├── page.tsx             # Service selection (redirect to /book/[serviceId])
│       │       │   ├── confirm/
│       │       │   │   └── page.tsx         # ★ Confirmation: checkmark anim, code copy, add-to-calendar
│       │       │   ├── share/
│       │       │   │   └── [token]/
│       │       │   │       └── page.tsx     # Share link entry: fetch service by token → booking flow
│       │       │   └── [serviceId]/
│       │       │       └── page.tsx         # ★ Booking wizard: Provider → Date → Slots → Capacity
│       │       │                            #   → Questions → [Payment] → submit → /book/confirm
│       │       │
│       │       ├── appointments/
│       │       │   ├── page.tsx             # My appointments: Upcoming / Past / Cancelled tabs
│       │       │   └── [id]/
│       │       │       └── page.tsx         # Detail: status, code, answers, audit trail, reschedule/cancel
│       │       │
│       │       ├── profile/
│       │       │   └── page.tsx             # Edit name/phone, recent appointments preview
│       │       │
│       │       ├── organiser/
│       │       │   ├── page.tsx             # Organiser dashboard: stats cards + recent bookings table
│       │       │   ├── services/
│       │       │   │   ├── page.tsx         # List services: table + grid toggle, publish toggle
│       │       │   │   ├── new/
│       │       │   │   │   └── page.tsx     # ★ 4-step service creation wizard
│       │       │   │   └── [id]/
│       │       │   │       └── page.tsx     # Edit service + danger zone + share link copy
│       │       │   ├── bookings/
│       │       │   │   └── page.tsx         # All bookings: search, filter, inline confirm/complete/no-show
│       │       │   └── calendar/
│       │       │       └── page.tsx         # Weekly CSS Grid calendar, color-coded booking blocks
│       │       │
│       │       └── admin/
│       │           ├── page.tsx             # Admin overview: system-wide stats
│       │           ├── users/
│       │           │   └── page.tsx         # User table: activate/deactivate, role change
│       │           └── analytics/
│       │               └── page.tsx         # recharts: trend + peak hours + status pie + utilization
│       │
│       ├── components/
│       │   │
│       │   ├── ui/                          # shadcn components (customized via globals.css vars)
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── badge.tsx
│       │   │   ├── input.tsx
│       │   │   ├── label.tsx
│       │   │   ├── select.tsx
│       │   │   ├── tabs.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── sheet.tsx               # Slide-over panel (booking detail, reschedule)
│       │   │   ├── toast.tsx
│       │   │   ├── avatar.tsx
│       │   │   ├── separator.tsx
│       │   │   ├── skeleton.tsx
│       │   │   └── table.tsx
│       │   │
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx             # Fixed sidebar: 72px collapsed / 256px expanded
│       │   │   │                           # Role-based nav items, active route highlight, user info
│       │   │   ├── Topbar.tsx              # Page title, theme toggle, user avatar dropdown
│       │   │   ├── MobileNav.tsx           # Bottom nav bar (mobile only, < md breakpoint)
│       │   │   └── PageContainer.tsx       # Wrapper with consistent padding + max-width
│       │   │
│       │   ├── booking/
│       │   │   ├── ServiceCard.tsx         # Card: image banner, name, duration, providers, Book Now CTA
│       │   │   ├── ServiceGrid.tsx         # Responsive grid of ServiceCards with search/filter state
│       │   │   ├── DatePicker.tsx          # ★ Custom calendar: date-fns, no heavy lib, availability dots
│       │   │   ├── SlotGrid.tsx            # ★ Time slot pills: available/booked/selected states
│       │   │   ├── CapacitySelector.tsx    # Stepper: minus/count/plus, capped at availableCapacity
│       │   │   ├── QuestionsForm.tsx       # Dynamic form from BookingQuestion array, RHF + Zod
│       │   │   ├── PaymentScreen.tsx       # ★ Mock payment: Card/UPI/NetBanking tabs, GST calc
│       │   │   ├── BookingConfirmation.tsx  # Animated checkmark, code copy, add-to-calendar links
│       │   │   └── BookingStatusBadge.tsx  # Color-coded badge for all BookingStatus enum values
│       │   │
│       │   ├── appointments/
│       │   │   ├── AppointmentCard.tsx     # Date column + service info + status + action buttons
│       │   │   ├── AppointmentTable.tsx    # Table view for organiser bookings list
│       │   │   └── RescheduleModal.tsx     # Sheet: DatePicker + SlotGrid + confirm button
│       │   │
│       │   ├── organiser/
│       │   │   ├── ServiceForm.tsx         # 4-step wizard form (used by /new and /[id] edit pages)
│       │   │   ├── WorkingHoursEditor.tsx  # 7-day grid: toggle + start/end time per day
│       │   │   ├── FlexibleSlotsEditor.tsx # Date-range picker + list of added flexible slots
│       │   │   ├── SlotRulesEditor.tsx     # Capacity, manual confirm, advance payment toggles
│       │   │   ├── BookingRulesPanel.tsx   # Summary card showing all active booking rules
│       │   │   └── CalendarView.tsx        # Weekly CSS Grid calendar, no external calendar lib
│       │   │
│       │   ├── admin/
│       │   │   ├── StatsCard.tsx           # Icon + label + number + trend indicator
│       │   │   ├── UserTable.tsx           # Paginated user management with inline role/status actions
│       │   │   └── AnalyticsCharts.tsx     # All 4 recharts charts composed with dark theme
│       │   │
│       │   ├── ai/
│       │   │   ├── ChatWidget.tsx          # ★ Floating bubble + expandable panel, Framer spring anim
│       │   │   ├── ChatMessage.tsx         # Individual message bubble: user (right) / AI (left + avatar)
│       │   │   ├── VoiceButton.tsx         # Hold-to-speak mic, pulsing red ring while recording
│       │   │   └── SlotSuggestionCard.tsx  # AI-suggested booking card: details + Confirm / Try Again
│       │   │
│       │   └── shared/
│       │       ├── DataTable.tsx           # Reusable table with sort, pagination, column config
│       │       ├── EmptyState.tsx          # Icon + title + description + optional action button
│       │       ├── LoadingSkeleton.tsx     # Variants: ServiceCard, AppointmentCard, SlotGrid, TableRow
│       │       └── ConfirmDialog.tsx       # Dialog: title + message + Cancel/Confirm buttons
│       │
│       ├── hooks/
│       │   ├── useAuth.ts                  # useAuthStore selector + logout mutation
│       │   ├── useServices.ts              # useServices(), useService(id), useOrganizerServices()
│       │   ├── useSlots.ts                 # useSlots(serviceId, date, resourceId?) — staleTime: 30s
│       │   ├── useBookings.ts              # useBookings(filters), useBooking(id), mutations
│       │   ├── useAIChat.ts               # messages state, sendMessage(), sendVoice(), confirmBooking()
│       │   └── useVoiceRecorder.ts         # MediaRecorder wrapper: startRecording(), stopRecording()
│       │
│       ├── lib/
│       │   ├── api.ts                      # Axios instance: baseURL, withCredentials, 401 interceptor
│       │   ├── queryClient.ts              # QueryClient config: staleTime defaults, retry: 1
│       │   └── utils.ts                    # cn() classname helper, formatDate(), formatCurrency()
│       │
│       ├── store/
│       │   ├── authStore.ts                # Zustand persist: user, isAuthenticated, setUser, clearAuth
│       │   └── uiStore.ts                  # Zustand: sidebarOpen, chatOpen, activeModal, toggles
│       │
│       └── types/
│           └── index.ts                    # Shared TypeScript types matching Prisma models
│                                           # User, AppointmentType, Booking, Slot, BookingAnswer, etc.
```

### File Count Summary
| Area | Files |
|------|-------|
| Backend (src/) | 22 |
| Backend (prisma/) | 2 |
| Frontend (app/ pages) | 18 |
| Frontend (components/) | 28 |
| Frontend (hooks, lib, store, types) | 11 |
| Config & root | 5 |
| **Total** | **~86 files** |

### Critical Files (★) — Get These Right First
These files contain the core business logic. If any of these is wrong, the demo breaks:

| File | Why Critical |
|------|-------------|
| `api/src/services/slot.service.ts` | Wrong logic = wrong availability = judges see broken booking |
| `api/src/services/booking.service.ts` | Missing lock/tx = double booking passes in demo |
| `api/src/config/env.ts` | Missing Zod validation = silent crashes in production |
| `web/app/globals.css` | Brand design system — all colors and component styles live here |
| `web/app/(dashboard)/book/[serviceId]/page.tsx` | The full booking wizard — the main user journey |
| `web/components/ai/ChatWidget.tsx` | AI demo is the showstopper moment for judges |
| `web/components/booking/PaymentScreen.tsx` | Missing this = no payment flow = incomplete demo |

---

## DATABASE SCHEMA (Final — Copy into prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  CUSTOMER
  ORGANISER
  ADMIN
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  RESCHEDULED
  COMPLETED
  NO_SHOW
}

enum SlotScheduleType {
  WEEKLY
  FLEXIBLE
}

enum ResourceType {
  USER
  RESOURCE
}

enum PaymentStatus {
  UNPAID
  PAID
  WAIVED
  REFUNDED
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  name        String
  phone       String?
  role        Role     @default(CUSTOMER)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  managedServices    AppointmentType[] @relation("OrganiserServices")
  bookingsAsCustomer Booking[]         @relation("CustomerBookings")
  resourceProfile    Resource?
  aiChatSessions     AIChatSession[]
}

model AppointmentType {
  id                    String           @id @default(cuid())
  organiserId           String
  name                  String
  description           String?
  durationMinutes       Int
  resourceType          ResourceType     @default(USER)
  slotScheduleType      SlotScheduleType @default(WEEKLY)
  maxCapacityPerSlot    Int              @default(1)
  manageCapacity        Boolean          @default(false)
  requiresManualConfirm Boolean          @default(false)
  requiresAdvancePayment Boolean         @default(false)
  advancePaymentAmount  Decimal?         @db.Decimal(10, 2)
  isPublished           Boolean          @default(false)
  shareToken            String?          @unique
  location              String?
  coverImageUrl         String?
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  organiser        User              @relation("OrganiserServices", fields: [organiserId], references: [id])
  resources        Resource[]
  workingHours     WorkingHours[]
  flexibleSlots    FlexibleSlot[]
  bookingQuestions BookingQuestion[]
  bookings         Booking[]
}

model Resource {
  id                String       @id @default(cuid())
  appointmentTypeId String
  userId            String?      @unique
  name              String
  resourceType      ResourceType @default(USER)
  isActive          Boolean      @default(true)
  createdAt         DateTime     @default(now())

  appointmentType AppointmentType @relation(fields: [appointmentTypeId], references: [id])
  user            User?           @relation(fields: [userId], references: [id])
  bookings        Booking[]
}

model WorkingHours {
  id                String  @id @default(cuid())
  appointmentTypeId String
  dayOfWeek         Int
  startTime         String
  endTime           String
  isActive          Boolean @default(true)

  appointmentType AppointmentType @relation(fields: [appointmentTypeId], references: [id])
}

model FlexibleSlot {
  id                String   @id @default(cuid())
  appointmentTypeId String
  startDatetime     DateTime
  endDatetime       DateTime
  maxCapacity       Int      @default(1)
  isActive          Boolean  @default(true)

  appointmentType AppointmentType @relation(fields: [appointmentTypeId], references: [id])
}

model BookingQuestion {
  id                String  @id @default(cuid())
  appointmentTypeId String
  question          String
  isRequired        Boolean @default(false)
  sequence          Int     @default(0)

  appointmentType AppointmentType @relation(fields: [appointmentTypeId], references: [id])
  answers         BookingAnswer[]
}

model Booking {
  id                String        @id @default(cuid())
  customerId        String
  appointmentTypeId String
  resourceId        String?
  scheduledStart    DateTime
  scheduledEnd      DateTime
  capacity          Int           @default(1)
  status            BookingStatus @default(CONFIRMED)
  paymentStatus     PaymentStatus @default(UNPAID)
  paymentAmount     Decimal?      @db.Decimal(10, 2)
  paymentReference  String?       // Mock payment transaction ID
  cancelReason      String?
  confirmationCode  String        @unique @default(cuid())
  bookedByAdminId   String?       // Set when admin books on behalf of customer
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  customer        User            @relation("CustomerBookings", fields: [customerId], references: [id])
  appointmentType AppointmentType @relation(fields: [appointmentTypeId], references: [id])
  resource        Resource?       @relation(fields: [resourceId], references: [id])
  answers         BookingAnswer[]
  auditLog        BookingAuditLog[]
}

model BookingAnswer {
  id         String @id @default(cuid())
  bookingId  String
  questionId String
  answer     String

  booking  Booking         @relation(fields: [bookingId], references: [id])
  question BookingQuestion @relation(fields: [questionId], references: [id])
}

model BookingAuditLog {
  id        String   @id @default(cuid())
  bookingId String
  actorId   String
  action    String
  metadata  Json?
  createdAt DateTime @default(now())

  booking Booking @relation(fields: [bookingId], references: [id])
}

model AIChatSession {
  id        String   @id @default(cuid())
  userId    String
  messages  Json
  isExpired Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}
```

---

## COMPLETE BOOKING FLOW (State Machine)

```
[Service Discovery Page]
        │
        ▼
[Provider Selection] ──── (skip if only 1 resource)
        │
        ▼
[Date Picker] ──── highlights dates with availability
        │
        ▼
[Slot Grid] ──── real-time, 30s stale, React Query
        │
        ▼
[Capacity Selector] ──── (skip if manageCapacity=false)
        │
        ▼
[Questions Form] ──── (skip if no questions configured)
        │
        ├── requiresAdvancePayment=true ──▶ [Payment Screen (Mock)]
        │                                           │
        └── requiresAdvancePayment=false ───────────┘
                                                    │
                                                    ▼
                                        [Confirmation Page]
                                                    │
                          ┌─────────────────────────┼────────────────────────┐
                          ▼                         ▼                        ▼
                    [Cancel] ──▶          [Add to Calendar]          [Reschedule]
              redirect to /book                                   date+slot picker
                                                                  same service only
```

---

## PHASE 1 PROMPT — Foundation Setup

```
You are building a production-grade Appointment Booking System for an Odoo Hackathon.

TASK: Set up the full project foundation. Do everything in this exact order.

=== STEP 1: Create monorepo structure ===

Create this exact folder structure:
appointment-app/
├── apps/
│   ├── web/   (Next.js 14)
│   └── api/   (Express + TypeScript)
├── docker-compose.yml
├── .env.example
└── package.json

=== STEP 2: docker-compose.yml ===

version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: apptuser
      POSTGRES_PASSWORD: appt_secure_pass
      POSTGRES_DB: appointment_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:

=== STEP 3: Root package.json ===

{
  "name": "appointment-app",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "dev:api": "cd apps/api && npm run dev",
    "dev:web": "cd apps/web && npm run dev",
    "db:up": "docker-compose up -d",
    "db:migrate": "cd apps/api && npx prisma migrate dev --name init",
    "db:seed": "cd apps/api && npx prisma db seed",
    "db:studio": "cd apps/api && npx prisma studio",
    "db:reset": "cd apps/api && npx prisma migrate reset --force",
    "setup": "npm run db:up && sleep 5 && npm run db:migrate && npm run db:seed && npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}

=== STEP 4: Backend setup (apps/api) ===

Initialize: cd apps/api && npm init -y
Install dependencies:
  npm install express prisma @prisma/client bcryptjs jsonwebtoken ioredis axios multer winston express-rate-limit cors helmet zod dotenv
  npm install -D typescript @types/express @types/node @types/bcryptjs @types/jsonwebtoken @types/cors ts-node nodemon

Create tsconfig.json:
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}

Create apps/api/package.json scripts:
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}

=== STEP 5: Prisma Schema ===

Run: npx prisma init
Copy this EXACT schema into apps/api/prisma/schema.prisma:

[PASTE THE FULL PRISMA SCHEMA FROM THE DATABASE SCHEMA SECTION ABOVE]

Run: npx prisma migrate dev --name init

=== STEP 6: Backend files — create all of these ===

--- apps/api/src/config/env.ts ---
import { z } from 'zod'
import dotenv from 'dotenv'
dotenv.config()

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  SARVAM_API_KEY: z.string().optional(),
  SARVAM_API_BASE: z.string().default('https://api.sarvam.ai'),
})

export const env = envSchema.parse(process.env)

--- apps/api/src/config/database.ts ---
import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = global.__prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}

--- apps/api/src/config/redis.ts ---
import Redis from 'ioredis'
import { env } from './env'

export const redis = new Redis(env.REDIS_URL)

redis.on('error', (err) => console.error('Redis error:', err))
redis.on('connect', () => console.log('Redis connected'))

--- apps/api/src/utils/logger.ts ---
import winston from 'winston'
import { env } from '../config/env'

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
})

--- apps/api/src/utils/ApiError.ts ---
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

--- apps/api/src/utils/asyncHandler.ts ---
import { Request, Response, NextFunction } from 'express'

export const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

--- apps/api/src/middleware/errorHandler.ts ---
import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    })
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Resource already exists' })
  }
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors
    })
  }
  logger.error(err)
  res.status(500).json({ success: false, message: 'Internal server error' })
}

--- apps/api/src/middleware/auth.ts ---
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { redis } from '../config/redis'
import { ApiError } from '../utils/ApiError'

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string }
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new ApiError(401, 'Authentication required')

    const blacklisted = await redis.get(`blacklist:${token}`)
    if (blacklisted) throw new ApiError(401, 'Token has been revoked')

    const decoded = jwt.verify(token, env.JWT_SECRET) as any
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role }
    next()
  } catch (err: any) {
    if (err instanceof ApiError) return next(err)
    next(new ApiError(401, 'Invalid or expired token'))
  }
}

--- apps/api/src/middleware/rbac.ts ---
import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'

export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'Insufficient permissions')
    }
    next()
  }

--- apps/api/src/middleware/rateLimiter.ts ---
import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts, please try again later' }
})

export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
})

--- apps/api/src/index.ts ---
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { generalLimiter } from './middleware/rateLimiter'

// Routes
import authRoutes from './routes/auth.routes'
import userRoutes from './routes/users.routes'
import serviceRoutes from './routes/services.routes'
import slotRoutes from './routes/slots.routes'
import bookingRoutes from './routes/bookings.routes'
import analyticsRoutes from './routes/analytics.routes'
import aiRoutes from './routes/ai.routes'

const app = express()

app.use(helmet())
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(generalLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/slots', slotRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/ai', aiRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }))

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info(`API server running on port ${env.PORT}`)
})

export default app

=== STEP 7: Frontend setup (apps/web) ===

Run: npx create-next-app@14 apps/web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"

cd apps/web
Install dependencies:
  npm install @tanstack/react-query zustand react-hook-form @hookform/resolvers zod axios framer-motion next-themes date-fns recharts lucide-react sonner
  npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-avatar @radix-ui/react-badge @radix-ui/react-separator

Run shadcn init: npx shadcn@latest init
  Choose: Default style, CSS variables, yes to tailwind config

Install shadcn components:
  npx shadcn@latest add button card badge input label select tabs dialog sheet toast avatar separator skeleton table

=== STEP 8: globals.css — brand design system ===

Create apps/web/app/globals.css with this EXACT content:

@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --brand-primary: #0a0a1a;
    --brand-accent: #6c63ff;
    --brand-accent-hover: #5a52e0;
    --brand-accent-2: #00d4aa;
    --surface-1: #111127;
    --surface-2: #1a1a35;
    --surface-3: #242444;
    --border: #2e2e55;
    --text-primary: #f0f0ff;
    --text-secondary: #9999cc;
    --text-muted: #666699;
    --success: #00d4aa;
    --warning: #f0a500;
    --danger: #ff4d6d;
    --info: #4da6ff;

    /* shadcn overrides */
    --background: 240 10% 7%;
    --foreground: 240 30% 95%;
    --card: 240 20% 13%;
    --card-foreground: 240 30% 95%;
    --popover: 240 20% 13%;
    --popover-foreground: 240 30% 95%;
    --primary: 246 100% 69%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 20% 20%;
    --secondary-foreground: 240 30% 90%;
    --muted: 240 20% 20%;
    --muted-foreground: 240 20% 60%;
    --accent: 240 20% 22%;
    --accent-foreground: 240 30% 95%;
    --destructive: 349 100% 65%;
    --destructive-foreground: 0 0% 100%;
    --border: 240 25% 25%;
    --input: 240 20% 18%;
    --ring: 246 100% 69%;
    --radius: 0.75rem;
  }

  [data-theme="light"] {
    --brand-primary: #f8f8ff;
    --surface-1: #ffffff;
    --surface-2: #f0f0ff;
    --surface-3: #e8e8f8;
    --border: #d0d0e8;
    --text-primary: #0a0a1a;
    --text-secondary: #444466;
    --text-muted: #888899;

    --background: 240 30% 99%;
    --foreground: 240 30% 5%;
    --card: 0 0% 100%;
    --card-foreground: 240 30% 5%;
    --border: 240 20% 88%;
    --input: 240 20% 95%;
  }

  body {
    font-family: 'Inter', sans-serif;
    background-color: var(--brand-primary);
    color: var(--text-primary);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  code, .font-mono {
    font-family: 'JetBrains Mono', monospace;
  }
}

@layer components {
  .slot-pill {
    @apply px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150 cursor-pointer;
    border-color: var(--border);
    color: var(--text-secondary);
  }
  .slot-pill:hover:not(.slot-pill--disabled) {
    border-color: var(--brand-accent);
    color: var(--brand-accent);
  }
  .slot-pill--selected {
    background-color: var(--brand-accent);
    border-color: var(--brand-accent);
    color: white;
  }
  .slot-pill--disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .surface-card {
    background-color: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .status-badge--confirmed { @apply bg-teal-500/15 text-teal-400 border border-teal-500/30; }
  .status-badge--pending { @apply bg-yellow-500/15 text-yellow-400 border border-yellow-500/30; }
  .status-badge--cancelled { @apply bg-red-500/15 text-red-400 border border-red-500/30; }
  .status-badge--completed { @apply bg-gray-500/15 text-gray-400 border border-gray-500/30; }
  .status-badge--rescheduled { @apply bg-blue-500/15 text-blue-400 border border-blue-500/30; }
  .status-badge--no_show { @apply bg-orange-500/15 text-orange-400 border border-orange-500/30; }
}

When complete, confirm: "Phase 1 complete. All foundation files created. Prisma migrated."
```

---

## PHASE 2 PROMPT — Auth System (Backend + Frontend)

```
Continue building the Appointment App. Phase 1 is complete (Prisma migrated, Express running, Next.js set up).

TASK: Build complete authentication system.

=== BACKEND AUTH ===

--- apps/api/src/validators/auth.validator.ts ---
import { z } from 'zod'

export const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain special character'),
  phone: z.string().regex(/^\+?[0-9]{10,13}$/).optional(),
  role: z.enum(['CUSTOMER', 'ORGANISER']).default('CUSTOMER')
})

export const verifyOtpSchema = z.object({
  otpToken: z.string().uuid(),
  otp: z.string().length(6)
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

export const forgotPasswordSchema = z.object({
  email: z.string().email()
})

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8)
    .regex(/[A-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/)
})

--- apps/api/src/services/auth.service.ts ---
Full implementation:
- signup(data): hash password, create user with isActive=false, generate UUID otpToken, generate 6-digit OTP, store in Redis as `otp:{otpToken}` with 300s TTL, return { otpToken }
- verifyOtp(otpToken, otp): get from Redis, compare, if match set user.isActive=true, delete from Redis, return JWT pair
- login(email, password): find user, check isActive, compare password with bcrypt, return JWT pair
- logout(token): add to Redis blacklist with JWT expiry duration as TTL
- getMe(userId): return user without password
- forgotPassword(email): generate reset token UUID, store in Redis `reset:{token}` → userId with 600s TTL, log the reset link (mock email)
- resetPassword(token, newPassword): get userId from Redis, update password, delete token

JWT helpers:
  generateTokens(user): returns { accessToken, refreshToken }
  setAuthCookies(res, tokens): sets httpOnly cookies with correct expiry

--- apps/api/src/controllers/auth.controller.ts ---
Thin controllers calling auth.service methods. All wrapped with asyncHandler.
POST /signup → call service.signup → 201 { success: true, message: 'OTP sent', otpToken }
POST /verify-otp → call service.verifyOtp → 200 + setAuthCookies + { success: true, user }
POST /login → call service.login → 200 + setAuthCookies + { success: true, user }
POST /logout → blacklist token → clear cookies → 200 { success: true }
GET /me → call service.getMe(req.user.id) → 200 { success: true, user }
POST /forgot-password → 200 { success: true, message: 'Reset link logged to console' }
POST /reset-password → 200 { success: true, message: 'Password updated' }

--- apps/api/src/routes/auth.routes.ts ---
All auth routes mounted. Apply authLimiter to /signup, /login, /verify-otp, /forgot-password.

=== FRONTEND AUTH ===

--- apps/web/store/authStore.ts ---
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User { id: string; name: string; email: string; role: string; phone?: string }
interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
)

--- apps/web/lib/api.ts ---
Axios instance with baseURL from NEXT_PUBLIC_API_URL, withCredentials: true.
Response interceptor: on 401, clear auth store and redirect to /login.
Request interceptor: log requests in development.

--- apps/web/app/(auth)/signup/page.tsx ---
Multi-step form:
Step 1: Name, email, password, phone (optional), role selector (Customer/Organiser)
  - Zod validation, show password strength indicator
  - On submit → POST /auth/signup → get otpToken → go to Step 2
Step 2: OTP input (6 boxes, auto-advance on digit entry)
  - POST /auth/verify-otp → on success → redirect to /
  - Resend OTP button (30s cooldown timer)
Design: centered card, Plus Jakarta Sans heading "Create your account", purple CTA button

--- apps/web/app/(auth)/login/page.tsx ---
Email + password form. Zod validation.
"Forgot password?" link.
On success: redirect to / (authStore.setUser called).
Link to /signup at bottom.

--- apps/web/middleware.ts ---
Protect all routes under /(dashboard) — redirect to /login if no accessToken cookie.
Redirect authenticated users away from /login and /signup.

When complete, confirm: "Phase 2 complete. Auth system fully working."
```

---

## PHASE 3 PROMPT — Layout & Navigation Shell

```
Continue building the Appointment App. Auth is complete.

TASK: Build the full app layout shell — sidebar, topbar, mobile nav.

=== ZUSTAND UI STORE ===

--- apps/web/store/uiStore.ts ---
import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  chatOpen: boolean
  activeModal: string | null
  toggleSidebar: () => void
  toggleChat: () => void
  openModal: (name: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  chatOpen: false,
  activeModal: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}))

=== SIDEBAR COMPONENT ===

--- apps/web/components/layout/Sidebar.tsx ---

Design specs:
- Fixed left sidebar
- Collapsed: 72px wide (icons only with tooltips)
- Expanded: 256px wide
- Toggle button at bottom of sidebar (ChevronLeft/ChevronRight icon)
- Framer Motion: width animation with spring physics
- Background: var(--surface-1)
- Border-right: 1px solid var(--border)

Navigation items — shown based on user role:

CUSTOMER routes:
  - Home (/) — LayoutGrid icon
  - My Appointments (/appointments) — CalendarCheck icon
  - Profile (/profile) — User icon

ORGANISER routes (in addition to customer routes):
  - Dashboard (/organiser) — BarChart2 icon
  - My Services (/organiser/services) — Briefcase icon
  - All Bookings (/organiser/bookings) — BookOpen icon
  - Calendar (/organiser/calendar) — Calendar icon

ADMIN routes (all organiser routes plus):
  - Admin Panel (/admin) — Shield icon
  - Users (/admin/users) — Users icon
  - Analytics (/admin/analytics) — TrendingUp icon

Active route styling:
  - 3px left border in var(--brand-accent) color
  - Background: var(--surface-3)
  - Text: var(--text-primary)

Hover styling:
  - Background: var(--surface-3) with 150ms ease transition
  - Text: var(--text-primary)

Bottom section (always visible):
  - User avatar (first letter of name in a circle, brand-accent background)
  - When expanded: name + role pill (CUSTOMER/ORGANISER/ADMIN in matching badge color)
  - Logout button (LogOut icon, red on hover)

=== TOPBAR COMPONENT ===

--- apps/web/components/layout/Topbar.tsx ---

- Fixed top bar: 60px height
- Background: var(--surface-1) with backdrop blur
- Left: Page title (from current route, dynamic)
- Right: Dark/light mode toggle (Moon/Sun icon, next-themes) + notification bell (static for now) + user avatar dropdown (Profile / Logout)

=== DASHBOARD LAYOUT ===

--- apps/web/app/(dashboard)/layout.tsx ---

- Renders Sidebar (left) + main content area
- Main content: margin-left based on sidebar width (72px or 256px), transition with Framer Motion
- Topbar fixed at top of main content
- Content area: padding-top 60px (for topbar), overflow-y auto
- Mobile: hide sidebar, show bottom navigation bar instead

--- apps/web/components/layout/MobileNav.tsx ---

Bottom navigation bar (mobile only, visible below md breakpoint):
  4 icons based on user role:
  - Customer: Home, Appointments, Profile, Chat (AI)
  - Organiser: Dashboard, Services, Bookings, Calendar
  Fixed bottom, background var(--surface-1), border-top var(--border)

=== QUERY CLIENT SETUP ===

--- apps/web/lib/queryClient.ts ---
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
})

--- apps/web/app/layout.tsx ---
Wrap everything in:
- ThemeProvider (next-themes, defaultTheme="dark")
- QueryClientProvider
- Toaster (sonner)
Import Plus Jakarta Sans and Inter via next/font/google.

When complete, confirm: "Phase 3 complete. Layout shell with sidebar, topbar, mobile nav done."
```

---

## PHASE 4 PROMPT — Services (Organiser CRUD + Customer Discovery)

```
Continue building the Appointment App. Layout shell is complete.

TASK: Build the full Services feature — organiser creates/edits services, customer discovers them.

=== BACKEND SERVICES API ===

--- apps/api/src/validators/service.validator.ts ---
createServiceSchema:
  name: z.string().min(2).max(200)
  description: z.string().max(1000).optional()
  durationMinutes: z.number().int().min(5).max(480)
  resourceType: z.enum(['USER', 'RESOURCE'])
  slotScheduleType: z.enum(['WEEKLY', 'FLEXIBLE'])
  maxCapacityPerSlot: z.number().int().min(1).max(100)
  manageCapacity: z.boolean()
  requiresManualConfirm: z.boolean()
  requiresAdvancePayment: z.boolean()
  advancePaymentAmount: z.number().positive().optional()
  location: z.string().max(500).optional()

workingHoursSchema:
  hours: array of { dayOfWeek: 0-6, startTime: "HH:MM", endTime: "HH:MM", isActive: boolean }

flexibleSlotSchema:
  slots: array of { startDatetime: ISO string, endDatetime: ISO string, maxCapacity: number }

bookingQuestionSchema:
  question: z.string().min(5).max(500)
  isRequired: z.boolean()
  sequence: z.number().int()

--- apps/api/src/services/services.service.ts ---
Implement all CRUD + sub-resource management.
Key logic:
  - Only organiser who owns the service can edit/delete it (check organiserId === req.user.id)
  - ADMIN can edit/delete any service
  - generateShareToken(): crypto.randomUUID() — set when service is first created
  - publishService(id): toggle isPublished, if publishing validate that workingHours or flexibleSlots exist
  - getPublishedServices(): include resource count, next available date (compute from today's working hours)

--- apps/api/src/routes/services.routes.ts ---
GET    /                    → public, no auth, list published services
GET    /mine                → [ORGANISER, ADMIN] list own services
GET    /share/:token        → public, get by share token
GET    /:id                 → public, get service detail
POST   /                    → [ORGANISER, ADMIN] create
PATCH  /:id                 → [ORGANISER, ADMIN] update
DELETE /:id                 → [ORGANISER, ADMIN] delete
PATCH  /:id/publish         → [ORGANISER, ADMIN] toggle publish
POST   /:id/resources       → [ORGANISER, ADMIN] add resource
DELETE /:id/resources/:rid  → [ORGANISER, ADMIN] remove resource
POST   /:id/working-hours   → [ORGANISER, ADMIN] set working hours (replace all)
POST   /:id/flexible-slots  → [ORGANISER, ADMIN] add flexible slots
POST   /:id/questions       → [ORGANISER, ADMIN] add question
DELETE /:id/questions/:qid  → [ORGANISER, ADMIN] delete question
PATCH  /:id/questions/:qid  → [ORGANISER, ADMIN] update question order

=== FRONTEND — SERVICE DISCOVERY (Customer) ===

--- apps/web/app/(dashboard)/page.tsx ---
Customer Home / Service Discovery

UI:
  - "Book an Appointment" heading (Plus Jakarta Sans, 32px, bold)
  - Search bar: full width, rounded-xl, surface-3 background, Search icon inside
  - Filter pills row: "All", "30 min", "60 min", "Available Today" — pill buttons, active = brand-accent fill
  - ServiceGrid component below

--- apps/web/components/booking/ServiceCard.tsx ---
Card design (surface-2 background):
  - Top: colored gradient banner OR cover image (120px height), service icon overlay
  - Body: service name (Plus Jakarta Sans, semibold), description (2 lines, truncated), duration badge (Clock icon + "30 min"), location (MapPin icon)
  - Provider row: avatar stack (up to 3 provider avatars) + "X providers" text
  - Footer: "Book Now" button (full width, brand-accent purple, solid)
  - Hover: subtle scale(1.02) + shadow, Framer Motion

--- apps/web/hooks/useServices.ts ---
useServices(): React Query ['services'] → GET /api/services
useService(id): React Query ['services', id] → GET /api/services/:id
useOrganizerServices(): React Query ['services', 'mine'] → GET /api/services/mine

=== FRONTEND — ORGANISER SERVICE MANAGEMENT ===

--- apps/web/app/(dashboard)/organiser/services/page.tsx ---
List all organiser's services in a table + cards grid toggle.
Table columns: Name, Duration, Type, Slots, Status (Published/Draft badge), Actions (Edit, View, Toggle Publish)
"+ Create Service" button top right → /organiser/services/new
Empty state: illustration + "No services yet. Create your first appointment type." + button

--- apps/web/app/(dashboard)/organiser/services/new/page.tsx ---
Multi-step form (4 steps, progress stepper at top):

Step 1 — Basic Info:
  - Service name, description (textarea), duration selector (15/30/45/60/90/120 min buttons)
  - Resource type toggle: "Human Provider" or "Physical Resource"
  - Location input

Step 2 — Scheduling:
  - Slot schedule type toggle: "Weekly (repeating)" or "Flexible (custom dates)"
  - If WEEKLY: WorkingHoursEditor component
    - 7 day rows (Sun-Sat), each has: toggle switch, start time input, end time input
    - "Copy to all weekdays" button
  - If FLEXIBLE: date/time range picker to add multiple slots + list of added slots with delete

Step 3 — Booking Rules:
  - Max capacity per slot (number input, default 1)
  - "Manage capacity" toggle (if on, customer can choose how many spots they need)
  - "Require manual confirmation" toggle
  - "Require advance payment" toggle → if on, show amount input (₹)
  - "Allow multiple providers" (if yes, customer picks a provider before booking)

Step 4 — Questions:
  - List of added questions with drag-to-reorder
  - "Add Question" button → inline form: question text, required toggle, add
  - Skip option ("No questions needed")

Final step: Preview + Publish toggle + "Create Service" button

--- apps/web/app/(dashboard)/organiser/services/[id]/page.tsx ---
Same multi-step form but pre-filled for editing.
Additional "Danger Zone" section at bottom: delete service (with confirmation dialog).
"Copy Share Link" button (copies /book/share/TOKEN URL to clipboard).

When complete, confirm: "Phase 4 complete. Services CRUD and discovery pages done."
```

---

## PHASE 5 PROMPT — Slot Engine + Booking Flow

```
Continue building the Appointment App. Services are fully working.

TASK: Build the slot availability engine and complete end-to-end booking flow.

=== BACKEND SLOT ENGINE ===

--- apps/api/src/services/slot.service.ts ---

CRITICAL — implement this exact logic:

generateAvailableSlots(serviceId: string, date: string, resourceId?: string):
  1. Parse date as local date (YYYY-MM-DD format)
  2. Fetch AppointmentType with workingHours, flexibleSlots, resources
  3. If service not found or not published → throw ApiError(404)
  4. Initialize empty slots array: SlotResult[] = []
  
  FOR WEEKLY schedule:
    dayOfWeek = new Date(date).getDay() // 0-6
    workingHour = service.workingHours.find(wh => wh.dayOfWeek === dayOfWeek && wh.isActive)
    if (!workingHour) return { slots: [], message: "No availability on this day" }
    
    Parse startTime/endTime as HH:MM
    current = new Date(`${date}T${startTime}:00`)
    end = new Date(`${date}T${endTime}:00`)
    
    while current + durationMinutes <= end:
      slotStart = new Date(current)
      slotEnd = new Date(current + durationMinutes * 60000)
      slots.push({ startTime: slotStart, endTime: slotEnd })
      current += durationMinutes * 60000
    
  FOR FLEXIBLE schedule:
    Find FlexibleSlot entries where:
      startDatetime.date <= date <= endDatetime.date && isActive = true
    For each flexibleSlot, generate time slots same way as above
    If no flexible slots cover this date → return { slots: [], message: "No slots configured for this date" }
  
  5. For each generated slot, query existing bookings:
    WHERE appointmentTypeId = serviceId
    AND scheduledStart = slotStart
    AND status NOT IN ['CANCELLED']
    AND (resourceId ? resource matches : any resource)
    
    bookedCapacity = sum of booking.capacity
    availableCapacity = maxCapacityPerSlot - bookedCapacity
    
  6. Filter: keep only slots where availableCapacity > 0
  7. Return { slots: [{ startTime, endTime, availableCapacity, isFull: false }] }

--- apps/api/src/routes/slots.routes.ts ---
GET /available
  Query: serviceId (required), date (YYYY-MM-DD, required), resourceId (optional)
  Returns: { success: true, slots: SlotResult[], message?: string }
  No auth required (public endpoint)

=== BACKEND BOOKING ENGINE ===

--- apps/api/src/validators/booking.validator.ts ---
createBookingSchema:
  appointmentTypeId: z.string().cuid()
  resourceId: z.string().cuid().optional()
  scheduledStart: z.string().datetime()
  capacity: z.number().int().min(1).default(1)
  answers: z.array(z.object({ questionId: z.string(), answer: z.string() }))
  customerId: z.string().cuid().optional()  // Admin only: book on behalf of
  paymentReference: z.string().optional()  // Set after mock payment

rescheduleSchema:
  scheduledStart: z.string().datetime()

--- apps/api/src/services/booking.service.ts ---

CRITICAL double-booking prevention:

createBooking(data, actorId: string):
  // Redis slot lock — prevent TOCTOU race condition
  lockKey = `slot_lock:${data.appointmentTypeId}:${data.scheduledStart}:${data.resourceId ?? 'any'}`
  lockAcquired = await redis.set(lockKey, actorId, 'EX', 300, 'NX')
  if (!lockAcquired) throw new ApiError(409, 'Slot is being booked. Please try again in a moment.')
  
  try {
    return await prisma.$transaction(async (tx) => {
      // Re-validate inside transaction
      service = await tx.appointmentType.findUnique({ where: { id: data.appointmentTypeId } })
      if (!service || !service.isPublished) throw ApiError(404)
      
      existing = await tx.booking.findMany({
        where: {
          appointmentTypeId: data.appointmentTypeId,
          scheduledStart: new Date(data.scheduledStart),
          status: { notIn: ['CANCELLED'] }
        }
      })
      bookedCapacity = existing.reduce((sum, b) => sum + b.capacity, 0)
      
      if (bookedCapacity + data.capacity > service.maxCapacityPerSlot) {
        throw new ApiError(409, 'Slot is no longer available. Please choose another time.')
      }
      
      customerId = data.customerId ?? actorId  // Admin can override
      
      scheduledEnd = new Date(new Date(data.scheduledStart).getTime() + service.durationMinutes * 60000)
      
      booking = await tx.booking.create({
        data: {
          customerId,
          appointmentTypeId: data.appointmentTypeId,
          resourceId: data.resourceId,
          scheduledStart: new Date(data.scheduledStart),
          scheduledEnd,
          capacity: data.capacity,
          status: service.requiresManualConfirm ? 'PENDING' : 'CONFIRMED',
          paymentStatus: service.requiresAdvancePayment ? 'PAID' : 'UNPAID',
          paymentAmount: service.advancePaymentAmount,
          paymentReference: data.paymentReference,
          bookedByAdminId: data.customerId ? actorId : null,
        }
      })
      
      // Create answers
      if (data.answers?.length) {
        await tx.bookingAnswer.createMany({
          data: data.answers.map(a => ({
            bookingId: booking.id,
            questionId: a.questionId,
            answer: a.answer
          }))
        })
      }
      
      // Audit log
      await tx.bookingAuditLog.create({
        data: {
          bookingId: booking.id,
          actorId,
          action: 'CREATED',
          metadata: { capacity: data.capacity, paymentReference: data.paymentReference }
        }
      })
      
      return booking
    })
  } finally {
    await redis.del(lockKey)  // Always release lock
  }

cancelBooking(bookingId, actorId, cancelReason):
  Validate actor owns booking OR is ORGANISER/ADMIN
  Update status to CANCELLED, store cancelReason
  Create audit log: action 'CANCELLED', metadata: { cancelReason }

rescheduleBooking(bookingId, newStart, actorId):
  Validate actor owns booking
  Validate newStart is future datetime
  Run same slot availability check as createBooking (inside transaction)
  Update scheduledStart, scheduledEnd, status='RESCHEDULED'
  Audit log: action 'RESCHEDULED', metadata: { oldStart, newStart }

--- apps/api/src/routes/bookings.routes.ts ---
GET    /            → list (role-based filter)
GET    /export      → CSV export [ORGANISER, ADMIN]
GET    /:id         → detail with answers + audit log
POST   /            → [authenticated] create booking
PATCH  /:id/cancel      → cancel
PATCH  /:id/reschedule  → reschedule
PATCH  /:id/confirm     → [ORGANISER, ADMIN] manual confirm
PATCH  /:id/complete    → [ORGANISER, ADMIN] mark complete
PATCH  /:id/no-show     → [ORGANISER, ADMIN] mark no-show

=== FRONTEND — COMPLETE BOOKING FLOW ===

--- apps/web/app/(dashboard)/book/page.tsx ---
Service selection (same as home page ServiceGrid but focused on booking)
On card click → navigate to /book/[serviceId]

--- apps/web/app/(dashboard)/book/[serviceId]/page.tsx ---
Multi-step booking wizard — steps shown in top progress bar:

Step 1 — Provider Selection (skip if only 1 resource):
  Show provider cards (avatar, name, role)
  Select by clicking — card gets purple border when selected
  "Any available" option at top

Step 2 — Date & Slot Selection:
  LEFT PANEL: Custom date picker calendar
    - Built with date-fns, NOT a heavy library
    - Grid of day buttons for current month
    - Dates before today: disabled + strikethrough
    - Dates with availability: normal
    - Selected date: brand-accent filled circle
    - Month navigation arrows
  
  RIGHT PANEL: Slot Grid (SlotGrid component)
    - Heading: "Available slots for [day name, date]"
    - React Query ['slots', serviceId, date, resourceId] — staleTime: 30s
    - Grid layout: 3 columns of slot pills
    - Loading: skeleton pills (10 placeholders)
    - Empty: "No slots available for this date. Try another day."
    - Slot pill states: available (click to select), booked/full (grayed, not clickable), selected (purple fill)
    - Below grid: "X slots available" count

Step 3 — Capacity (skip if manageCapacity=false):
  CapacitySelector: minus/plus buttons with current count
  "You're booking X spot(s)"
  Shows remaining capacity: "Y spots still available after your booking"

Step 4 — Questions Form:
  React Hook Form with Zod
  One field per BookingQuestion
  Required fields: show asterisk, validate on blur
  Optional fields: labeled "(optional)"
  "Continue" button → if requiresAdvancePayment → go to Step 5, else go to confirmation

Step 5 — MOCK PAYMENT (conditional):
  Only shown if service.requiresAdvancePayment = true
  
  UI Design (Stripe-inspired, dark themed):
    Heading: "Complete Payment"
    Left panel — Order Summary card:
      Service name
      Date & time
      Provider
      Capacity (N spots)
      Subtotal: ₹X
      Tax (18% GST): ₹Y
      Total: ₹Z (bold, larger)
    
    Right panel — Payment Form:
      "Payment Method" tabs: Credit/Debit Card | UPI | Net Banking
      
      Card tab (default):
        Name on card (text input)
        Card number (16-digit, auto-format with spaces: 1234 5678 9012 3456)
        Row: Expiry date (MM/YY) + CVV (3-digit, masked)
        Card type icon auto-detected from first digits (Visa/Mastercard placeholder icons)
      
      UPI tab:
        UPI ID input (format: username@bank)
        "Pay ₹Z" button
      
      Net Banking tab:
        Bank dropdown (list of 5-6 Indian banks: SBI, HDFC, ICICI, Axis, Kotak, PNB)
        "Proceed to Bank" button
      
      Main CTA: "Pay ₹Z" button (brand-accent, full width, large)
        → on click: show loading spinner for 1.5s
        → generate mock paymentReference: `TXN${Date.now()}`
        → proceed to confirmation step
      
      Security note: "🔒 This is a demo payment. No real charges will be made."
      Lock icon + "256-bit SSL encrypted" text below button

Final Step — Confirmation:
  Navigate to /book/confirm?bookingId=X

--- apps/web/app/(dashboard)/book/confirm/page.tsx ---
On mount: fetch booking detail from /api/bookings/:id

UI:
  - Animated checkmark (Framer Motion, green circle draws in)
  - Heading: "Booking Confirmed!" or "Booking Pending Confirmation" (if manual confirm)
  - Confirmation code: monospace pill with 1-click copy button
  - Details card: service name, provider, date, time, duration, location, capacity
  - Payment status badge (if paid: "Payment Received ₹X")
  - "Add to Google Calendar" button (builds Google Calendar URL with event details)
  - "Add to Outlook" button (builds Outlook URL)
  - "View My Appointments" button → /appointments
  - "Book Another" button → /book

=== SHARED HOOKS ===

--- apps/web/hooks/useSlots.ts ---
useSlots(serviceId, date, resourceId?): React Query with staleTime: 30000

--- apps/web/hooks/useBookings.ts ---
useBookings(filters): React Query ['bookings', filters]
useBooking(id): React Query ['bookings', id]
useCreateBooking(): mutation → invalidates ['slots', ...] and ['bookings']
useCancelBooking(): mutation
useRescheduleBooking(): mutation

When complete, confirm: "Phase 5 complete. Slot engine and full booking flow with mock payment done."
```

---

## PHASE 6 PROMPT — My Appointments + Reschedule + Organiser Views

```
Continue building the Appointment App. Full booking flow is complete.

TASK: Build appointment management views and organiser dashboard.

=== CUSTOMER VIEWS ===

--- apps/web/app/(dashboard)/appointments/page.tsx ---
"My Appointments" page

UI:
  - Tabs: "Upcoming" | "Past" | "Cancelled"
  - Each tab shows AppointmentCard list
  - Filter by service name (search input)
  - Empty states per tab with appropriate messages and illustrations

--- apps/web/components/appointments/AppointmentCard.tsx ---
Card shows:
  - Left: date column (day number large, month abbreviated, year small)
  - Middle: service name (bold), provider name, time range, location (MapPin icon)
  - Right: status badge + action buttons
  - Actions (based on status + timing):
    - CONFIRMED + future: "Reschedule" button + "Cancel" button
    - PENDING: "Pending Confirmation" label (non-interactive)
    - COMPLETED: "Book Again" button
    - CANCELLED: "Book Again" button

--- apps/web/app/(dashboard)/appointments/[id]/page.tsx ---
Appointment detail page

Sections:
  1. Header: Status badge (large) + confirmation code (copy button)
  2. Appointment Info card: service, provider avatar+name, date, time, duration, location
  3. Payment Info (if applicable): amount, payment reference, status badge
  4. Booking Questions & Answers (if any)
  5. Add to Calendar buttons (Google + Outlook)
  6. Actions: "Reschedule" | "Cancel" buttons (shown only if relevant)
  7. Audit trail section (collapsible): shows created/confirmed/rescheduled events with timestamps

--- apps/web/components/appointments/RescheduleModal.tsx ---
Sheet/drawer from right side:
  "Reschedule Appointment" heading
  Current booking summary at top (greyed out)
  DatePicker (reuse the same calendar component)
  SlotGrid (reuse, showing new availability)
  "Confirm Reschedule" button
  On success: toast "Appointment rescheduled" + close modal + invalidate queries

=== ORGANISER VIEWS ===

--- apps/web/app/(dashboard)/organiser/page.tsx ---
Organiser Dashboard

Stats row (4 cards):
  - Total Bookings This Month (CalendarDays icon, teal)
  - Confirmed (CheckCircle icon, green)
  - Pending (Clock icon, yellow)
  - Cancelled (XCircle icon, red)
React Query: ['analytics', 'summary']

Recent Bookings table (last 10):
  Columns: Customer, Service, Date/Time, Provider, Status, Actions
  Actions: Confirm (if PENDING), Complete, No-Show, View
  Filter tabs: All | Pending | Confirmed | Completed

--- apps/web/app/(dashboard)/organiser/bookings/page.tsx ---
Full bookings management table with:
  - Search by customer name or confirmation code
  - Filter by: service, status, date range
  - Sort by: date, status
  - Pagination (20 per page)
  - Each row: customer avatar+name, service, date, time, status badge, confirmation code, actions
  - Inline action buttons: Confirm / Complete / No-Show (with confirmation dialogs)
  - Booking detail slide-over panel (Sheet component) on row click

--- apps/web/app/(dashboard)/organiser/calendar/page.tsx ---
Weekly Calendar View

Design:
  - CSS Grid: 7 columns (days) × 24 rows (hours, 8am-8pm visible)
  - Each booking appears as a colored block positioned by time
  - Block colors by status: confirmed=teal, pending=yellow, cancelled=red/faded, completed=gray
  - Block shows: customer name (truncated), time, service name
  - Click block → booking detail slide-over panel
  - Week navigation: prev/next week buttons + "Today" button
  - Current time indicator: red horizontal line at current hour position
  - No external calendar library — pure CSS Grid + date-fns

=== ADMIN VIEWS ===

--- apps/web/app/(dashboard)/admin/page.tsx ---
Admin Dashboard
Stats: Total Users, Total Organizers, Total Services, Total Bookings (all time)
Quick access cards to Users, Analytics pages

--- apps/web/app/(dashboard)/admin/users/page.tsx ---
Users management table:
  Columns: Avatar+Name, Email, Role badge, Status (Active/Inactive), Joined date, Actions
  Actions: Toggle Active/Inactive | Change Role (dropdown: CUSTOMER/ORGANISER/ADMIN)
  Search by name or email
  Filter by role

--- apps/web/app/(dashboard)/profile/page.tsx ---
Two sections:
  1. Personal Info form: name, email (read-only), phone — edit + save
  2. My Appointments preview: 3 most recent, link to /appointments

When complete, confirm: "Phase 6 complete. All appointment management and organiser views done."
```

---

## PHASE 7 PROMPT — Analytics + Seed Data

```
Continue building the Appointment App. All core views are complete.

TASK: Build analytics API + charts frontend + seed data.

=== BACKEND ANALYTICS ===

--- apps/api/src/services/analytics.service.ts ---

getSummary(organiserId?: string):
  // If organiserId provided: filter by organiser's services
  // If admin: all services
  Return:
    totalBookings: count all non-cancelled
    confirmedCount: count CONFIRMED
    pendingCount: count PENDING
    cancelledCount: count CANCELLED
    completedCount: count COMPLETED
    noShowCount: count NO_SHOW
    revenueTotal: sum of paymentAmount where paymentStatus=PAID (for this month)

getPeakHours(organiserId?):
  GROUP BY EXTRACT(HOUR FROM scheduledStart)
  Return array of { hour: 0-23, count: number }
  Frontend formats: "9 AM", "2 PM", etc.

getProviderUtilization(organiserId?):
  For each resource: count bookings / theoretical max (working hours / duration × days in month)
  Return array of { resourceName: string, utilization: number (0-100) }

getTrend(organiserId?, days = 30):
  GROUP BY DATE(scheduledStart) for last N days
  Return array of { date: "YYYY-MM-DD", count: number }
  Fill in missing dates with count: 0

getByService(organiserId?):
  GROUP BY appointmentTypeId
  Return array of { serviceName: string, count: number, revenue: number }

--- apps/api/src/routes/analytics.routes.ts ---
All routes: [ORGANISER, ADMIN]
GET /summary
GET /peak-hours
GET /provider-utilization
GET /trend?days=30
GET /by-service

=== FRONTEND ANALYTICS ===

--- apps/web/app/(dashboard)/admin/analytics/page.tsx ---
AND accessible for organiser at /organiser (as charts below the stats)

Using recharts — all charts use dark theme colors from CSS vars.

Chart 1: Area Chart — Bookings Trend (30 days)
  - X: date labels (show every 5th label to avoid crowding)
  - Y: booking count
  - Fill: brand-accent with opacity 0.2
  - Stroke: brand-accent
  - Tooltip: custom dark-themed popup

Chart 2: Bar Chart — Peak Booking Hours
  - X: hour labels (9 AM, 10 AM, etc.)
  - Y: booking count
  - Bars: brand-accent color
  - Highlight: tallest bar in teal

Chart 3: Pie Chart — Bookings by Status
  - Colors: confirmed=teal, pending=yellow, cancelled=red, completed=gray
  - Custom legend below chart
  - Tooltip with count + percentage

Chart 4: Bar Chart — Provider Utilization %
  - Horizontal bars for readability with multiple providers
  - Color gradient: <50% = red, 50-80% = yellow, >80% = teal

=== SEED DATA ===

--- apps/api/prisma/seed.ts ---

Create in this exact order:

1. Clear all tables (deleteMany in reverse dependency order)

2. Create users:
   admin = { email: 'admin@demo.com', password: hash('Admin@1234'), name: 'Admin User', role: 'ADMIN', isActive: true }
   organiser = { email: 'dr.sharma@demo.com', password: hash('Doctor@1234'), name: 'Dr. Priya Sharma', role: 'ORGANISER', isActive: true }
   customer = { email: 'customer@demo.com', password: hash('Customer@1234'), name: 'Rahul Mehta', role: 'CUSTOMER', isActive: true }
   customer2 = { email: 'customer2@demo.com', password: hash('Customer@1234'), name: 'Anjali Desai', role: 'CUSTOMER', isActive: true }

3. Create AppointmentType "Dental Checkup":
   organiserId: organiser.id
   durationMinutes: 30
   maxCapacityPerSlot: 1
   slotScheduleType: WEEKLY
   isPublished: true
   requiresAdvancePayment: true
   advancePaymentAmount: 500.00
   location: "Dr. Sharma Dental Clinic, FC Road, Pune 411005"
   shareToken: crypto.randomUUID()

4. Create Resource for Dental Checkup:
   name: "Dr. Priya Sharma"
   userId: organiser.id
   resourceType: USER

5. Create WorkingHours for Dental Checkup:
   Monday-Friday: dayOfWeek 1-5, startTime: "09:00", endTime: "17:00", isActive: true
   Saturday: dayOfWeek 6, startTime: "10:00", endTime: "14:00", isActive: true

6. Create BookingQuestions for Dental Checkup:
   Q1: "Any known allergies to medication or anaesthesia?" required: true sequence: 0
   Q2: "Was this a referral? If yes, by whom?" required: false sequence: 1
   Q3: "Are you on any current medications?" required: false sequence: 2

7. Create AppointmentType "Conference Room A":
   durationMinutes: 60
   maxCapacityPerSlot: 10
   manageCapacity: true
   slotScheduleType: WEEKLY
   resourceType: RESOURCE
   isPublished: true
   location: "Floor 3, Innovation Hub, Baner, Pune"

8. Create Resource for Conference Room A:
   name: "Conference Room A"
   resourceType: RESOURCE
   userId: null

9. Create WorkingHours for Conference Room A:
   Monday-Friday: 08:00 to 20:00

10. Create 8 bookings spread across past 14 days for analytics:
    - 3 CONFIRMED (customer + dental, different past dates, paymentStatus: PAID)
    - 2 COMPLETED (customer + dental, paymentStatus: PAID)
    - 1 CANCELLED (customer2 + dental, cancelReason: "Schedule conflict")
    - 1 NO_SHOW (customer + conference room)
    - 1 PENDING (customer2 + dental) — for today/tomorrow
    
    For each booking create a BookingAuditLog entry with action 'CREATED'
    For COMPLETED bookings: also create 'CONFIRMED' + 'COMPLETED' audit logs
    For CANCELLED: also create 'CANCELLED' audit log with reason in metadata

11. Create AIChatSession for customer (empty messages array, for testing AI)

Log: "Seed complete: 4 users, 2 services, 8 bookings"

When complete, confirm: "Phase 7 complete. Analytics API, charts, and seed data done."
```

---

## PHASE 8 PROMPT — AI Chat Widget (Sarvam AI)

```
Continue building the Appointment App. All core features are complete.

TASK: Build the AI booking assistant — floating chat widget with voice support.

=== BACKEND AI SERVICE ===

--- apps/api/src/services/ai.service.ts ---

import axios from 'axios'
import FormData from 'form-data'
import { env } from '../config/env'

const sarvamClient = axios.create({
  baseURL: env.SARVAM_API_BASE,
  headers: { 'api-subscription-key': env.SARVAM_API_KEY }
})

speechToText(audioBuffer: Buffer, languageCode = 'hi-IN'):
  form = new FormData()
  form.append('file', audioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' })
  form.append('language_code', languageCode)
  form.append('model', 'saarika:v2')
  POST /speech-to-text with form
  Return: { transcript: string }
  On error: throw ApiError(503, 'Speech recognition unavailable')

buildSystemPrompt(availableSlots, sessionLanguage):
  Return multi-line system prompt:
  - Today's date and time
  - Role: helpful appointment booking assistant
  - Rules: ONLY suggest slots from the provided list (never invent)
  - When user wants to book: understand service/date/time preference, suggest best match, ask for confirmation
  - On confirmation: respond with JSON action: {"action":"BOOK","appointmentTypeId":"...","scheduledStart":"...","resourceId":"...","capacity":1}
  - Language: respond in same language user writes in
  - Available slots: JSON.stringify(availableSlots)

chatWithAI(message, sessionHistory, availableSlots, languageCode):
  Fetch all published services with their available slots for next 3 days (background query)
  
  response = POST /v1/chat/completions {
    model: 'sarvam-m',
    messages: [...sessionHistory, { role: 'user', content: message }],
    system: buildSystemPrompt(availableSlots, languageCode)
  }
  
  responseText = response.data.choices[0].message.content
  
  // Check if response contains booking action JSON
  bookingAction = extractBookingAction(responseText)
  
  Return: { responseText, bookingAction, fullMessage: response.data.choices[0].message }

extractBookingAction(text):
  Try to parse JSON block from response (look for {"action":"BOOK"...} pattern)
  If found: return parsed action object
  Else: return null

textToSpeech(text, languageCode = 'hi-IN'):
  POST /text-to-speech {
    inputs: [text.slice(0, 500)],  // Limit length
    target_language_code: languageCode,
    speaker: 'meera',
    model: 'bulbul:v1'
  }
  Return: base64 audio string from response

getOrCreateSession(userId, sessionId?):
  If sessionId: fetch session, check if expired (updatedAt > 24h ago → create new)
  Else: create new session with empty messages []
  Return session

saveMessage(sessionId, role, content):
  Append { role, content, timestamp: new Date() } to session.messages
  Update session.updatedAt

--- apps/api/src/controllers/ai.controller.ts ---

POST /chat:
  body: { message, sessionId?, languageCode? }
  
  1. Get/create session
  2. Save user message to session
  3. Fetch available slots for next 7 days across all published services (slot.service)
  4. Call ai.service.chatWithAI(message, session.messages, availableSlots, languageCode)
  5. Save AI response to session
  6. Return: { responseText, bookingAction, sessionId }

POST /voice:
  body: multipart { audio: blob, sessionId?, languageCode? }
  
  1. Receive audio buffer (multer memoryStorage)
  2. Call ai.service.speechToText(buffer, languageCode) → transcript
  3. Same flow as /chat using transcript as message
  4. Call ai.service.textToSpeech(responseText, languageCode) → audioBase64
  5. Return: { transcript, responseText, bookingAction, audioBase64, sessionId }

POST /confirm-booking:
  body: { sessionId, appointmentTypeId, resourceId, scheduledStart, capacity? }
  
  Call booking.service.createBooking with actorId = req.user.id
  Save "Booking confirmed by AI" to audit log action: 'AI_BOOKED'
  Return: { booking }

--- apps/api/src/routes/ai.routes.ts ---
All routes: [authenticate]
POST /chat
POST /voice → multer({ storage: memoryStorage(), limits: { fileSize: 10MB } }).single('audio')
POST /confirm-booking

=== FRONTEND AI WIDGET ===

--- apps/web/hooks/useVoiceRecorder.ts ---
MediaRecorder wrapper:
  startRecording(): request mic permission, start MediaRecorder, collect chunks
  stopRecording(): stop recorder, assemble Blob from chunks, return Blob
  isRecording: boolean
  error: string | null (permission denied message)

--- apps/web/hooks/useAIChat.ts ---
State: messages[], sessionId, isLoading, isRecording, chatOpen
sendMessage(text): POST /api/ai/chat → append user + AI messages
sendVoice(blob): POST /api/ai/voice (multipart) → append transcript + AI response → play audio
confirmBooking(action): POST /api/ai/confirm-booking → show success toast + append confirmation message
clearSession(): reset messages, sessionId

--- apps/web/components/ai/ChatWidget.tsx ---

FLOATING BUBBLE:
  - Fixed position: bottom-6, right-6
  - 56px circle, brand-accent background, white MessageCircle icon
  - Unread indicator: small red dot top-right (if AI sent a proactive message)
  - Click: Framer Motion spring animation to expand chat panel
  - On mobile: expands to full screen (90vh)

CHAT PANEL (380px wide, 560px tall):
  Header:
    - App logo (small) + "Booking Assistant" title
    - Language selector: dropdown — English / हिंदी / मराठी (changes languageCode sent to API)
    - Close button (X icon)
  
  Messages area (scrollable):
    - AI messages: left-aligned, avatar (app logo circle), surface-3 background bubble
    - User messages: right-aligned, surface-1 background bubble, no avatar
    - Timestamp below each message (small, muted)
    - Welcome message on first open: "Hi! I can help you book appointments. Try saying 'Book a dental checkup for tomorrow' or tap the mic."
    - Loading state: animated dots (3 pulsing dots, brand-accent color)
    - SlotSuggestionCard rendered inline when AI returns a bookingAction
  
  Input area:
    - Text input (surface-3, rounded-xl, flex-1)
    - Send button (brand-accent, arrow icon)
    - VoiceButton (mic icon, circular, surface-3)
      - Hold → starts recording, shows pulsing red border animation (Framer Motion)
      - Release → stops, shows "Transcribing..." in messages
      - Auto-plays AI audio response

--- apps/web/components/ai/SlotSuggestionCard.tsx ---
Rendered inside chat when AI returns bookingAction:

Card (surface-3 background, brand-accent border):
  - CalendarCheck icon + "Suggested Booking" label
  - Service name (bold)
  - Date: formatted nicely (e.g., "Monday, 5th May 2025")
  - Time: "10:00 AM – 10:30 AM"
  - Provider: "Dr. Priya Sharma"
  - Two buttons:
    - "Confirm This Booking" (green, CheckCircle icon) → calls confirmBooking()
    - "Choose Different Time" (ghost, X icon) → sends "Show me other times" message to AI

--- apps/web/components/ai/VoiceButton.tsx ---
Hold-to-speak button:
  - Circular button, 44px, mic icon
  - onMouseDown / onTouchStart: startRecording()
  - onMouseUp / onTouchEnd: stopRecording() → sendVoice(blob)
  - While recording: Framer Motion pulsing ring animation (scale 1→1.2→1, red color)
  - aria-label: "Hold to speak"

Add ChatWidget to the dashboard layout (apps/web/app/(dashboard)/layout.tsx):
  Render <ChatWidget /> at the bottom of the layout, outside main content area.

When complete, confirm: "Phase 8 complete. AI chat widget with voice support done."
```

---

## PHASE 9 PROMPT — Polish, Mobile & Final Touches

```
Continue building the Appointment App. All features are implemented.

TASK: Final polish pass — animations, mobile, error boundaries, and production readiness.

=== FRAMER MOTION ANIMATIONS ===

Add these animations throughout the app:

1. Page transitions (apps/web/app/(dashboard)/layout.tsx):
   Wrap page content in motion.div:
   initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}

2. ServiceCard hover:
   whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}

3. Slot pill selection:
   whileTap={{ scale: 0.95 }}

4. Booking confirmation checkmark:
   Draw-on animation for checkmark SVG inside green circle
   Use pathLength animation: initial 0 → animate 1 over 0.5s with ease-out

5. Chat widget expand/collapse:
   AnimatePresence wrapping the chat panel
   initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
   exit={{ scale: 0.8, opacity: 0, y: 20 }}
   transition: spring, stiffness: 300, damping: 25

6. Modal dialogs:
   Same as chat widget expand animation

7. Sidebar collapse/expand:
   motion.div width animation: spring transition

=== LOADING SKELETONS ===

Create apps/web/components/shared/LoadingSkeleton.tsx with variants:
  ServiceCardSkeleton: matches ServiceCard layout
  AppointmentCardSkeleton: matches AppointmentCard layout
  SlotGridSkeleton: 12 pill-shaped skeletons in 3-column grid
  TableRowSkeleton: row with 5 cells
  StatCardSkeleton: stat card shape

Apply in every component that fetches data:
  if (isLoading) return <ServiceCardSkeleton /> (or array of them)

=== TOAST NOTIFICATIONS ===

Use sonner Toaster. Apply toasts on ALL mutations:
  - Booking created → "Booking confirmed! ✓" (success, green)
  - Booking cancelled → "Appointment cancelled" (info, neutral)
  - Booking rescheduled → "Appointment rescheduled ✓" (success)
  - Slot taken (409 error) → "This slot was just taken. Please choose another." (error, red)
  - Auth errors → show error message from API response
  - Form validation errors → "Please fill in all required fields" (warning)
  - Payment mock success → "Payment processed! Ref: TXN..." (success)

=== ERROR HANDLING ===

--- apps/web/app/error.tsx ---
Root error boundary:
  Shows friendly error page with "Something went wrong" + retry button + link to home

--- apps/web/components/shared/EmptyState.tsx ---
Props: icon, title, description, actionLabel?, onAction?
Use in: services list, appointments list, slot grid, bookings table

=== EMPTY STATE ILLUSTRATIONS ===
Use lucide-react icons (large, 64px, muted color) as illustrations:
  No services: Calendar icon
  No appointments: CalendarX icon
  No slots: Clock icon
  No bookings: BookOpen icon

=== DARK/LIGHT MODE TOGGLE ===
In Topbar: Moon/Sun icon button using useTheme() from next-themes
Animate the icon switch with Framer Motion rotate: 0 → 360 on toggle

=== MOBILE RESPONSIVE ===

Verify and fix:
  - Service grid: 1 column on mobile, 2 on sm, 3 on lg
  - Booking wizard: full-width steps, hide left/right panel split (stack vertically)
  - Calendar date picker: full width on mobile
  - Slot grid: 2 columns on mobile
  - Tables: horizontal scroll on mobile
  - Organiser calendar: hide on mobile, show list view instead
  - Bottom nav bar: visible on mobile only (below md breakpoint)

=== SHARE LINK FEATURE ===

In organiser service edit page, add "Share Link" section:
  - If unpublished: "Share this appointment with clients before publishing"
  - URL: `${NEXT_PUBLIC_APP_URL}/book/share/${service.shareToken}`
  - Copy button (one-click, shows "Copied!" toast)

Add route: apps/web/app/(dashboard)/book/share/[token]/page.tsx
  - Fetch service by share token from GET /api/services/share/:token
  - Renders same booking flow as /book/[serviceId]
  - Shows "Preview" badge in header indicating this is an unpublished service

=== BOOKING EXPORT (Bonus) ===

GET /api/bookings/export endpoint:
  Query: from (YYYY-MM-DD), to (YYYY-MM-DD)
  Generates CSV with: confirmationCode, customerName, customerEmail, service, provider, scheduledStart, status, paymentStatus, paymentAmount
  Response: Content-Type: text/csv, Content-Disposition: attachment; filename="bookings-export.csv"

In organiser bookings page, add "Export CSV" button (top right, Download icon).

=== GIT HYGIENE ===

Initialize git with these conventional commits structure (document these):
  feat: initial project setup with monorepo, docker, prisma
  feat(auth): implement JWT auth with OTP verification
  feat(services): appointment type CRUD with organiser controls
  feat(booking): slot engine with double-booking prevention
  feat(booking): mock payment flow with GST calculation
  feat(ai): Sarvam AI chat + voice booking assistant
  feat(analytics): recharts dashboard with peak hours and utilization
  fix(slots): handle timezone edge cases in slot generation
  chore: add seed data and demo accounts

=== FINAL CHECKLIST ===

Verify these work end-to-end before demo:
  □ Signup → OTP → Login (all 3 roles: customer, organiser, admin)
  □ Organiser creates service with weekly hours + 2 questions + advance payment
  □ Customer books service → sees payment screen → confirms → gets confirmation code
  □ Two browser tabs simultaneously try to book same slot — only one succeeds
  □ Customer reschedules appointment
  □ Customer cancels appointment
  □ Organiser views calendar with bookings
  □ Admin views analytics charts (seed data shows in charts)
  □ AI chat: type "Book a dental checkup for tomorrow" → AI suggests real slot → confirm
  □ Voice: hold mic, say "Book dental" → transcription shown → AI responds with audio

When complete, confirm: "Phase 9 complete. App is production-ready for hackathon demo."
```

---

## QUICK REFERENCE

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | Admin@1234 |
| Organiser | dr.sharma@demo.com | Doctor@1234 |
| Customer | customer@demo.com | Customer@1234 |
| Customer 2 | customer2@demo.com | Customer@1234 |

### API Base URLs
| Service | URL |
|---------|-----|
| Backend API | http://localhost:4000/api |
| Frontend | http://localhost:3000 |
| Prisma Studio | http://localhost:5555 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### One-Command Setup
```bash
npm run setup
# Does: docker-compose up → wait 5s → prisma migrate → seed → start both servers
```

### Mock Payment Logic
```
Any card number accepted → 1.5s delay → paymentReference = "TXN" + Date.now()
No real API calls. paymentStatus set to "PAID" in booking record.
GST calculation: advancePaymentAmount × 1.18 (18% GST)
```

### Sarvam AI Endpoints Used
| Endpoint | Purpose |
|----------|---------|
| POST /speech-to-text | Voice → text transcription |
| POST /v1/chat/completions | Booking intent understanding |
| POST /text-to-speech | Text → audio response |

### Redis Key Patterns
| Key | Purpose | TTL |
|-----|---------|-----|
| `otp:{otpToken}` | OTP during signup | 300s |
| `blacklist:{jwt}` | Revoked tokens | JWT expiry duration |
| `reset:{token}` | Password reset token | 600s |
| `slot_lock:{serviceId}:{start}:{resourceId}` | Booking race condition prevention | 300s |

### Key Evaluation Points (Judges)
1. **Double booking test**: Open two incognito windows, both pick same slot, click confirm simultaneously — only one succeeds with 409 error shown
2. **Real-time slots**: After booking in Tab A, Tab B's slot grid auto-refreshes (30s stale) and shows the slot as taken
3. **AI demo script**: Say "I want to book dental checkup for tomorrow morning" — AI responds with real slot from DB, show SlotSuggestionCard, tap Confirm
4. **Audit trail**: Every state change logged — show in booking detail page
5. **Schema quality**: No JSON blobs for structured data, proper foreign keys, enums used correctly

---

*Generated for Odoo Hackathon — Appointment App: The Perfect Booking System*
