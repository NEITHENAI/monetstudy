# MonetStudy — MVP Setup Guide

## Stack
- **Next.js 14** (App Router)
- **Firebase** — Auth + Firestore + App Hosting
- **AI** — DeepSeek V3 via `/api` routes
- **Payments** — Flutterwave (coming later)

---

## 1. Firebase Console Setup

### Create project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `monetstudy`
3. Disable Google Analytics (optional)

### Enable Authentication
1. Build → Authentication → Get started
2. Enable **Email/Password**
3. Enable **Google**

### Enable Firestore
1. Build → Firestore Database → Create database
2. Choose **production mode**
3. Pick a region (e.g. `europe-west1` for Uganda latency)

### Get config keys
1. Project Settings (gear icon) → Your apps → Add app → Web
2. Register the app, copy the firebaseConfig object

---

## 2. Environment Variables

Copy `.env.local` and fill in your values:

```bash
cp .env.local .env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

DEEPSEEK_API_KEY=...   # Get from platform.deepseek.com
```

---

## 3. Deploy Firestore Rules

Install Firebase CLI if not installed:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## 5. Deploy to Firebase App Hosting

1. Firebase Console → App Hosting → Get started
2. Connect your GitHub repo (push this project to GitHub first)
3. Configure branch: `main`
4. Add secret in Console: `deepseek-api-key` = your DeepSeek key
5. Firebase will auto-deploy on every push to `main`

---

## 6. Pro Plan (Manual for now)

To manually upgrade a user to Pro during MVP:

1. Firebase Console → Firestore → users → `{userId}`
2. Edit the `plan` field: change `"free"` → `"pro"`

Flutterwave integration will automate this later.

---

## Project Structure

```
src/
  app/
    auth/login/         Sign in page
    auth/signup/        Sign up page
    dashboard/          Main hub (Home, Explore, Profile tabs)
    subject/new/        Create subject flow
    course/[id]/        Course home + topic list
    course/[id]/topic/[topicIndex]/  Topic reader + quiz
    course/[id]/exam/   Mock exam
    upgrade/            Pro upgrade page
    api/
      generate-course/  DeepSeek course generation
      generate-assessment/  Quiz questions
      generate-mock-exam/   Exam generation
  components/
    ui/primitives.tsx   Shared buttons, tags, progress bars, logo
    layout/AppShell.tsx Bottom nav + theme switcher
  context/
    AuthContext.tsx     Firebase auth state
    ThemeContext.tsx    4 themes (dark/light/midnight/sepia)
  lib/
    firebase/           config, auth helpers, firestore helpers
    deepseek/client.ts  All AI generation functions
  types/index.ts        TypeScript types
```

---

## Themes

The app ships with 4 themes switchable from the top bar:
- 🌑 Dark (default)
- ☀️ Light
- 🔮 Midnight (purple)
- 📜 Sepia (warm)

Theme preference is saved to localStorage.

---

## 7. Pesapal Setup

### Create account
1. Go to https://developer.pesapal.com
2. Sign up and verify your business
3. Dashboard → API Keys → copy Consumer Key + Consumer Secret

### Sandbox vs Live
- **Sandbox:** `PESAPAL_BASE_URL=https://cybqa.pesapal.com/pesapalv3`
- **Live:** `PESAPAL_BASE_URL=https://pay.pesapal.com/v3`

Start with sandbox for testing. All test card details are in the Pesapal docs.

### Add to .env.local
```
PESAPAL_CONSUMER_KEY=your_consumer_key
PESAPAL_CONSUMER_SECRET=your_consumer_secret
PESAPAL_BASE_URL=https://cybqa.pesapal.com/pesapalv3
NEXT_PUBLIC_APP_URL=https://your-app.web.app
```

### IPN (webhook) — auto-registered
The app registers its IPN URL automatically on first order.
No manual setup needed in Pesapal dashboard.
IPN endpoint: `/api/pesapal-ipn`

### Firebase Admin SDK (for IPN to write to Firestore)
```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
"
```
Get from: Firebase Console → Project Settings → Service accounts → Generate new private key

### Pricing tiers
| Plan      | Price  | Subjects |
|-----------|--------|----------|
| Free      | $0     | 1        |
| Starter   | $1.20  | 3        |
| Scholar   | $5.00  | 10       |
| Unlimited | $10.00 | ∞        |

All payments are one-time. No subscriptions.
