# AZ Fish Farm Management System — Frontend

A polished Next.js 15 + React 19 frontend designed around the supplied AZ Fish Farm Express/Mongoose API.

## Stack

- Next.js 15 App Router
- React 19 (JavaScript, no TypeScript)
- Tailwind CSS 4
- shadcn-style UI primitives with Radix UI
- React Hook Form + Zod
- Axios
- Framer Motion
- Recharts
- Lucide React
- Sonner
- next-themes

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_API_URL` to the backend API root, normally `http://localhost:5000/api`.
3. Install dependencies with `npm install`.
4. Start the frontend with `npm run dev`.
5. Open `http://localhost:3000`.

The backend already expects `Authorization: Bearer <token>`, so the frontend stores the access token locally and injects it into protected API requests.

## Important backend compatibility notes

The supplied backend currently contains two settings controller calls to `authService.changeEmail` and `authService.updateAvatar`, but those functions are not exported by `services/authService.js`. The frontend therefore keeps email/avatar controls visible but marks those actions as unavailable until the backend exports are repaired. Farm logo upload uses the working `/api/settings/farm/logo` endpoint.

There are also a few backend naming inconsistencies in historical populate/select fields (for example `pondName` vs `name`). The frontend normalizes pond display values defensively without changing the API contract.
