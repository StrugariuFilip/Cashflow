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

Fișierul `backend/.env` conține setările locale pentru conexiunea la PostgreSQL și secretul JWT. Nu trebuie inclus în repository.

Frontend-ul, funcționalitățile de bază ale backendului și dashboard-ul sunt începute. Migrațiile Alembic și testele automated vor fi adăugate ulterior.

## Modelul bazei de date

Tabelul `users` stochează conturile utilizatorilor. Tabelul `transactions` stochează veniturile și cheltuielile. Un utilizator poate avea mai multe tranzacții, iar fiecare tranzacție aparține unui singur utilizator.

```text
users
├── id             INTEGER, cheie primară
├── email          VARCHAR(255), unic și obligatoriu
└── password_hash  VARCHAR, hash-ul parolei

transactions
├── id               INTEGER, cheie primară
├── user_id          INTEGER, cheie externă → users.id
├── type             VARCHAR(10), income sau expense
├── amount           NUMERIC(12, 2), sumă pozitivă
├── category         VARCHAR(50)
├── description      VARCHAR(500), opțională
└── transaction_date DATE
```

Parolele sunt stocate ca hash, nu în clar. Relația dintre utilizatori și tranzacții este de tip unu-la-mai-mulți. Câmpurile pentru timestamp-uri nu sunt încă incluse în modelele curente.

## Organizarea aplicației

### Backend

- `api/` conține endpoint-urile HTTP pentru autentificare și funcționalitățile aplicației.
- `core/` conține dependențele comune, verificarea utilizatorului curent și funcțiile de securitate.
- `models/` definește tabelele SQLAlchemy.
- `schemas/` definește validarea datelor de intrare și formatele răspunsurilor API cu Pydantic.
- `database.py` configurează conexiunea la PostgreSQL și sesiunile bazei de date.
- `main.py` creează aplicația FastAPI, înregistrează routerele și definește verificarea de sănătate.

### Frontend

Frontend-ul este o aplicație React cu TypeScript și Vite, stilizată cu Tailwind CSS.

- `pages/` conține paginile de autentificare, dashboard și tranzacții.
- `components/` conține elementele reutilizabile ale interfeței și monitorizarea expirării sesiunii.
- `lib/` conține configurarea API-ului și gestionarea tokenului.
- `types/` conține tipurile TypeScript folosite de pagini.

## Autentificare și acces la date

La autentificare, backend-ul verifică emailul și parola și returnează un JWT. Frontend-ul trimite tokenul în antetul `Authorization: Bearer <token>` pentru rutele protejate.

Backend-ul identifică utilizatorul din token și folosește ID-ul acestuia pentru a limita accesul la tranzacțiile proprii. Tokenul are un timp de expirare; frontend-ul închide sesiunea când tokenul expiră.

## API

### Implementate

- `GET /health` — verifică starea API-ului și conexiunea la PostgreSQL; returnează `503` dacă baza de date nu este disponibilă.
- `POST /api/v1/auth/register` — înregistrează un utilizator cu parola hash-uită.
- `POST /api/v1/auth/login` — verifică datele de autentificare și emite un JWT.
- `GET /api/v1/transactions` — listează tranzacțiile utilizatorului autentificat.
- `POST /api/v1/transactions` — creează o tranzacție pentru utilizatorul autentificat.
- `GET /api/v1/transactions/{transaction_id}` — citește o tranzacție a utilizatorului autentificat.
- `PUT /api/v1/transactions/{transaction_id}` — înlocuiește datele unei tranzacții.
- `PATCH /api/v1/transactions/{transaction_id}` — actualizează parțial o tranzacție.
- `DELETE /api/v1/transactions/{transaction_id}` — șterge o tranzacție a utilizatorului autentificat.
- `GET /api/v1/dashboard/summary` — returnează totalul veniturilor, totalul cheltuielilor și soldul utilizatorului autentificat.

### Planificate

- `GET /api/v1/users/me` — returnează profilul utilizatorului autentificat.

Dashboard-ul folosește sumarul API și lista tranzacțiilor pentru a afișa totalurile, comparația lunară și distribuția cheltuielilor pe categorii.