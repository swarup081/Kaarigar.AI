# 🧶 Kaarigar

> **AI-Driven Market Linkage & Smart Cataloging for Marginalized Artisans**
> 
> SIH 2026 — Problem Statement 26090 | Theme: Heritage & Culture

## What is Kaarigar?

Kaarigar is the **missing "listing creation & pricing intelligence" layer** that helps artisans turn raw products into professional, priced, multilingual marketplace listings — using just their phone camera and voice.

**We are NOT another marketplace.** We feed artisans' products INTO existing marketplaces (ONDC, GeM, Amazon Karigar, Flipkart Samarth) by automating the catalog creation step that nobody has solved.

## Core Features

| Feature | Description |
|---|---|
| 📸 **Smart Photo Studio** | Guided camera with lighting detection, gyroscope leveling, and AI background removal |
| 🎤 **Voice-to-Listing** | Speak in your language → get a professional bilingual listing (Bhashini ASR + LLM) |
| 💰 **Pricing Copilot** | Transparent price suggestion using cost-plus algorithm + market data + AI, with visible "why" |
| 🚀 **One-Tap Publish** | Push listings to ONDC, WhatsApp, storefront — from a single tap |
| 📦 **Shareable Catalog** | Subdomain storefront, PDF catalog, image collage for WhatsApp sharing |
| 📴 **Works Offline** | Full offline-first architecture — capture, record, draft without internet |

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo SDK 52+ (TypeScript) |
| Auth | Firebase Phone Auth (free 10K SMS/month) |
| Backend | Supabase (Postgres + Storage + Edge Functions) |
| AI Services | Python/FastAPI (separate microservices) |
| Offline | expo-sqlite + outbox sync pattern |
| Languages | Hindi, English, Tamil, Bengali |

## Repository Structure

```
├── apps/
│   ├── mobile/          # React Native Expo app
│   ├── backend/         # Supabase backend (migrations, edge functions)
│   └── ai-services/     # AI microservices (separate team member)
├── packages/
│   └── shared-types/    # Shared TypeScript types
└── docs/                # Documentation, API contracts, architecture
```

## Team Ownership

| Directory | Owner |
|---|---|
| `apps/mobile/`, `apps/backend/`, `packages/`, `docs/` | Swarup (App + Backend) |
| `apps/ai-services/` | AI teammate (AI/ML services) |

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Expo CLI
- Supabase CLI (for backend)

### Setup
```bash
# Install dependencies
pnpm install

# Start mobile app
pnpm dev:mobile

# Start Supabase local dev
cd apps/backend && npx supabase start
```

## Architecture

```
Mobile App (Expo) → Supabase Edge Functions (Gateway) → AI Services (Friend's Server)
       ↕                      ↕
   SQLite (offline)     Supabase Postgres + Storage
```

## License

MIT
