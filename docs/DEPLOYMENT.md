# Trial deployment: Render + Vercel

## 1. Create PostgreSQL on Render

Create a Render PostgreSQL database and keep its **Internal Database URL**. The API and database should use the same Render region.

## 2. Deploy the ASP.NET Core API on Render

Create a Web Service from the GitHub repository with:

- Root directory: `backend`
- Runtime: Docker
- Dockerfile: `backend/Dockerfile` (Render resolves it from the selected root)
- Health check path: `/health`

Set these Render environment variables:

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__Default=<Render Internal Database URL>
Jwt__Key=<a random secret at least 64 characters long>
Jwt__Issuer=JuvicClinic.Api
Jwt__Audience=JuvicClinic.Frontend
FRONTEND_ORIGIN=https://<your-vercel-project>.vercel.app
Database__MigrateOnStartup=true
Database__SeedOnStartup=true
BootstrapUser__Email=<doctor email>
BootstrapUser__Password=<strong temporary password>
BootstrapUser__FirstName=<doctor first name>
BootstrapUser__LastName=<doctor last name>
BootstrapUser__Role=DOCTOR
Cloudinary__CloudName=<Cloudinary cloud name>
Cloudinary__ApiKey=<Cloudinary API key>
Cloudinary__ApiSecret=<Cloudinary API secret>
```

The first successful start applies EF Core migrations and creates the bootstrap doctor only if that email does not already exist. After the first successful login, set `Database__SeedOnStartup=false`; leave `Database__MigrateOnStartup=true` so future versioned migrations apply safely during startup.

The API accepts Render's `postgresql://...` internal URL and converts it to the Npgsql connection-string format at startup. Keep the database and API in the same Render region and use the internal URL, not the external URL.

`FRONTEND_ORIGIN` is the simplest configuration for one Vercel production site. Multiple origins can still be configured with `AllowedOrigins__0`, `AllowedOrigins__1`, and so on. Do not include a trailing slash.

Do not use the local `ChangeMe123!` accounts in production. They are created only in Development.

## 3. Deploy the React frontend on Vercel

Import the same repository and set:

- Root directory: `frontend`
- Framework preset: Vite
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`

Set this Vercel environment variable for Production, Preview, and Development:

```text
VITE_API_BASE_URL=https://<your-render-api>.onrender.com/api
```

The committed `frontend/vercel.json` routes React pages such as `/billing` and `/inventory` back to `index.html`, preventing refresh-time 404 errors.

## 4. Final connection check

1. Open `https://<your-render-api>.onrender.com/health`; it should return `Healthy`.
2. Open the Vercel site and sign in with the bootstrap doctor account.
3. Create a test medicine with an opening batch and expiry date.
4. Add a second batch and confirm both appear in **Inventory batches**.
5. Upload a medicine image and confirm its URL begins with `https://res.cloudinary.com/`.
6. Record a quick medicine sale and confirm exact-batch stock, dashboard totals, and sales reports update.
7. Create a patient bill, attach payment proof, and confirm an amount above the balance is rejected.

## Cloudinary PDF delivery

In Cloudinary security settings, enable delivery of PDF files if the account disables it. The application stores only the returned secure URL and metadata in PostgreSQL; the actual image or PDF stays in Cloudinary.
