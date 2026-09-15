# Akedly — أكّدلي

Public marketing website for Akedly, an order automation platform for Egyptian e-commerce stores (Shopify, WooCommerce, and custom platforms). Automates WhatsApp order confirmation, cancellation recovery, prepaid payments, and courier creation.

## Stack

- Next.js (App Router, TypeScript, Tailwind CSS v4)
- Custom lightweight i18n (English / Arabic, RTL-aware) via `app/[locale]`
- No backend — this is the marketing site and login/register UI only

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/en` or `/ar` based on browser language.

## Structure

- `app/[locale]/` — routes (home, pricing, login, register, privacy, terms)
- `components/sections/` — homepage sections
- `components/ui/` — design system primitives
- `components/layout/` — navbar, footer, language switcher
- `components/auth/` — login/register form UI
- `config/` — structural content (pricing plans, integrations, features, demo data)
- `lib/i18n/` — locale config and EN/AR dictionaries
- `proxy.ts` — locale detection and redirect (Next.js 16 renamed `middleware.ts`)

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint
