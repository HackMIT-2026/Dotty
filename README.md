# Dotty

A Tamagotchi-style companion that turns Type 1 diabetes care into looking after a pet. The clinician sets a daily care plan; the child sees it as Dotty's quests and earns Dots for doing it; the parent sees the medical detail, what was done or missed, and the alerts. See [PLAN.md](PLAN.md) for the full design.

| Folder | What | Stack |
| --- | --- | --- |
| `server/` | API, rewards, alerts, dose math, demo simulator | FastAPI + pymongo + MongoDB |
| `light-client/` | Family app (child + parent roles) | Expo / React Native |
| `heavy-client/` | Clinician portal: care plan, charts, notes | React + Vite + Tailwind |

## Run locally (new computer)

Each computer runs its **own** local MongoDB database. A newly cloned project has no users or data until you run the seed command below, so the demo logins will not work until the API has been seeded.

Prerequisites: Homebrew, Python 3.12+, and Node 22+.

### 1. Install and start MongoDB (first time only)

On macOS, install MongoDB Community with Homebrew. Newer Homebrew versions require third-party taps to be trusted explicitly:

```bash
brew tap mongodb/brew
brew trust mongodb/brew
brew install mongodb/brew/mongodb-community@8.0
brew services start mongodb-community@8.0
```

Check that it is running:

```bash
mongosh --eval 'db.runCommand({ ping: 1 })'
```

The command should return `ok: 1`. On later runs, MongoDB normally starts with your computer; if it does not, run `brew services start mongodb-community@8.0` again.

### 2. Start the API and create local demo data

**Terminal 1: API**

```bash
cd server
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # first time only
.venv/bin/python -m scripts.seed          # first time: creates local "dotty" demo data (wipes it first)
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

> `scripts.seed` resets only this computer's local `dotty` database. Re-run it whenever you want a fresh demo dataset.

### 3. Start the clients

**Terminal 2: clinician portal**

```bash
cd heavy-client
npm install                               # first time only
npm run dev                               # http://localhost:5173
```

Log in as `lee@dotty.demo` / `demo1234`, open Maya, then **Care plan** to add or edit the daily tasks. Each task carries
three things: what you and the parent read (title + instructions), what the child sees (a quest name), and how much it
counts (Dots + importance stars, which also drive Dotty's mood).

**Terminal 3: family app**

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
- **Simulator:** `POST /simulator/{patient_id}` with `{"scenario": "high" | "low" | "normal" | "skip_lunch", "speed": 60}` streams fake glucose readings or raises a missed-lunch alert. Get the patient id from `GET /patients` as Dr. Lee.

## Tests

```bash
cd server && .venv/bin/python -m pytest -q      # uses a separate "dotty_test" database
cd light-client && npx tsc --noEmit
cd heavy-client && npx tsc -b && npm run build
```
