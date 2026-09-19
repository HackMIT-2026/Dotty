# Dotty

A Tamagotchi style app that gamifies chronic illness care for children. A clinician publishes a care plan, a child looks after an axolotl named Pip by completing plan tasks, and a parent watches progress and sends cheers. Hackathon prototype, fake data only.

See [CLAUDE.md](CLAUDE.md) for the full project guide and design rules.

## Workspaces

| Folder | What it is |
|---|---|
| `light-client/` | React (Vite, TypeScript) app for the child and parent phone views (393 px) |
| `heavy-client/` | React (Vite, TypeScript) web app for the clinician portal (1440 px) |
| `server/` | Python FastAPI backend with PyMongo and MongoDB |

Clients call the server through a REST API and never touch MongoDB. ElevenLabs is called only from the server.

## Setup

### Web clients

Install Node 20 or newer, then install each client once:

```
cd light-client && npm install
cd heavy-client && npm install
```

Run:

```
cd light-client && npm run dev      # child and parent, fake data by default
cd heavy-client && npm run dev      # clinician portal
```

Vite prints the local URL (usually http://localhost:5173 for light-client and http://localhost:5174 for heavy-client, or the next free port). It also prints a Network URL: open that on a phone on the same Wi-Fi to try the phone app. Child view is `/#/child`, parent view is `/#/parent`, and `/#/pet-preview` shows all four Pip moods.

To use the server instead of fake data (not built yet), start with `VITE_USE_SERVER=true npm run dev`.

### Server

```
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then edit; leave ELEVENLABS_API_KEY blank for mock voice
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/api/health`. MongoDB must be running for the data endpoints (not built yet).

## Status

- light-client: child home and parent feed screens built on fake data, with the Pip art bundled as images.
- heavy-client: clinician plan builder built on fake data.
- server: health check and `POST /api/treatment-plans`. Next: quests, then care events.
- Not yet verified against Figma: amber, Display and Body large text, button and clinician radii, spacing scale. See the header of `src/theme/tokens.css`.
- The clients were moved from Flutter to React. Both build with `npm run build`.
