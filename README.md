# Dotty

A Tamagotchi-style companion that turns Type 1 diabetes care into looking after a pet. The clinician sets a daily care plan; the child sees it as Dotty's quests and earns Dots for doing it; the parent sees the medical detail, what was done or missed, and the alerts. See [PLAN.md](PLAN.md) for the full design.

| Folder | What | Stack |
| --- | --- | --- |
| `server/` | API, rewards, alerts, dose math, demo simulator | FastAPI + pymongo + MongoDB |
| `light-client/` | Family app (child + parent roles) | Expo / React Native |
| `heavy-client/` | Clinician portal: care plan, charts, notes | React + Vite + Tailwind |

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

### Who sees the carbs

The child's app never receives a number of grams. Food is picked as cards or typed in words ("mac and cheese");
the server turns that into carbs (Claude, falling back to its own food table) and sends the number only to the
parent and the clinician. When the estimate isn't confident — or the child taps **Ask a grown-up** — the meal
lands in the parent's inbox with a box to set the real number, and the doctor's logbook says where each carb
count came from. Set `ANTHROPIC_API_KEY` in `server/.env` to use Claude — the model is `claude-haiku-4-5`,
about $0.0005 an estimate and cached per phrase, and `DOTTY_FOOD_MODEL` switches it (`claude-opus-5` judges
awkward dishes better). Without a key the food table answers and anything it doesn't recognise goes to the parent.

### Logs that can't be farmed

Dots are paid by the server, never by the phone. A child who taps the same button ten times gets one reward.
Logs are marked (and then earn nothing, complete no quest, and stay out of the parent's totals and the doctor's
charts) when they repeat, come seconds apart, arrive all at once, or go past a sensible number for one day. Two
things together is ordinary — a check-up and a meal — and so is dinner as a check-up, the meal and the medicine
a couple of minutes apart; tapping through every button in one go is not. Nothing is deleted: `GET
/patients/{id}/events?flagged=true` shows the marked ones, the parent gets a note so a genuine double-tap can
be sorted out, and the child's app says "Dotty just had a check-up" instead of offering a dead button.

The care team has the last word: every row of the clinician logbook has **Set aside**, for a log they don't
believe (a mistyped meter reading, a meal logged twice). It leaves every chart, total and care-plan task and
stays in the log, labelled with who set it aside — and **Put back** returns it, which also overrules the spam
check when a child really did check twice in a minute. Dots already earned are never taken back.

### Insulin

Rapid and long-acting are different medicines, so they are never summed into one "insulin" number. The
clinician's Insulin panel stacks them per day over two weeks — long-acting as the base, rapid on top — with the
average daily dose, the long-acting share of it (typically 40–50 %) and how many rapid doses a day. The parent's
app logs both, and both have their own mark on the glucose charts.

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
