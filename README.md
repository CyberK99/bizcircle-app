# BizCircle

A mobile-first community platform where small business owners (5-50 employees) find, connect with, and support peers in their industry and local area.

## The Problem

Small business owners lack a structured way to connect with peers. When they need an emergency plumber, a last-minute worker, or advice from someone who understands their challenges, they have nowhere to turn. Existing solutions are too expensive (BNI: $779-$1,400/yr), too shallow (Alignable: 1.3-star rating), or too unstructured (WhatsApp/Facebook groups).

## How It Works

BizCircle uses an **Industry x Geography matrix** to automatically place users into relevant groups. A restaurant owner in Travis County, TX is automatically joined to "Restaurants in Travis County, TX" alongside other nearby restaurant owners.

### Core Features

- **Auto-matched Groups** — Join your industry + local community automatically based on your business profile
- **Group Discussions** — Threaded posts with real-time updates, likes, and post types (discussion, question, announcement)
- **Emergency Mutual Aid** — SOS system with tiered escalation to get help from nearby businesses fast
- **Direct Messaging** — Real-time 1:1 chat with unread indicators
- **Business Profiles** — Verification badges, trust scores, and contact info
- **Push Notifications** — Stay informed about group activity and emergency requests

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native + Expo (Expo Router) |
| Backend | Supabase (PostgreSQL + Realtime + Auth + Storage + Edge Functions) |
| State Management | TanStack React Query + Zustand |
| Styling | NativeWind (Tailwind for RN) |
| Forms | React Hook Form + Zod |
| Push Notifications | Expo Notifications + Supabase Edge Functions |
| Geolocation | Census Geocoder API (free, no key required) |

## Project Structure

```
bizcircle-app/
├── app/                          # Expo Router file-based routing
│   ├── (tabs)/                   # Main tab navigator (Home, Groups, Emergency, Marketplace, Profile)
│   ├── auth/                     # Login, Register
│   ├── onboarding/               # Multi-step business setup
│   ├── group/                    # Group detail, post detail
│   ├── emergency/                # Emergency creation and detail
│   ├── messages/                 # Conversation list, chat
│   └── business/                 # Business profile
├── src/
│   ├── components/               # Reusable UI components
│   ├── hooks/                    # React Query hooks (groups, posts, emergency, messages)
│   ├── lib/                      # Supabase client, auth, geocoder, storage
│   ├── providers/                # Auth, Query, Notification providers
│   ├── types/                    # TypeScript types
│   └── utils/                    # Constants, formatters
└── supabase/
    ├── migrations/               # Database schema (23 tables, 37 RLS policies, 12 triggers)
    ├── functions/                # Edge Functions (push notifications, emergency escalation)
    └── seed.sql                  # Industry taxonomy + pilot county data
```

## Getting Started

### Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A [Supabase](https://supabase.com) project (free tier works)
- iOS Simulator (macOS) or Android Emulator, or Expo Go on a physical device

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/CyberK99/bizcircle-app.git
   cd bizcircle-app
   npm install
   ```

2. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to the SQL Editor and run the migration file:
     ```
     supabase/migrations/00001_initial_schema.sql
     ```
   - Then run the seed data:
     ```
     supabase/seed.sql
     ```
   - Create a **private** storage bucket called `verification-docs`
   - Create a **public** storage bucket called `avatars`

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Add your Supabase URL and anon key from the Supabase dashboard (Settings > API):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Run the app**
   ```bash
   npx expo start
   ```
   Scan the QR code with Expo Go, or press `i` for iOS Simulator / `a` for Android Emulator.

## Database

The schema includes 23 tables with Row-Level Security enabled on every table:

- **profiles** — User accounts (extends Supabase Auth)
- **businesses** — Central entity, one per user
- **industries** — Two-level hierarchy (18 sectors, 87 sub-industries)
- **counties** — US county reference with FIPS codes
- **groups** — Auto-created at the industry x county intersection
- **posts / post_likes** — Group discussions with threaded replies
- **conversations / messages** — Direct messaging
- **emergency_requests / emergency_responses** — Mutual aid system
- **listings / listing_responses** — Resource marketplace (Phase 2)
- **reviews** — Trust score system
- **verification_submissions** — Business verification documents
- **connections** — Business-to-business peer relationships
- **notifications / push_tokens** — Push notification infrastructure

Key triggers handle auto-group creation on business signup, member count tracking, trust score recomputation, and reply/like count updates.

## Emergency Escalation

The mutual aid system uses tiered notification expansion:

| Tier | Who Gets Notified | Trigger |
|------|-------------------|---------|
| 1 | Same group members | Immediate |
| 2 | Same industry, adjacent counties | Manual "Share Wider" button |
| 3 | All industries, wider area | Manual escalation |
| 4 | All verified businesses in metro | Manual escalation |

## Pilot Cities

The seed data includes counties and adjacency data for 5 pilot metros:

- Austin, TX (Travis County + 7 surrounding)
- Nashville, TN (Davidson County + 7 surrounding)
- Denver, CO (Denver County + 7 surrounding)
- Charlotte, NC (Mecklenburg County + 7 surrounding)
- Portland, OR (Multnomah County + 6 surrounding)

## Roadmap

### Phase 1 (Current) — MVP
Auth, onboarding, groups, posts, emergency requests (Tier 1), DMs, verification, push notifications

### Phase 2 — Post-Launch
Automated emergency escalation (full 4-tier), listings marketplace, staff sharing, referrals, reviews & trust scores, social auth

### Phase 3 — Scale
Group deals, automated verification, payments/membership, multilingual support, analytics, web companion

## License

MIT
