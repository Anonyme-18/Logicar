# Logicar

A web application for managing quotes, invoices, and financial tracking for independent tradespeople.

Logicar lets users create professional quotes, generate PDF documents, and convert accepted quotes into invoices without re-entering any information. The dashboard provides a clear overview of billed, collected, and outstanding amounts.

## Features

- Secure email and password authentication;
- Quote creation with multiple service items;
- Server-side amount calculations;
- PDF document generation;
- Quote statuses: draft, sent, accepted, and rejected;
- Atomic conversion of accepted quotes into invoices;
- Locked invoice content after conversion;
- Payment status tracking;
- Financial dashboard with date-range filters;
- Responsive desktop and mobile interface;
- Strict data isolation between users.

## Tech Stack

- Next.js 16 with App Router and Server Actions;
- TypeScript;
- Tailwind CSS v4 and Radix UI;
- Neon PostgreSQL;
- Better Auth for authentication and sessions;
- `pg` for server-side PostgreSQL access;
- Zod for input validation;
- pdf-lib for document generation;
- GitHub Actions for continuous integration;
- Vercel for deployment.

## Architecture

```text
src/
├── app/                 # Next.js routes and application pages
├── components/          # Reusable interface components
├── lib/
│   ├── auth.ts          # Better Auth configuration
│   ├── db.ts            # Neon PostgreSQL connection pool
│   ├── *.actions.ts     # Business Server Actions
│   ├── *.server.ts      # Server-side logic and calculations
│   └── pdf.server.ts    # PDF generation
└── styles.css           # Global styles and design tokens

db/
└── migrations/          # PostgreSQL schema and business constraints
```

Business data is always accessed on the server. Server Actions validate the current session and scope every resource to the authenticated user.

## Requirements

- Node.js 20.9 or later;
- npm;
- A Neon PostgreSQL project.

## Local Setup

```bash
git clone https://github.com/Anonyme-18/Logicar.git
cd Logicar
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Then configure the following variables:

```env
DATABASE_URL="postgresql://user:password@your-neon-host/neondb?sslmode=require"
BETTER_AUTH_SECRET="a-long-random-secret-value"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Initialize the database from the Neon SQL Editor or with `psql`:

```bash
psql "$DATABASE_URL" -f db/migrations/0000_neon_initial.sql
```

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev        # Start the development server
npm run build      # Create a production build
npm run start      # Start the production server locally
npm run lint       # Run ESLint
npm run typecheck  # Run the TypeScript compiler
npm run format     # Format files with Prettier
npm audit          # Audit dependencies
```

GitHub Actions automatically runs linting, type checking, the production build, and the dependency audit on every push and pull request.

## Deploying to Vercel

1. Import the GitHub repository into Vercel.
2. Select **Next.js** as the framework.
3. Add the following production environment variables:

```env
DATABASE_URL=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

4. Apply the SQL migration to Neon before the first production use.
5. Deploy and verify the signup → quote → invoice workflow.

Never publish `.env`, `DATABASE_URL`, or `BETTER_AUTH_SECRET`. The `.env.example` file contains examples only and no sensitive values.

## Security

- Authentication and sessions are handled server-side;
- Secrets are never exposed in the client bundle;
- Incoming data is validated with Zod;
- PostgreSQL queries use parameters;
- User ownership is checked for every business resource;
- SQL constraints protect amounts and relationships;
- Invoice content is locked after conversion;
- Git history has been purged of environment files.

To report a vulnerability, read [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Project Status

The project is functional within its current MVP scope. The production database must be initialized on Neon before the final deployment.

## License

Personal project intended as a professional portfolio demonstration. A formal license may be added before broader distribution.
