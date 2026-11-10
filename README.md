# CashFlow

CashFlow este o aplicație web full-stack pentru gestionarea finanțelor personale. 

## Tehnologii

- **Backend:** Python, FastAPI și Uvicorn
- **Persistență pregătită:** SQLAlchemy 2.0 și PostgreSQL prin `psycopg`
- **Frontend planificat:** React, TypeScript, Vite, Tailwind CSS și shadcn/ui
- **Documentație:** Markdown în [`docs/`](./docs/)

## Structura actuală

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
│   │   │   ├── transaction.py
│   │   │   └── user.py
│   │   ├── database.py
│   │   └── main.py
│   ├── .env
│   └── requirements.txt
├── docs/
│   ├── architecture.md
│   ├── README.md
│   └── requirements.md
├── .gitignore
└── README.md
```

## Instalare și pornire

Din directorul repository-ului:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Copy-Item .env.example .env
uvicorn backend.app.main:app --reload
```

API-ul este disponibil la `http://127.0.0.1:8000`, iar documentația interactivă la `http://127.0.0.1:8000/docs`.

Verificarea de sănătate:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Răspunsul este `{"status":"ok"}` și nu necesită PostgreSQL.
