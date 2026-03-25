# MediLink Deployment Guide

This branch is set up for:

- Backend on Render
- Patient frontend on Vercel
- Provider frontend on Vercel
- Database on Supabase
- DNS managed in Porkbun

## Final Production URLs

- Patient app: `https://medilinkid.com`
- Provider app: `https://provider.medilinkid.com`
- Backend API: `https://api.medilinkid.com`

## 1. Push This Branch

Push `kosydeploydomain` to GitHub so Render and Vercel can deploy from it.

## 2. Backend On Render

Create a new Render Web Service from this repo and branch.

Render settings:

- Root directory: `backend`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`

Required environment variables:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=your_supabase_pooler_url
SHADOW_DATABASE_URL=your_supabase_direct_url
DATABASE_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=your_long_random_secret
FRONTEND_BASE_URL=https://medilinkid.com
ALLOWED_ORIGINS=https://medilinkid.com,https://provider.medilinkid.com
OPENAI_API_KEY=optional
GOOGLE_CLIENT_ID=optional
```

Notes:

- `DATABASE_URL` should use the Supabase pooler URL
- `SHADOW_DATABASE_URL` should use the direct database URL
- If Google sign-in is not needed yet, leave `GOOGLE_CLIENT_ID` empty
- If the AI feature is not needed yet, leave `OPENAI_API_KEY` empty

Once Render deploys successfully, copy the Render service URL.

## 3. Patient Frontend On Vercel

Create a new Vercel project from this repo and branch.

Patient app settings:

- Framework: Vite
- Root directory: `.`
- Build command: `npm run build`
- Output directory: `build`

Environment variables:

```env
VITE_API_BASE_URL=https://api.medilinkid.com
VITE_GOOGLE_CLIENT_ID=optional
```

Assign domain:

- `medilinkid.com`
- `www.medilinkid.com` should redirect to `medilinkid.com`

## 4. Provider Frontend On Vercel

Create a second Vercel project from the same repo and branch.

Provider app settings:

- Framework: Vite
- Root directory: `provider-ui`
- Build command: `npm run build`
- Output directory: `build`

Environment variables:

```env
VITE_API_BASE_URL=https://api.medilinkid.com
VITE_GOOGLE_CLIENT_ID=optional
```

Assign domain:

- `provider.medilinkid.com`

## 5. DNS In Porkbun

Add the records requested by Render and Vercel when you connect custom domains.

Expected mapping:

- `api.medilinkid.com` -> Render
- `medilinkid.com` -> Vercel
- `www.medilinkid.com` -> Vercel
- `provider.medilinkid.com` -> Vercel

Do not guess the final record values manually if the platform gives you specific targets.
Use the exact DNS values shown in Render and Vercel.

## 6. Verification Checklist

Backend:

- `https://api.medilinkid.com/api/health` returns success
- Render deploy shows healthy status

Patient app:

- Loads at `https://medilinkid.com`
- Can sign up or sign in
- API requests go to `https://api.medilinkid.com`

Provider app:

- Loads at `https://provider.medilinkid.com`
- Can sign in
- API requests go to `https://api.medilinkid.com`

## 7. Recommended Order

1. Push branch to GitHub
2. Deploy backend on Render
3. Confirm backend health URL
4. Connect `api.medilinkid.com`
5. Deploy patient frontend on Vercel
6. Deploy provider frontend on Vercel
7. Connect frontend domains
8. Test sign-in and API traffic end to end
