# JUVIC Medical Clinic

Operational clinic management system for outpatient and inpatient care, treatment scheduling, pharmacy stock, billing, payments, expenses, and reporting.

## Applications

- `frontend` — React, TypeScript, Vite, Tailwind CSS, TanStack Query
- `backend` — ASP.NET Core 8 Web API, EF Core, PostgreSQL, JWT authentication
- `docs` — architecture, setup, workflows, and deployment notes

## Quick start

See [docs/SETUP.md](docs/SETUP.md). Never commit real connection strings or JWT secrets.

For a trial deployment, follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Architecture

This is a modular monolith. Business features are isolated in the API and frontend while sharing one PostgreSQL database and one deployable backend.
