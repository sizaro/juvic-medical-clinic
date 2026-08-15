# Development setup

## Requirements

- Node.js 20 or newer and pnpm
- .NET 8 SDK and ASP.NET Core Runtime 8
- PostgreSQL 15 or newer

## Backend

1. Copy `backend/appsettings.Development.example.json` to `backend/appsettings.Development.json`.
2. Replace the development connection string and JWT key.
3. From `backend`, run `dotnet restore`, `dotnet ef database update`, then `dotnet run`.
4. Open `/swagger` to test the API. Health is available at `/health`.

### Docker development (recommended)

From the repository root run `docker compose up --build`. PostgreSQL is exposed on port `5434`, the API on `5080`, and data remains in the named `juvic_postgres_data` volume.

## Frontend

1. Copy `frontend/.env.example` to `frontend/.env`.
2. From `frontend`, run `pnpm install` and `pnpm dev`.

Development seed credentials are printed in this document only for local use after seeding:

- doctor@juvic.local / ChangeMe123!
- nurse@juvic.local / ChangeMe123!
- cashier@juvic.local / ChangeMe123!

Change or remove all seeded credentials before trial deployment.

## Deployment

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for the exact Render PostgreSQL, Render API, Vercel, Cloudinary, migration, and first-doctor setup.
