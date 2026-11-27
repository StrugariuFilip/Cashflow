# CashFlow Architecture

## Repository Structure

```text
Cashflow/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   └── routes.py
│   │   ├── core/
│   │   │   ├── dependencies.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── transaction.py
│   │   │   └── user.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── dashboard.py
│   │   │   ├── transaction.py
│   │   │   └── user.py
│   │   ├── database.py
│   │   └── main.py
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── PageLayout.tsx
│   │   │   └── SessionExpirationWatcher.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── auth.ts
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── TransactionsPage.tsx
│   │   ├── types/
│   │   │   └── transaction.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── architecture.md
│   ├── README.md
│   └── requirements.md
├── .gitignore
└── README.md
```

The frontend, core backend features, and dashboard are under development. Alembic migrations and automated tests will be added later.

## Database Model

The `users` table stores user accounts. The `transactions` table stores income and expenses. A user can have multiple transactions, and each transaction belongs to exactly one user.

```text
users
├── id             INTEGER, primary key
├── email          VARCHAR(255), unique and required
└── password_hash  VARCHAR, hashed password

transactions
├── id               INTEGER, primary key
├── user_id          INTEGER, foreign key → users.id
├── type             VARCHAR(10), income or expense
├── amount           NUMERIC(12, 2), positive amount
├── category         VARCHAR(50)
├── description      VARCHAR(500), optional
└── transaction_date DATE
```

Passwords are stored as hashes, never as plain text. The relationship between users and transactions is one-to-many. Timestamp fields are not yet included in the current models.

## Application Structure

### Backend

- `api/` contains the HTTP endpoints for authentication and application features.
- `core/` contains shared dependencies, current-user verification, and security functions.
- `models/` defines the SQLAlchemy tables.
- `schemas/` defines input validation and API response formats with Pydantic.
- `database.py` configures the PostgreSQL connection and database sessions.
- `main.py` creates the FastAPI application, registers the routers, and defines the health check.

### Frontend

The frontend is a React application built with TypeScript and Vite, styled with Tailwind CSS.

- `pages/` contains the login, dashboard, and transaction pages.
- `components/` contains reusable interface elements and session-expiration monitoring.
- `lib/` contains API configuration and token management.
- `types/` contains the TypeScript types used by the pages.

## Authentication and Data Access

When a user logs in, the backend verifies their email and password and returns a JWT. The frontend sends the token in the `Authorization: Bearer <token>` header for protected routes.

The backend identifies the user from the token and uses their ID to restrict access to their own transactions. The token expires after a set time; the frontend ends the session when the token expires.

## API

### Implemented

- `GET /health` — checks the API status and PostgreSQL connection; returns `503` if the database is unavailable.
- `POST /api/v1/auth/register` — registers a user with a hashed password.
- `POST /api/v1/auth/login` — verifies the login credentials and issues a JWT.
- `GET /api/v1/transactions` — lists transactions belonging to the authenticated user.
- `GET /api/v1/transactions/history` — returns the authenticated user’s transaction history in chronological pages; supports page, page size, and optional income / expense filtering.
- `POST /api/v1/transactions` — creates a transaction for the authenticated user.
- `GET /api/v1/transactions/{transaction_id}` — retrieves a transaction belonging to the authenticated user.
- `PUT /api/v1/transactions/{transaction_id}` — replaces a transaction’s data.
- `PATCH /api/v1/transactions/{transaction_id}` — partially updates a transaction.
- `DELETE /api/v1/transactions/{transaction_id}` — deletes a transaction belonging to the authenticated user.
- `GET /api/v1/dashboard/summary` — returns the authenticated user’s total income, total expenses, and balance.

### Planned

- `GET /api/v1/users/me` — returns the authenticated user’s profile.

The dashboard uses the API summary and transaction list to display totals, a monthly comparison, and spending by category.
