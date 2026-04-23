
# Mobifliks Mirror – Deploy Guide (Backend + Frontend split)

This repo now ships ready-to-deploy pieces for a split setup:

- **Backend** (FastAPI + SQLite) on a VPS
- **Frontend** (Vite/React static build) on GitHub Pages or any static host

Follow the steps below end-to-end.

---

## 1) Backend deployment (cPanel / Passenger)

If your cPanel supports Python apps, it's typically running **Phusion Passenger (WSGI)**.

This project includes `passenger_wsgi.py` that wraps the FastAPI app via `a2wsgi`.

### Important routing note

- This API already uses an `/api/...` route prefix inside the app.

- Recommended: deploy the backend at the **root of a subdomain**, e.g. `https://api.yourdomain.com/`.

- Then endpoints are `https://api.yourdomain.com/api/health`, `/api/movie/{id}`, etc.

- Avoid mounting the Python app at `/api` on the same domain, otherwise you'd end up with `/api/api/...`.

### Steps

1) Upload the backend folder (the one containing `passenger_wsgi.py`, `api_server.py`, `requirements.txt`) to your cPanel account (ideally outside `public_html`).

2) In cPanel → **Setup Python App**:

   - Python version: **3.10+**

   - Application root: the uploaded backend folder
   - Application URL: your API subdomain (recommended)
   - Application startup file: `passenger_wsgi.py`
   - Application entry point: `application`
3) Install deps in the app venv:
   - `pip install -r requirements.txt`
4) Set environment variables in cPanel (recommended) or create a `.env` in the app root:
   - `MOBIFLIKS_USERNAME`, `MOBIFLIKS_PHONE`, `MOBIFLIKS_COUNTRY_CODE`
   - `TMDB_API_KEY` (optional, for posters/backdrops/cast)
   - `ALLOWED_ORIGINS` (optional, comma-separated)
   - `DB_PATH` (optional, absolute path to your sqlite file)
   - `SQLITE_JOURNAL_MODE` (optional; use `DELETE` if your host has issues with WAL)
5) Restart the Python app in cPanel.

### Health check

- Open `https://api.yourdomain.com/api/health`
- Open `https://api.yourdomain.com/docs`

---

## 1) Backend deployment (VPS)

### Prereqs

- Python 3.10+ on the VPS
- Nginx (reverse proxy) recommended
- API domain: `api.app.shelvin-joel.dev`

### Setup

```bash
# On the VPS
git clone <your repo> scraper
cd scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure env
cp .env.example .env
# edit .env with your Mobifliks login, API_HOST=0.0.0.0, API_PORT=8000
# optional: ALLOWED_ORIGINS=https://app.shelvin-joel.dev (comma-separated)
```

### Run the API

```bash
source .venv/bin/activate
nohup .venv/bin/python -m uvicorn api_server:app --host 0.0.0.0 --port 8000 --workers 2 > api.log 2>&1 &
```

### Nginx (reverse proxy)

```nginx
server {
    server_name api.app.shelvin-joel.dev;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

Then `sudo nginx -t && sudo systemctl reload nginx`.

### API Health check

```bash
curl -I http://127.0.0.1:8000/api/health
```

---

## 2) Frontend build & deploy (GitHub Pages or any static host)

### Frontend Prereqs

- Node 18+
- Your API already reachable at `https://api.app.shelvin-joel.dev/api` (or adjust)

### Configure frontend env

```bash
cd templates
cp .env.production.example .env.production
# set VITE_API_BASE=https://api.app.shelvin-joel.dev/api
# set VITE_BASE=/             # for custom domain or Pages with CNAME
# set VITE_BASE=/your-repo/   # if hosting under a repo path without CNAME
```

### Build

```bash
cd templates
npm ci
npm run build
# output in templates/dist
```

### Deploy to GitHub Pages (two common options)

1) Push the `dist/` contents to a `gh-pages` branch and enable Pages from that branch.
   - Example: `npm run build` then `npx gh-pages -d dist` (if you prefer, add gh-pages devDependency).
2) Use a GitHub Action that runs `npm ci && npm run build` and publishes `dist` to `gh-pages`.

Add a `CNAME` in the repo settings (or place a `CNAME` file in `dist/`) for the frontend domain `app.shelvin-joel.dev`. (A `CNAME` file is already provided in `templates/public/` so it will be included in the build.)

### Verify the live build

```bash
curl -s https://app.shelvin-joel.dev/sw.js | grep moviebay-v2   # should show current SW version
```

---

## 3) Connecting frontend to backend

- The frontend reads `VITE_API_BASE` at build time. Set it to your API URL ending with `/api` (e.g., `https://api.app.shelvin-joel.dev/api`).
- CORS: the backend honors `ALLOWED_ORIGINS` (comma-separated). Set it in `.env` to your frontend domain (`https://app.shelvin-joel.dev`) once deployed.

---

## 4) Optional: systemd service for the API

`/etc/systemd/system/mobifliks.service`

```ini
[Unit]
Description=Mobifliks Mirror API
After=network.target

[Service]
User=www-data
WorkingDirectory=/root/scraper
EnvironmentFile=/root/scraper/.env
ExecStart=/root/scraper/.venv/bin/uvicorn api_server:app --host 0.0.0.0 --port 8000 --workers 2
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable: `sudo systemctl enable --now mobifliks && sudo systemctl status mobifliks`

---

## 5) Quick checklist before deploying

- [ ] `.env` filled on VPS (Mobifliks creds, API_HOST/PORT, ALLOWED_ORIGINS)
- [ ] API running (`curl /api/health` returns 200)
- [ ] Nginx proxy for `api.app.shelvin-joel.dev` in place
- [ ] `.env.production` set with `VITE_API_BASE` and `VITE_BASE`
- [ ] `npm run build` succeeded; `dist/` uploaded to GitHub Pages
- [ ] Frontend domain resolves and shows fresh data without hard reload
- [ ] (Optional) TMDB/other poster enhancement skipped for now

---

## 6) Local dev

- Backend: `uvicorn api_server:app --reload`
- Frontend: `cd templates && npm ci && npm run dev` (proxy to `http://127.0.0.1:8000/api` via Vite config)

Happy shipping!
