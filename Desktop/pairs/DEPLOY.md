# Deployment Guide

## Railway Deployment

### 1. Prepare Your Repo
```bash
git add .
git commit -m "Add deployment config"
git push origin main
```

### 2. Railway Setup
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo

### 3. Environment Variables
Add these in Railway dashboard:
```
DERIV_DEMO_APP_ID=16929
DERIV_DEMO_TOKEN=your_demo_token
DERIV_LIVE_APP_ID=your_live_app_id
DERIV_LIVE_TOKEN=your_live_token
ACTIVE_ACCOUNT=demo
PORT=8000
RISK_PCT=1.0
MAX_DAILY_LOSS_PCT=2.0
API_KEY=your-secure-api-key
```

### 4. Deploy
- Railway auto-detects Dockerfile
- Build starts automatically
- URL provided after deploy

## Manual Docker Build

### Build
```bash
docker build -t sweep-signals .
```

### Run
```bash
docker run -p 8000:8000 \
  -e DERIV_DEMO_TOKEN=xxx \
  -e DERIV_LIVE_TOKEN=xxx \
  -e API_KEY=your-key \
  sweep-signals
```

## Render.com Alternative

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. "New Web Service"
4. Connect GitHub repo
5. Build command: `npm start`
6. Publish directory: `backend`

## Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `DERIV_DEMO_APP_ID` | Deriv demo app ID | Yes (default: 16929) |
| `DERIV_DEMO_TOKEN` | Deriv demo API token | Yes |
| `DERIV_LIVE_APP_ID` | Deriv live app ID | No |
| `DERIV_LIVE_TOKEN` | Deriv live API token | No |
| `ACTIVE_ACCOUNT` | demo or live | Yes |
| `PORT` | Server port | Yes (default: 8000) |
| `API_KEY` | Your API key for auth | Yes |
| `RISK_PCT` | Risk per trade % | Yes (default: 1.0) |
| `MAX_DAILY_LOSS_PCT` | Max daily loss % | Yes (default: 2.0) |

## Getting Deriv Tokens

1. Go to [Deriv](https://deriv.com)
2. Login → Account Settings → API Tokens
3. Create new token with these scopes:
   - Read
   - Trade
   - Payments
4. Copy token (shown once!)