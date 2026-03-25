# MediLink Native Mobile

This folder is the separate native patient app. The existing web app in the project root stays untouched.

## Stack

- Expo
- React Native
- TypeScript

## Run

```bash
cd mobile
npm install
npx expo install
npm start
```

## Backend URL

Set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env`.

Examples:
- iOS simulator: `http://127.0.0.1:4000`
- Android emulator: `http://10.0.2.2:4000`
- Physical device: `http://YOUR_LAN_IP:4000`

## Goal

Match the current patient web app's flows and visual design in a true native app, screen by screen, without changing the web app.

## Current parity

Ported natively so far:
- Welcome
- Sign in
- Sign up
- Profile setup
- Dashboard shell
- Bottom navigation shell

Still placeholder/native-port-in-progress:
- Records
- Appointments
- Messages
- More
- Secondary dashboard destinations like health summary, documents, and recommendations
