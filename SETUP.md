# MatchRoom — Setup & Run Guide

This guide explains how to set up and run the MatchRoom application on your machine.

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Details |
|-------------|---------|
| **Node.js** | Version 18.x or higher (recommended: 20.x LTS). [Download](https://nodejs.org/) |
| **npm** | Comes with Node.js (version 9.x or higher). |

To check your versions, open a terminal and run:

```bash
node --version
npm --version
```

---

## Step 1: Get the Project

1. Download or clone the project folder to your computer.
2. Open a terminal (Command Prompt, PowerShell, or Terminal) and go to the project folder:

   ```bash
   cd "Match Room R/match room two"
   ```

   Or, if you are already inside the project folder, skip the `cd` command.

---

## Step 2: Install Dependencies

Install all required packages with npm:

```bash
npm install
```

Wait for the installation to finish. This installs React, Vite, Firebase, and other dependencies listed in `package.json`.

---

## Step 3: Configure Environment (Optional)

The app can run in two ways:

### Option A: Run without configuration (demo mode)

You can run the app **without** any environment file. In this mode:

- Authentication and data use **localStorage** (demo mode) or the hardcoded Firebase project in the code.
- Commute data may use a fallback calculation instead of the Google Maps API.

This is enough to explore the app and test the UI.

### Option B: Use your own Firebase and API keys

For real authentication and database, and for live commute data:

1. In the project root (same folder as `package.json`), create a file named `.env`.
2. Copy the contents from `.env.example` and fill in your values:

   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

3. Get these values from the [Firebase Console](https://console.firebase.google.com/):
   - Create or open a project.
   - Go to **Project settings** (gear icon) → **Your apps** → add a web app if needed.
   - Copy the config values into your `.env` file.

4. **(Optional)** For commute time/distance via Google Maps, you need a Google Maps API key with the **Distance Matrix API** enabled. If the app is updated to read this from the environment, add:

   ```env
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

5. Save the `.env` file. **Do not** commit it to version control (it should already be in `.gitignore`).

**Note:** The app currently uses `src/firebase.js` for Firebase. To use `.env` instead, the app would need to use `src/firebaseConfig.js` and import from there.

---

## Step 4: Run the Application

Start the development server:

```bash
npm run dev
```

You should see output similar to:

```
  VITE v7.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

1. Open a browser and go to: **http://localhost:5173/**
2. The MatchRoom landing page should load.
3. Use **Get Started** or **Login** to sign in. In demo mode you can still use the app with local data.

To stop the server, press `Ctrl + C` in the terminal.

---

## Step 5: Build for Production (Optional)

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` folder.

To preview the production build locally:

```bash
npm run preview
```

Then open the URL shown in the terminal (e.g. http://localhost:4173/).

---

## Available Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start the development server (default: http://localhost:5173). |
| `npm run build` | Create an optimized production build in `dist/`. |
| `npm run preview` | Serve the production build locally for testing. |
| `npm run lint` | Run ESLint to check code style and issues. |

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| **Port 5173 already in use** | Either close the other app using that port, or run `npm run dev -- --port 3000` (or another free port). |
| **`npm install` fails** | Make sure Node.js and npm are up to date. Try deleting the `node_modules` folder and running `npm install` again. |
| **Blank or broken page** | Check the browser console (F12 → Console) for errors. Ensure you ran `npm install` and `npm run dev` from the project folder. |
| **Firebase / login errors** | In demo mode some features use localStorage. For full auth, configure Firebase and use the correct `.env` (or update the app to use `firebaseConfig.js`). |
| **Commute not loading** | The app may use a fallback when the Google Maps API key is missing or invalid. Check the console for API errors. |

---

## Project Structure (Quick Reference)

```
match room two/
├── public/          # Static assets
├── src/
│   ├── components/  # Reusable UI components
│   ├── pages/       # Page components (Auth, Dashboard, etc.)
│   ├── services/    # API and business logic (commute, export, chat)
│   ├── utils/       # Helpers (optimization, compatibility, mock data)
│   ├── App.jsx      # Main app and routes
│   ├── main.jsx     # Entry point
│   └── firebase.js  # Firebase configuration
├── .env.example     # Example environment variables
├── package.json     # Dependencies and scripts
├── vite.config.js   # Vite configuration
├── README.md        # Project requirements and description
└── SETUP.md         # This file
```

---

## Summary

1. Install **Node.js** (18+).
2. Go to the project folder and run **`npm install`**.
3. Run **`npm run dev`** and open **http://localhost:5173/** in your browser.
4. (Optional) Add a **`.env`** file with Firebase (and optionally Google Maps) keys for full functionality.

For project requirements and feature description, see **README.md**.
