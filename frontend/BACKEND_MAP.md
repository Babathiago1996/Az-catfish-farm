# Frontend-to-backend module map

| Frontend | Backend |
|---|---|
| `/login`, `/forgot-password`, `/reset-password` | `/api/auth/*` |
| `/dashboard` | `/api/dashboard` |
| `/ponds` | `/api/ponds` |
| `/stocking` | `/api/stocking` |
| `/activities` | `/api/daily-activities` |
| `/feeding` | `/api/feeding` |
| `/water-management` | `/api/water-management` |
| `/growth` | `/api/growth` |
| `/mortality` | `/api/mortality` |
| `/sales` | `/api/sales`, `/api/invoices` |
| `/expenses` | `/api/expenses` |
| `/inventory` | `/api/inventory` |
| `/customers` | `/api/customers` |
| `/suppliers` | `/api/suppliers` |
| `/reports` | `/api/reports` |
| `/analytics` | `/api/analytics` |
| `/notifications` | `/api/notifications` |
| `/media` | `/api/gallery` |
| `/settings` | `/api/settings` |
| `/` `/about` `/overview` `/gallery` `/contact` | `/api/public/*` |

The public `/gallery` route is deliberately separate from the authenticated management gallery at `/media`, avoiding a URL collision between the public website and admin portal.
