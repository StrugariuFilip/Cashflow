# Arhitectura CashFlow

## Structura repository-ului

# Arhitectura CashFlow

## Structura repository-ului

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

Frontend-ul, migrațiile Alembic și testele vor fi adăugate în commiturile ulterioare.

## Modelul inițial al bazei de date

Tabelul `users` stochează conturile utilizatorilor. Tabelul `transactions` stochează veniturile și cheltuielile. Fiecare tranzacție aparține unui singur utilizator, iar un utilizator poate avea mai multe tranzacții.

users
├── id                 INTEGER, cheie primară
├── email              VARCHAR(255), unic
└── password_hash      VARCHAR, hash-ul parolei

transactions
├── id                 INTEGER, cheie primară
├── user_id            INTEGER, cheie externă → users.id
├── type               VARCHAR(10), income sau expense
├── amount             NUMERIC(12, 2), sumă pozitivă
├── category           VARCHAR(50)
├── description        VARCHAR(500), opțional
└── transaction_date   DATE

Parolele nu se stochează în clar. Câmpurile suplimentare, precum timestamp-urile pentru creare și modificare, pot fi adăugate când sunt implementate în model.

## Direcția API

Sunt implementate:
- GET /health — verifică API-ul și conexiunea la PostgreSQL;
- POST /api/v1/auth/register — înregistrează un utilizator;
- POST /api/v1/auth/login — autentifică utilizatorul și emite un JWT;
- rutele pentru creare, listare, citire, actualizare și ștergere a tranzacțiilor. Acestea folosesc utilizatorul identificat prin JWT.

Este planificat endpoint-ul GET /api/v1/users/me pentru profilul utilizatorului și GET /api/v1/dashboard/summary pentru totalurile financiare. 