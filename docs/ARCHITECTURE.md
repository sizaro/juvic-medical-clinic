# Architecture

## Core rules

1. A patient is a permanent identity; care type belongs to a visit.
2. Every registration creates at least one next of kin in the same transaction.
3. Tests and results are separate. Orders may exist while results are pending.
4. Planned treatment cost is locked when confirmed; physical stock moves only when issued or administered.
5. Every medicine purchase creates batches, stock movements, and its expense atomically.
6. Approved financial history and missed treatment history are never silently deleted.
7. Reporting filters and aggregation execute on the server.
8. API authorization is authoritative; frontend visibility is only a usability layer.

## Modules

Auth, Users, Patients, Visits, Assessments, Tests, Diagnoses, Treatments, Admissions, Medicines, Inventory, Purchases, Sales, Billing, Payments, Expenses, Reports, Dashboard, and Audit.

## Transaction boundaries

- Patient + next of kin + optional initial visit
- Purchase + items + batches + stock movements + expense
- Treatment administration + inventory issue + stock movement
- Walk-in sale + items + inventory issue + stock movement + payment
- Confirmed treatment/test + bill items
- Payment + bill balance update
