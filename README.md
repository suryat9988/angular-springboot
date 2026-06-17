# BowerBox

BowerBox is a production-ready Angular 20 application for planning dates and keeping upcoming plans visible.  
The BowerBird is used as the app logo (`public/bowerbird-logo.svg`).

## Tech Stack

- Angular 20 (standalone APIs)
- Angular Material UI
- Firebase Authentication (Google sign-in)
- Firestore Database
- Firebase Cloud Messaging (foreground + background notifications)
- Firebase Hosting configuration

## Features Implemented

- Google login with Firebase Authentication
- Auth guard for protected routes
- Create Date Plan page with validation and Firestore writes
- Upcoming Dates page (sorted upcoming plans from Firestore)
- FCM token registration and persistence in Firestore
- Foreground notification handling (snackbar display)
- Background notification service worker
- Responsive mobile-first layout using Angular Material

## Project Structure

```text
.
├── firebase.json
├── .firebaserc
├── .firebaseignore
├── public/
│   ├── bowerbird-logo.svg
│   └── firebase-messaging-sw.js
└── src/
    ├── app/
    │   ├── app.config.ts
    │   ├── app.routes.ts
    │   ├── core/
    │   │   ├── guards/auth-guard.ts
    │   │   └── services/
    │   │       ├── auth.ts
    │   │       ├── date-plan.ts
    │   │       └── messaging.ts
    │   ├── models/date-plan.model.ts
    │   └── pages/
    │       ├── create-date-plan/
    │       ├── login/
    │       └── upcoming-dates/
    └── environments/
        ├── environment.ts
        └── environment.production.ts
```

## Firebase Setup

1. Create a Firebase project.
2. Enable **Authentication > Google**.
3. Create a **Firestore Database** in production mode.
4. Enable **Cloud Messaging** and generate a Web Push certificate key.
5. Replace placeholders in:
   - `src/environments/environment.ts`
   - `src/environments/environment.production.ts`
   - `public/firebase-messaging-sw.js`
6. Set your project id in `.firebaserc` (`projects.default`).

## Firestore Data Shape

- Date plans: `users/{uid}/datePlans/{datePlanId}`
- FCM tokens: `users/{uid}/fcmTokens/{token}`

## Run Locally

```bash
npm install
npm start
```

App runs at `http://localhost:4200`.

## Build for Production

```bash
npm run build:prod
```

## Deploy to Firebase Hosting

Make sure Firebase CLI is authenticated (`firebase login`) and then run:

```bash
npm run deploy:hosting
```

## Notes for Notifications

- Browser notifications require user permission.
- Foreground messages are displayed using Angular Material snackbars.
- Background messages are handled in `public/firebase-messaging-sw.js`.

