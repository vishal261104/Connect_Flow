# ConnectFlow

A full-stack CRM (Customer Relationship Management) application for managing customers, leads, tasks, and team activity — built with a React front end, an Express/PostgreSQL back end, and real-time updates via Socket.IO.

## Features

- **Customer management** — create, view, edit, and track customers with full profile pages
- **Sales pipeline** — convert customers into leads and move them through stages (`New` → `Contacted` → `Interested` → `Closed`)
- **Tasks & notes** — attach tasks and notes to individual customer records
- **Activity timeline** — automatic activity logging per customer for a full history of interactions
- **Dashboard** — at-a-glance overview of pipeline and team performance
- **Real-time notifications** — Socket.IO powers live updates and an in-app notification bell
- **Multi-workspace support** — data is scoped by workspace for team/organization separation
- **Role-based access control** — `Admin`, `Sales`, and `Viewer` roles gate write access across the API
- **Authentication** — token-based auth with session management and password changes
- **Admin panel** — manage workspace users and roles

## Tech Stack

**Frontend**
- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [React Router](https://reactrouter.com/) for routing
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Radix UI](https://www.radix-ui.com/) / Base UI primitives for accessible components
- [Recharts](https://recharts.org/) for dashboard charts
- [TanStack Table](https://tanstack.com/table) for data tables
- [Socket.IO Client](https://socket.io/) for real-time updates

**Backend**
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/) (via `pg`) with schema auto-migration on startup
- [Socket.IO](https://socket.io/) for real-time communication
- [Nodemailer](https://nodemailer.com/) for transactional email

**Deployment**
- Configured for [Render](https://render.com/) (`render.yaml`) — single web service serving both the API and the built React app

## Project Structure

```
Connect_Flow/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── auth/            # Auth context/provider
│   │   ├── components/      # Reusable UI components
│   │   ├── lib/              # Utilities
│   │   ├── pages/            # Route-level pages (Dashboard, Pipeline, Customers, Admin, ...)
│   │   └── services/         # API client
│   └── ...
├── server/                  # Express backend
│   ├── config/               # DB connection & schema setup
│   ├── controllers/          # Route handlers
│   ├── middleware/           # Auth & RBAC middleware
│   ├── models/                # SQL queries / data access layer
│   ├── realtime/              # Socket.IO setup
│   ├── routes/                 # Express routers
│   ├── utils/                   # Logger, helpers
│   └── index.js                  # Server entry point
├── package.json              # Root install/build scripts
└── render.yaml                # Render deployment config
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- A [PostgreSQL](https://www.postgresql.org/) database
- (Optional) SMTP credentials for outgoing email

### 1. Clone the repository

```bash
git clone https://github.com/vishal261104/Connect_Flow.git
cd Connect_Flow
```

### 2. Install dependencies

```bash
npm install --prefix server
npm install --prefix client
```

### 3. Configure environment variables

Create a `.env` file inside the `server/` directory (see `server/.env.example`):

```env
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgres://user:password@host:5432/dbname
CLIENT_ORIGIN=http://localhost:5173
SERVER_BASE_URL=http://localhost:5000

# Optional — required for email features
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

The database schema is created and migrated automatically on server startup — no manual migration step required.

### 4. Run in development

In one terminal, start the API server:

```bash
cd server
npm start
```

In another terminal, start the frontend dev server:

```bash
cd client
npm run dev
```

The client runs on Vite's dev server (default `http://localhost:5173`) and proxies API calls to the Express server.

### 5. Build for production

From the project root:

```bash
npm install       # installs server + client deps and builds the client
npm start          # starts the server, which also serves the built client
```

## Deployment

This project is pre-configured for [Render](https://render.com/) via `render.yaml`:

- **Build:** installs server and client dependencies and builds the client bundle
- **Start:** runs the Express server, which serves the API and the built React app together
- Required environment variables (`DATABASE_URL`, `SMTP_*`, `CLIENT_ORIGIN`, `SERVER_BASE_URL`) are declared in `render.yaml` and should be set in the Render dashboard.

## Roles & Permissions

| Role   | Permissions                                  |
|--------|-----------------------------------------------|
| Admin  | Full access, including user/workspace admin   |
| Sales  | Can create/edit customers, leads, tasks, notes |
| Viewer | Read-only access                              |

## License

No license has been specified for this project yet. Consider adding a `LICENSE` file if you plan to open-source it.
