# AZ Fish Farm Management System

A modern full-stack catfish farm management platform designed for a single farm owner.

The system manages the complete farm lifecycle, including:

- Pond management
- Fish stocking
- Daily farm activities
- Feeding
- Water management
- Fish growth
- Mortality
- Sales
- Expenses
- Inventory
- Reports
- Notifications
- Email automation
- Farm gallery
- Website contact messages
- Public farm website

## Technology Stack

### Frontend

- Next.js 15
- React
- JavaScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- React Hook Form
- Zod
- Axios
- Recharts
- Lucide React

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Nodemailer
- Multer
- Cloudinary
- node-cron
- Express Validator

### Deployment

Frontend:

- Vercel

Backend:

- Render

Database:

- MongoDB Atlas

Images:

- Cloudinary

## Project Structure

```text
az-fish-farm/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── store/
│   ├── schemas/
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   └── jsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── jobs/
│   │   └── server.js
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md

AZ-FISH-FARM/
│
├── Module 0 — System Planning
│   ├── Database Design
│   ├── ERD
│   ├── API Design
│   ├── Folder Architecture
│   ├── UI Wireframes
│   ├── Navigation Flow
│   └── Business Rules
│
├── Module 1 — Project Initialization & Architecture
│
├── Module 2 — Backend Foundation
│
├── Module 3 — Frontend Foundation
│
├── Module 4 — Authentication
│
├── Module 5 — Dashboard Layout
│
├── Module 6 — Pond Management
│
├── Module 7 — Stocking Management
│
├── Module 8 — Feeding Management
│
├── Module 9 — Growth Sampling
│
├── Module 10 — Water Quality
│
├── Module 11 — Water Changes
│
├── Module 12 — Electricity & Generator Logs
│
├── Module 13 — Mortality
│
├── Module 14 — Feed Inventory
│
├── Module 15 — Medicine Inventory
│
├── Module 16 — Equipment
│
├── Module 17 — Expenses
│
├── Module 18 — Sales
│
├── Module 19 — Customers
│
├── Module 20 — Suppliers
│
├── Module 21 — Employees
│
├── Module 22 — Reports
│
├── Module 23 — Analytics
│
├── Module 24 — Notifications
│
├── Module 25 — Gallery
│
├── Module 26 — Settings
│
├── Module 27 — Public Website
│
├── Module 28 — Deployment
│
├── Module 29 — Testing
│
├── Module 30 — Performance Optimization
│
├── Module 31 — Final Code Review
│
└── Module 32 — Production Release


AZ FISH FARM MANAGEMENT SYSTEM
════════════════════════════════════════════

FOUNDATION
🟡 Module 0 — System Planning
🟡 Module 1 — Project Initialization
🟡 Module 2 — Backend Foundation
🟡 Module 3 — Frontend Foundation
✅ Module 4 — Authentication
🟡 Module 5 — Dashboard Layout

FARM OPERATIONS
✅ Module 6  — Pond Management
✅ Module 7  — Stocking Management
⬜ Module 8  — Feeding Management
✅ Module 9  — Growth Sampling
⬜ Module 10 — Water Quality
⬜ Module 11 — Water Changes
⬜ Module 12 — Electricity & Generator
✅ Module 13 — Mortality

RESOURCES / FINANCE
🟡 Module 14 — Feed Inventory
⬜ Module 15 — Medicine Inventory
⬜ Module 16 — Equipment
✅ Module 17 — Expenses
✅ Module 18 — Sales
✅ Module 19 — Customers
✅ Module 20 — Suppliers
🚫 Module 21 — Employees (excluded by business rule)

REPORTING
✅ Module 22 — Reports
✅ Module 23 — Analytics

REMAINING
➡️ Module 24 — Notifications       ← NEXT
⬜ Module 25 — Gallery
⬜ Module 26 — Settings
⬜ Module 27 — Public Website
⬜ Module 28 — Deployment
⬜ Module 29 — Final Testing
⬜ Module 30 — Performance
⬜ Module 31 — Final Code Review
⬜ Module 32 — Production Release