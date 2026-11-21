# CashFlow

CashFlow este o aplicație web full-stack pentru gestionarea finanțelor personale. Utilizatorii se pot autentifica, își pot gestiona tranzacțiile și pot vedea rapoarte despre venituri și cheltuieli.

## Tehnologii

- **Backend:** Python, FastAPI și Uvicorn
- **Bază de date:** PostgreSQL, SQLAlchemy 2.0 și psycopg
- **Frontend:** React, TypeScript, Vite și Tailwind CSS
- **Interfață și notificări:** React Router și Sonner
- **Documentație:** Markdown în `docs/`

## Structura proiectului

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

## Funcționalități

- Înregistrare și autentificare cu parolă hash-uită și token JWT
- Crearea, afișarea, editarea și ștergerea tranzacțiilor utilizatorului autentificat
- Dashboard cu totaluri, comparație lunară și cheltuieli pe categorii
- Expirarea automată a sesiunii când expiră tokenul

## Instalare și pornire

### Backend

Din directorul repository-ului, se instalează dependențele:

```powershell
py -3.15 -m pip install -r backend\requirements.txt
```

Se configurează `backend/.env` cu `DATABASE_URL` și `JWT_SECRET`, apoi se pornește serverul:

```powershell
py -3.15 -m uvicorn app.main:app --app-dir backend --reload
```

API-ul rulează la `http://127.0.0.1:8000`, iar documentația interactivă este la `http://127.0.0.1:8000/docs`.

### Frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Frontend-ul rulează la adresa afișată în terminal, de obicei `http://localhost:5173`.


## API

| Metodă | Rută | Descriere |
|---|---|---|
| `GET` | `/health` | Verifică API-ul și conexiunea la baza de date |
| `POST` | `/api/v1/auth/register` | Creează un cont |
| `POST` | `/api/v1/auth/login` | Autentifică utilizatorul și returnează un token |
| `GET` | `/api/v1/dashboard/summary` | Returnează sumarul financiar al utilizatorului |
| `GET` | `/api/v1/transactions` | Listează tranzacțiile utilizatorului autentificat |
| `POST` | `/api/v1/transactions` | Creează o tranzacție |
| `GET` | `/api/v1/transactions/{transaction_id}` | Returnează o tranzacție |
| `PUT` | `/api/v1/transactions/{transaction_id}` | Înlocuiește datele unei tranzacții |
| `PATCH` | `/api/v1/transactions/{transaction_id}` | Actualizează parțial o tranzacție |
| `DELETE` | `/api/v1/transactions/{transaction_id}` | Șterge o tranzacție |

Rutele pentru dashboard și tranzacții necesită autentificare. Fiecare utilizator poate accesa doar propriile tranzacții.

## Verificarea conexiunii


```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Când baza de date este disponibilă, răspunsul indică `status: ok` și `database: connected`. Dacă PostgreSQL nu este accesibil, endpoint-ul returnează eroare `503`.