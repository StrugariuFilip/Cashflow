# Requirements

CashFlow is intended to be a full-stack web application for managing personal finances. The list below describes the mandatory requirements for the first complete version; it does not imply that they have already been implemented.

## Mandatory Requirements
- Users can register, log in, and log out securely.
- Passwords are stored only as hashes, and authentication uses expiring JWTs.
- Each user’s data is isolated from other users’ data.
- Transactions support income and expenses, with validated categories, amounts, dates, and descriptions.
- The API provides CRUD operations for transactions and consistent JSON responses.
- The dashboard calculates income, expenses, and balance from data persisted by the backend.
- Transaction history is sorted chronologically and deterministically, and works on desktop and mobile.
- The web interface is responsive and communicates with the API over HTTP/JSON.