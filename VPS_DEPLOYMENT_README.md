# Mobifliks Mirror — VPS Hosting & Setup Notes (api.s-u.in)

This document explains how the backend was deployed on a VPS so another developer can reproduce the setup.

## What’s in this project
- **Backend**: FastAPI app (`api_server.py`) + SQLite DB (`mobifliks_mirror.db`) + scraper/enrichment scripts.
- **Frontend**: Vite/React app in `templates/` (typically hosted separately as static files).

The backend serves API routes under the `/api` prefix (example: `/api/health`, `/api/movies`, etc).

## Target VPS
- OS: Ubuntu 24.04
- Domain: `api.s-u.in` (recommended: point this to the VPS)
- Reverse proxy: Nginx (recommended)
- Process manager: systemd

## 1) Upload code to the VPS

### Option A — upload `scraper.zip` from Windows using SCP
From Windows PowerShell (replace the username if it’s not `root`, and keep the custom SSH port):
```powershell
scp -P 22022 "C:\Users\shelv\Desktop\scraper\scraper\scraper.zip" root@209.74.86.189:/root/
```

On the VPS:
```bash
cd /root
unzip -o scraper.zip -d /root/scraper
cd /root/scraper
```

### Option B — git clone (if repo is available)
```bash
cd /root
git clone <YOUR_REPO_URL> scraper
cd /root/scraper
```

## 2) Install system packages
```bash
sudo apt update
sudo apt install -y python3-venv python3-pip nginx unzip
```

## 3) Python virtualenv + dependencies
```bash
cd /root/scraper
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 4) Environment variables (`.env`)
Create a `.env` in `/root/scraper/.env` (do **not** commit secrets).

Minimum recommended variables:
```bash
API_HOST=0.0.0.0
API_PORT=8000

# During testing:
ALLOWED_ORIGINS=*

# Optional (TMDB enrichment: posters/backdrops/cast/description)
TMDB_API_KEY=YOUR_TMDB_KEY
TMDB_IMAGE_SIZE=original

# Optional: override sqlite path / journal mode
DB_PATH=/root/scraper/mobifliks_mirror.db
SQLITE_JOURNAL_MODE=WAL
```

Notes:
- For production, set `ALLOWED_ORIGINS` to the exact frontend origin(s), comma-separated.
- If you ever see sqlite locking issues on shared environments, set `SQLITE_JOURNAL_MODE=DELETE`.

## 5) Run backend manually (sanity check)
```bash
cd /root/scraper
source .venv/bin/activate
python -m uvicorn api_server:app --host 0.0.0.0 --port 8000
```

Health check from the VPS:
```bash
curl -sS http://127.0.0.1:8000/api/health
```

Stop the server with `Ctrl+C` before moving to systemd.

## 6) systemd service (backend)
Create:
`/etc/systemd/system/mobifliks-api.service`
```ini
[Unit]
Description=Mobifliks Mirror API (FastAPI)
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/scraper
EnvironmentFile=/root/scraper/.env
ExecStart=/root/scraper/.venv/bin/uvicorn api_server:app --host 127.0.0.1 --port 8000 --workers 2
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mobifliks-api
sudo systemctl status mobifliks-api --no-pager
```

Logs:
```bash
journalctl -u mobifliks-api -f
```

## 7) Nginx reverse proxy (api.s-u.in)
Create:
`/etc/nginx/sites-available/api.s-u.in`
```nginx
server {
    listen 80;
    server_name api.s-u.in;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

Enable it:
```bash
sudo ln -sf /etc/nginx/sites-available/api.s-u.in /etc/nginx/sites-enabled/api.s-u.in
sudo nginx -t
sudo systemctl reload nginx
```

Verify:
```bash
curl -I http://api.s-u.in/api/health
```

## 8) HTTPS (recommended)
If DNS is already pointing `api.s-u.in` to the VPS:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.s-u.in
```

Certbot will edit the Nginx config and enable HTTPS + renewals.

## 9) DNS for `api.s-u.in`
In your DNS provider:
- Add an **A record**:
  - Name/Host: `api`
  - Value: `209.74.86.189`
  - TTL: default

## 10) Frontend connection (if hosted separately)
The frontend needs its API base URL set at build time:
- `VITE_API_BASE=https://api.s-u.in/api`

## 11) Daily automation (scrape at 01:00 UTC+3, then enrich)

### Confirm timezone / UTC+3
```bash
timedatectl
date
```
If you want “UTC+3” behavior explicitly, set the server timezone (example: Africa/Nairobi):
```bash
sudo timedatectl set-timezone Africa/Nairobi
timedatectl
```

### systemd oneshot service
Create:
`/etc/systemd/system/mobifliks-scrape.service`
```ini
[Unit]
Description=Mobifliks scraper + TMDB enrichment
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/root/scraper
EnvironmentFile=/root/scraper/.env

# 1) Run scraper
ExecStart=/root/scraper/.venv/bin/python /root/scraper/run_scraper.py

# 2) After scraper completes, run enrichment
ExecStartPost=/root/scraper/.venv/bin/python /root/scraper/enrich_posters.py --update-description --update-cast
```

### systemd timer (01:00 UTC+3 daily)
Create:
`/etc/systemd/system/mobifliks-scrape.timer`
```ini
[Unit]
Description=Run Mobifliks scrape daily (01:00 UTC+3)

[Timer]
OnCalendar=*-*-* 01:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mobifliks-scrape.timer
sudo systemctl list-timers --all | grep mobifliks
```

Run once immediately (manual test):
```bash
sudo systemctl start mobifliks-scrape.service
journalctl -u mobifliks-scrape.service -f
```

## 12) Common operations
- Restart API: `sudo systemctl restart mobifliks-api`
- View API logs: `journalctl -u mobifliks-api -f`
- View scrape logs: `journalctl -u mobifliks-scrape.service -f`
- Nginx reload: `sudo systemctl reload nginx`

## 13) Troubleshooting
- If `curl http://127.0.0.1:8000/api/health` works but domain fails:
  - check Nginx config (`sudo nginx -t`)
  - check DNS A-record points to this VPS
- If enrichment doesn’t update posters/backdrops/cast:
  - confirm `TMDB_API_KEY` is set in `/root/scraper/.env`
  - run manually: `python enrich_posters.py --update-details --update-cast --update-description`

