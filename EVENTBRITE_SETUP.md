# Eventbrite API Proxy Setup

Your app now uses a Vercel serverless function to securely proxy Eventbrite API requests. This solves CORS issues!

## Setup Steps

### 1. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Follow the prompts to connect your GitHub/GitLab account and deploy.

### 2. Add Environment Variable

In your Vercel project dashboard:
- Go to **Settings → Environment Variables**
- Add new variable:
  - **Name:** `EVENTBRITE_API_KEY`
  - **Value:** Your Eventbrite API token (3QINHE75SYXOZMJSIGI5)

### 3. Update Your Frontend

The app automatically detects if it's running locally or on Vercel:
- **Local dev:** Calls `http://localhost:3001/api/events` (if you run local proxy)
- **Vercel:** Calls `https://your-project.vercel.app/api/events`

### 4. Test It

- Deploy to Vercel
- Navigate to Events tab
- Click "Load Real Eventbrite Events"
- Real London events will appear!

## Local Development (Optional)

To test the proxy locally without deploying to Vercel:

```bash
npm install -g vercel
vercel dev
```

Then your app will call `http://localhost:3001/api/events` automatically.

## What Changed

✅ Removed token input requirement (API key is server-side only)
✅ No more CORS errors
✅ Secure - your API key is never exposed to the client
✅ Scalable - serverless function handles traffic

## File Structure

```
your-app/
├── api/
│   └── events.js        ← Vercel serverless function
├── app/
│   └── index.tsx        ← Updated to call /api/events
├── vercel.json          ← Vercel configuration
└── ...
```
