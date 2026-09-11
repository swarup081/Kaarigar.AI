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
| Mobile | React Native + Expo SDK 57 (TypeScript) |
| Auth | Firebase phone auth planned; local artisan identity currently used |
| Backend | Supabase (Postgres + Storage + Edge Functions) |
| AI | Direct Gemini HTTPS calls + on-phone listing/pricing logic; optional hosted Python APIs |
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

## AI Pipeline

Image enhancement and cost-based pricing run **on the phone**. The standalone app
calls Gemini directly over the internet for speech, bilingual listings and pricing advice.
Configure keys and connections under **Profile → API & environment**. No laptop server is needed.

- **[Standalone APK setup and build](docs/STANDALONE_APP.md)** — current mobile workflow

- **[docs/RUNNING_ON_A_PHONE.md](docs/RUNNING_ON_A_PHONE.md)** — build and run on a real device
- [docs/AI_INTEGRATION.md](docs/AI_INTEGRATION.md) — how the pipeline fits together
- [apps/ai-services/AI_REQUIREMENTS.md](apps/ai-services/AI_REQUIREMENTS.md) — which models, and why
- [apps/mobile/services/image/](apps/mobile/services/image/README.md) — on-device image pipeline

```bash
GEMINI_API_KEY=your_key python apps/ai-services/smoke_test.py
```

## Architecture

```
Standalone Mobile App → Google Gemini (HTTPS)
       ↕
   SQLite + native images + local pricing
       ↕ (optional)
   Supabase / hosted API gateway
```

## License

MIT
