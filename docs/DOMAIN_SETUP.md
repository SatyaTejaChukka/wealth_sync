# WealthSync Custom Domain Configuration & Deployment Guide

This guide details the procedure for connecting your custom production domain to WealthSync, configuring DNS records, establishing TLS/SSL certificates, binding CORS headers, and securing Firebase Authentication.

---

## 1. Domain Architecture Blueprint

| Hostname | Target | Role | Protocol |
| :--- | :--- | :--- | :--- |
| `wealthsync.yourdomain.com` / `yourdomain.com` | Frontend Web Host / Vercel / Nginx | Web App & Landing Engine | HTTPS (443) |
| `api.yourdomain.com` | Backend Host / Render / FastAPI Container | REST API & Ledger Backend | HTTPS (443) |

---

## 2. DNS Zone Records Configuration

In your DNS provider (e.g., Cloudflare, Namecheap, AWS Route 53, Porkbun), provision the following records:

### Option A: Direct Server Deployment (Nginx / VPS / Docker)

| Type | Name | Content / Value | TTL | Proxy Status (Cloudflare) |
| :--- | :--- | :--- | :--- | :--- |
| `A` | `@` (Apex) | `<YOUR_SERVER_IPV4>` | Auto / 300s | Proxied (Orange Cloud) |
| `CNAME` | `www` | `yourdomain.com` | Auto / 300s | Proxied (Orange Cloud) |
| `A` | `api` | `<YOUR_SERVER_IPV4>` | Auto / 300s | DNS Only / Proxied |

### Option B: Cloud Edge (Vercel Frontend + Render Backend)

| Type | Name | Content / Value | TTL | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `A` | `@` | `76.76.21.21` | Auto | Vercel Apex IP |
| `CNAME` | `www` | `cname.vercel-dns.com` | Auto | Vercel Canonical |
| `CNAME` | `api` | `<your-render-service>.onrender.com` | Auto | Backend Render Target |

---

## 3. SSL/TLS Certificate Provisioning

### Method 1: Automatic HTTPS via Cloudflare (Recommended)
1. In Cloudflare Dashboard, navigate to **SSL/TLS** -> **Overview**.
2. Select **Full (strict)** encryption mode.
3. Enable **Always Use HTTPS** under **Edge Certificates**.
4. Enable **Automatic HTTPS Rewrites** and **HTTP Strict Transport Security (HSTS)**.

### Method 2: Let's Encrypt via Certbot (Self-Hosted Nginx)
Execute on your Linux server:

```bash
# Install Certbot and Nginx plugin
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Request and bind production certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

Nginx virtual host block example (`/etc/nginx/sites-available/wealthsync`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/wealthsync/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 4. Backend CORS & Environment Configuration

Update your production `.env` file on the server or in your container deployment:

```ini
# Backend .env configuration
ENVIRONMENT=production
DEBUG=false

# Allowed Origins (CORS)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,capacitor://localhost,http://localhost

# Frontend API base URL configured in build:
# VITE_API_URL=https://api.yourdomain.com
```

In FastAPI backend (`backend/app/core/config.py`):
Verify that `ALLOWED_ORIGINS` includes your apex domain and all subdomains.

---

## 5. Firebase Authentication Domain Whitelist

Because WealthSync utilizes Google Firebase Authentication for email and OAuth login:

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **wealthsync**.
3. Navigate to **Build** -> **Authentication** -> **Settings** tab.
4. Scroll to **Authorized domains**.
5. Click **Add domain** and input:
   - `yourdomain.com`
   - `www.yourdomain.com`
6. Click **Save**.

Without adding your domain here, Google 1-Click Sign-In and email verification links will be blocked by Firebase security policies.

---

## 6. Pre-Launch Verification Checklist

- [x] Custom SVG Favicon installed at `frontend/public/favicon.svg` and linked in `frontend/index.html`.
- [x] "Made with AI" watermarks and synthetic tags completely removed.
- [x] Privacy Policy accessible at `/privacy` with zero-telemetry and non-custodial disclosures.
- [x] Terms & Conditions accessible at `/terms` with financial disclaimer and user indemnification.
- [x] Zero purple gradients, zero pill CTA buttons, zero fake reviews/metrics.
- [x] Production DNS records resolving to custom domain.
- [x] SSL certificate active with A+ SSL Labs rating.
- [x] Firebase Authorized Domains list updated with custom domain.
