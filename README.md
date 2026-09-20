# Dotty

A Tamagotchi-style companion that turns Type 1 diabetes care into looking after a pet. The clinician sets a daily care plan; the child sees it as Dotty's quests and earns Dots for doing it; the parent sees the medical detail, what was done or missed, and the alerts. See [PLAN.md](PLAN.md) for the full design.

| Folder | What | Stack |
| --- | --- | --- |
| `server/` | API, rewards, alerts, dose math, demo simulator | FastAPI + pymongo + MongoDB |
| `light-client/` | Family app (child + parent roles) | Expo / React Native |
| `heavy-client/` | Clinician portal: care plan, charts, notes | React + Vite + Tailwind |

## Features

- **Child care logging:** Check-up records a glucose reading; Eat uses food cards and portion counts to total carbs; Play records activity duration and intensity; Medicine records that medicine was taken.
- **Pet rewards and customization:** earn Dots, levels, check-up streaks, and badges such as First Week, Night Owl, Carb Counter, and Sport Star. In the Shop, preview and buy hats, accessories, colors, and backgrounds for the animated Dotty; some items require a badge to unlock.
- **Parent dashboard:** review glucose trends, daily totals, and recent logs, or log care on the child's behalf. Send a high five to award 5 Dots, up to five times per parent per day. The Inbox collects care alerts and clinician notes, with unread indicators and a mark-all-read action.
- **Shared glucose units:** parents can choose mg/dL or mmol/L in Settings. The child's app picks up the family preference on sync, and the clinician portal displays the patient's units.
- **Clinician review and treatment settings:** view 24-hour or 14-day glucose charts, time in range, care-plan completion, and a logbook. Edit carb ratios, correction settings, basal doses, and activity adjustments; parents can read these under Treatment settings. Clinicians can also send and remove notes visible to the parent.
- **Mobile care reminders:** after notification permission is granted, the child's mobile app schedules daily reminders for timed care-plan tasks using their quest names. These local reminders work offline after scheduling; they are not available in the browser version.

## Run locally (new computer)

Each computer runs its **own** local MongoDB database. A newly cloned project has no users or data until you run the seed command below, so the demo logins will not work until the API has been seeded.

Prerequisites: Python 3.12+ and Node 22+. macOS also needs Homebrew.

### 1. Install and start MongoDB (first time only)

**macOS** — install MongoDB Community with Homebrew. Newer Homebrew versions require third-party taps to be trusted explicitly:

```bash
brew tap mongodb/brew
brew trust mongodb/brew
brew install mongodb/brew/mongodb-community@8.0
brew services start mongodb-community@8.0
```

**Windows** — download and run the [MongoDB Community Server MSI installer](https://www.mongodb.com/try/download/community). During setup, keep **Install MongoD as a Service** selected. Then open PowerShell **as Administrator** and start it (it may already be running):

```powershell
net start MongoDB
```

On either system, check that it is running (install [MongoDB Shell (`mongosh`)](https://www.mongodb.com/try/download/shell) first if the command is unavailable):

```bash
mongosh --eval 'db.runCommand({ ping: 1 })'
```

The command should return `ok: 1`. On later runs, MongoDB normally starts with your computer. If it does not, run `brew services start mongodb-community@8.0` on macOS, or `net start MongoDB` in an Administrator PowerShell window on Windows.

### 2. Start the API and create local demo data

**Terminal 1: API**

**macOS:**

```bash
cd server
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # first time only
.venv/bin/python -m scripts.seed          # first time: creates local "dotty" demo data (wipes it first)
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Windows (PowerShell):**

```powershell
cd server
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m scripts.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

> `scripts.seed` resets only this computer's local `dotty` database. Re-run it whenever you want a fresh demo dataset.

### 3. Start the clients

**Terminal 2: clinician portal**

These commands are the same on macOS and Windows:

```bash
cd heavy-client
npm install                               # first time only
npm run dev                               # http://localhost:5173
```

Log in as `lee@dotty.demo` / `demo1234`, open Maya, then **Care plan** to add or edit the daily tasks. Each task carries
three things: what you and the parent read (title + instructions), what the child sees (a quest name), and how much it
counts (Dots + importance stars, which also drive Dotty's mood).

**Terminal 3: family app**

These commands are the same on macOS and Windows:

```bash
cd light-client
npm install                               # first time only
npx expo start                            # then press w for the browser, or scan the QR code with Expo Go
```

Demo logins:

| Who | How they sign in |
| --- | --- |
| Maya (child) | family code `DEMO42` + PIN `1234` — children have no email or password |
| Alex (parent) | `parent@dotty.demo` / `demo1234` |
| Dr. Lee (clinician portal) | `lee@dotty.demo` / `demo1234` |

A parent can set or reset their child's PIN under Settings.

On a phone with Expo Go, the app talks to the laptop's Wi-Fi address on port 8000 automatically (phone and laptop must be on the same network). To use another server, set it under "Server settings" on the login screen or in Settings.

### Demo tricks

- **Offline:** Settings → Offline mode (or airplane mode on a phone). Logs wait in the outbox and upload when you're back online.
- **Care plan:** add a task in the portal; the child's app shows it as a quest within 15 seconds, and the parent's Care plan tab lists it with the instructions. Completing the matching log (a check-up, insulin, a meal, activity, or the "Done!" button for free-form tasks) pays the Dots and fills Dotty's Love meter.
- **Simulator:** open a patient in the clinician portal and click **Demo** to run Normal, Going high, Going low, or Missed lunch; click **Stop** to end the simulation. The API is also available: `POST /simulator/{patient_id}` with `{"scenario": "high" | "low" | "normal" | "skip_lunch", "speed": 60}` streams fake glucose readings or raises a missed-lunch alert. Get the patient id from `GET /patients` as Dr. Lee.

## Tests

```bash
cd server && .venv/bin/python -m pytest -q      # uses a separate "dotty_test" database
cd light-client && npx tsc --noEmit
cd heavy-client && npx tsc -b && npm run build
```
