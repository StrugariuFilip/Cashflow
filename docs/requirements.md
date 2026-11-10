# Cerințe

CashFlow vizează o aplicație web full-stack pentru gestionarea finanțelor personale. Lista de mai jos descrie cerințele obligatorii pentru prima versiune completă; nu implică faptul că sunt deja implementate.

## Cerințe obligatorii

- Utilizatorii se pot înregistra, autentifica și deconecta în siguranță.
- Parolele sunt stocate doar hash-uit, iar autentificarea folosește token-uri JWT cu expirare.
- Datele fiecărui utilizator sunt izolate de datele celorlalți utilizatori.
- Tranzacțiile suportă venituri și cheltuieli, cu categorie, sumă, dată și descriere validate.
- API-ul oferă operații CRUD pentru tranzacții și răspunsuri JSON consistente.
- Dashboard-ul calculează veniturile, cheltuielile și soldul din datele persistate în backend.
- Istoricul tranzacțiilor este sortat cronologic, determinist și poate fi folosit pe desktop și mobil.
- Interfața web este responsive și comunică cu API-ul prin HTTP/JSON.

