# Dotty

A Tamagotchi style app that gamifies chronic illness care for children. A clinician publishes a care plan, a child looks after an axolotl named Pip by completing plan tasks, and a parent watches progress and sends cheers. Hackathon prototype, fake data only.

See [CLAUDE.md](CLAUDE.md) for the full project guide and design rules.

## Workspaces

| Folder | What it is |
|---|---|
| `light-client/` | Flutter app for the child and parent phone views (393 px) |
| `heavy-client/` | Flutter web app for the clinician portal (1440 px) |
| `server/` | Python FastAPI backend with PyMongo and MongoDB |

Clients call the server through a REST API and never touch MongoDB. ElevenLabs is called only from the server.

## Setup

### Flutter clients

Install Flutter, then generate the platform folders once in each client (this keeps the existing `lib/` and `pubspec.yaml`):

```
cd light-client && flutter create . --project-name dotty_light_client --platforms=android,ios,web && flutter pub get
cd heavy-client && flutter create . --project-name dotty_heavy_client --platforms=web && flutter pub get
```

Run:

```
cd light-client && flutter run                # fake data by default
cd light-client && flutter run --dart-define=USE_SERVER=true
cd heavy-client && flutter run -d chrome
```

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

- light-client: child home and parent feed screens built on fake data (Riverpod). Pip is drawn in code as a placeholder until the Figma art is exported.
- heavy-client: clinician plan builder built on fake data.
- server: health check and `POST /api/treatment-plans`. Next: quests, then care events.
- Not yet verified against Figma: amber, Display and Body large text, button and clinician radii, spacing scale. See the header of `lib/theme/app_theme.dart`.
- The Flutter code has not been compiled yet. Run `flutter pub get` and `flutter analyze` after installing Flutter.
