# Mimon Review Blog

A personal review blog for long-form writing about books, movies, music, and other media. The app has a React/Vite frontend, a Python FastAPI backend, PostgreSQL storage, local cover uploads, and a small password-gated publishing page.

## Backend

Start PostgreSQL with Docker:

```powershell
docker compose up -d postgres
```

Then start the API:

```powershell
cd backend
python -m pip install -r requirements.txt
$env:DATABASE_URL="host=127.0.0.1 port=5433 dbname=reviewblog user=reviewblog password=reviewblog"
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API runs at `http://localhost:8000` by default. Reviews are stored in PostgreSQL. Cover images are stored in `backend/uploads` and served from `/uploads`.

The Docker database uses:

```text
database: reviewblog
username: reviewblog
password: reviewblog
port: 5432
host port: 5433
```

The backend creates the `reviews` table automatically on startup.

On Windows, if `uvicorn.exe` is blocked by Application Control, use `python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000` instead.

If port `8000` is already occupied or Windows reports `WinError 10013`, either stop the process using that port or run the backend on another port:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

If you use a different backend port, start the frontend with `VITE_API_BASE_URL` pointing at it.

To stop the Docker database:

```powershell
docker compose down
```

To delete the database contents and start fresh:

```powershell
docker compose down -v
```

For deployment, set `DATABASE_URL` to your hosted PostgreSQL connection string. Render, Railway, Fly.io, Neon, Supabase, and similar providers all expose a PostgreSQL URL you can use here.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` by default and calls the backend at `http://localhost:8000`. To use a different API URL, set `VITE_API_BASE_URL`.

## Admin

Open `http://localhost:5173/admin` and enter the admin password:

```text
reviewblog2025
```

The same password is required by the backend in the `X-Admin-Password` header for publishing, editing, and deleting reviews.

## Deployment Note

PostgreSQL now handles review data, but cover images are still stored on the backend filesystem. For production, either use a persistent disk/volume for `backend/uploads` or move covers to object storage such as S3, Cloudflare R2, Supabase Storage, or UploadThing.

## Render Deployment

This project deploys cleanly on Render as three resources:

1. Render Postgres database
2. FastAPI Web Service
3. React Static Site

### 1. Push the project to GitHub

Render deploys from a Git repository. Push this folder to a GitHub repo before creating services.

### 2. Create the Postgres database

In Render, create a new PostgreSQL database. Copy its internal database URL for the backend's `DATABASE_URL` environment variable.

### 3. Create the FastAPI backend

Create a new Web Service from the same GitHub repo.

Use these settings:

```text
Root Directory: backend
Language: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Add these environment variables:

```text
DATABASE_URL=<your Render Postgres internal database URL>
ADMIN_PASSWORD=<a password you choose>
CORS_ORIGINS=https://<your-frontend-site>.onrender.com
UPLOAD_DIR=/opt/render/project/src/backend/uploads
```

Attach a persistent disk to the backend service:

```text
Mount Path: /opt/render/project/src/backend/uploads
Size: 1 GB
```

Deploy the backend, then copy its public URL, for example:

```text
https://your-backend.onrender.com
```

### 4. Create the React frontend

Create a new Static Site from the same GitHub repo.

Use these settings:

```text
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
```

Add these environment variables:

```text
VITE_API_BASE_URL=https://<your-backend-service>.onrender.com
VITE_ADMIN_PASSWORD=<same value as ADMIN_PASSWORD>
```

Add a rewrite rule for React Router:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

Deploy the frontend.

### 5. Update backend CORS

After the frontend deploys, copy the frontend URL and update the backend's `CORS_ORIGINS` value:

```text
CORS_ORIGINS=https://<your-frontend-site>.onrender.com
```

Redeploy the backend.

## Vercel Frontend + Railway Backend Deployment

This is the lowest-cost polished setup:

1. Railway hosts FastAPI, PostgreSQL, and persistent cover uploads.
2. Vercel hosts the React/Vite frontend.

### 1. Push the project to GitHub

Both Railway and Vercel deploy from GitHub. Push this folder to a GitHub repository first.

### 2. Create the Railway project

In Railway:

1. Create a new project.
2. Add a PostgreSQL database service.
3. Add a service from your GitHub repo for the backend.

For the backend service, use:

```text
Root Directory: backend
Build Command: python -m pip install -r requirements.txt
Start Command: python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

Add these backend variables:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_PASSWORD=<a password you choose>
CORS_ORIGINS=https://temporary.invalid
UPLOAD_DIR=/data/uploads
```

Attach a Railway volume to the backend service:

```text
Mount Path: /data
```

Then open the backend service's Networking settings and generate a public Railway domain. Your backend URL will look like:

```text
https://your-backend.up.railway.app
```

Check:

```text
https://your-backend.up.railway.app/reviews
```

It should return `[]`.

### 3. Create the Vercel frontend

In Vercel:

1. Import the same GitHub repo.
2. Set the project root directory to `frontend`.
3. Use the Vite defaults:

```text
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Add this frontend environment variable:

```text
VITE_API_BASE_URL=https://your-backend.up.railway.app
```

Deploy the frontend. The included `frontend/vercel.json` file rewrites React Router routes back to `index.html`.

### 4. Update Railway CORS

After Vercel deploys, copy the Vercel production URL and update the Railway backend variable:

```text
CORS_ORIGINS=https://your-frontend.vercel.app
```

Redeploy the Railway backend.

### 5. Test the deployed app

Open:

```text
https://your-frontend.vercel.app
```

Then:

```text
https://your-frontend.vercel.app/admin
```

Enter the `ADMIN_PASSWORD` you set in Railway. Publish a review, upload a cover, edit it, and delete it once to confirm the full production flow.
