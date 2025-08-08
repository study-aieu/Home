# Blog Publishing Mobile App (React Native + Node.js)

## Prerequisites
- Node.js 18+
- Expo CLI (npx is fine)

## Backend

1. Copy `.env.example` to `.env` in `backend/` and fill:
   - JWT_SECRET
   - ENCRYPTION_KEY: 64 hex chars (32 bytes)
   - PORT: 4000
   - CORS_ORIGIN: http://localhost:8081 (Expo web) or `*` for dev
2. Install and run:
   - cd backend
   - npm install
   - npm run dev
3. Verify: GET http://localhost:4000/health -> { ok: true }

## Mobile (Expo)

1. Create `.env` in `mobile/` based on `.env.example`:
   - EXPO_PUBLIC_API_BASE=http://<your-ip>:4000
     - On device, use your machine LAN IP, not localhost
2. Install and run:
   - cd mobile
   - npm install
   - npm start
   - Press a/i/w or scan QR in Expo Go

## WordPress Setup
- Ensure WordPress is reachable over the network
- Create an Application Password for your user (Users -> Profile -> Application Passwords)
- Use site URL, username, and generated app password in the app

## Features
- JWT auth (register/login)
- Securely store WP app password (AES-256-GCM)
- Connect site and publish posts
- List, edit, delete posts
- Upload images to media library and set as featured media
- Save drafts locally (SQLite)

## Notes
- For iOS/Android builds, configure proper CORS and HTTPS if deploying backend.
- In production, use HTTPS and a strong `ENCRYPTION_KEY`.
