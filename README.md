# Dotty

A Tamagotchi-style companion that turns Type 1 diabetes care into looking after a pet. Kids earn Dots for check-ups, meals and play; parents get a dose helper driven by the clinician's plan, plus alerts; clinicians adjust the plan. See [PLAN.md](PLAN.md) for the full design.

| Folder | What | Stack |
| --- | --- | --- |
| `server/` | API, rewards, alerts, dose math, demo simulator | FastAPI + pymongo + MongoDB |
| `light-client/` | Family app (child + parent roles) | Expo / React Native |
| `heavy-client/` | Clinician portal (not built yet) | React + Vite |

## Run it (two terminals)

Needs MongoDB running locally (`brew services start mongodb-community`), Python 3.12+ and Node 22+.

**Terminal 1: API**

```bash
cd server
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # first time only
.venv/bin/python -m scripts.seed          # creates the "dotty" database with demo data (wipes it first)
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

**Terminal 2: family app**

```bash
cd light-client
npm install                               # first time only
npx expo start                            # then press w for the browser, or scan the QR code with Expo Go
```

Demo logins (password `demo1234`): `child@dotty.demo` (Maya), `parent@dotty.demo` (Alex), `lee@dotty.demo` (Dr. Lee, for the portal). Family code: `DEMO42`.

On a phone with Expo Go, the app talks to the laptop's Wi-Fi address on port 8000 automatically (phone and laptop must be on the same network). To use another server, set it under "Server settings" on the login screen or in Settings.

### Demo tricks

- **Offline:** Settings → Offline mode (or airplane mode on a phone). Logs wait in the outbox and upload when you're back online.
- **Simulator:** `POST /simulator/{patient_id}` with `{"scenario": "high" | "low" | "normal" | "skip_lunch", "speed": 60}` streams fake glucose readings or raises a missed-lunch alert. Get the patient id from `GET /patients` as Dr. Lee.

## Tests

```bash
cd server && .venv/bin/python -m pytest -q      # uses a separate "dotty_test" database
cd light-client && npx tsc --noEmit
```
