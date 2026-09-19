# Dotty: project guide for Claude Code

Dotty is an app with three roles. A clinician publishes a care plan, a child looks after an axolotl pet named Pip by completing plan tasks, and a parent watches progress and sends cheers. It is a hackathon prototype. Use fake patients and fake data only.

## Product context

Dotty is a Tamagotchi style app that gamifies chronic illness management for children. It starts with type 1 diabetes and could expand to cystic fibrosis and similar conditions. The child cares for a pet, and that care mirrors real treatment tasks such as glucose checks, insulin, and diet. Adherence to treatment in children is low, and this app targets that problem.

Three interfaces
* Child app: pet interaction, in game currency, pet skins, glucose and insulin logging, an evolution system, and offline use with sync.
* Parent app: notifications when the child cares for the pet or misses a task, cheers, help with tasks, clinician notes, and guidance from the care team.
* Clinician portal (laptop): patient data view, treatment plan creation, and a weekly "pet story" that summarizes the child's routine with the underlying data.

Design challenges to keep in mind
* Gamifying unpleasant tasks is harder than gamifying fun ones. Shallow gamification fails, so the pet and its world must be genuinely charming.
* Parents remain responsible for medication, so the parent view carries that load.
* Every task needs a short "Why am I doing this?" explanation to build willingness.

Later technical plans (not part of phase 1)
* Bluetooth glucometer upload, sign in, offline first sync, and exportable summaries for clinic workflows.
* Strong data protection, with any journal kept fully local. HIPAA and privacy work happens before any real patient data is used.

## Phase 1 scope

Phase 1 is the core demo loop, end to end: a clinician creates a plan, the child sees it as quests, the child completes one, and Pip's energy goes up. The server is in scope.

Build order: the core demo loop comes first (see "Core demo loop" below). Extra features (ElevenLabs voice, skins, currency, evolution, weekly pet story, cheers, and so on) come later, one at a time, and only after the loop works end to end.

Out of scope for phase 1: Bluetooth, sign in, real offline sync, compliance work, and any dose calculation.

## Repository layout

The repo is a monorepo with three workspaces.

```
Dotty/
  CLAUDE.md          this file, in the repo root
  light-client/      React (Vite, TypeScript) app for the CHILD and PARENT phone views (design width 393 px)
  heavy-client/      React (Vite, TypeScript) web app for the CLINICIAN portal (design width 1440 px)
  server/            Python FastAPI backend with PyMongo and MongoDB
```

Workspace rules
* light-client and heavy-client are separate React (Vite, TypeScript) projects. Each has its own package.json, its own src folder, and its own copy of src/theme/tokens.css and the fake data.
* Paths in this guide that start with src/ mean src/ inside the client being worked on. Say which client you are in whenever you create a file.
* Shared pieces (Pet, BigButton, Chip, tokens) are copied into each client for now. Moving them into a shared package (an npm workspace) is a later step.
* There is no role switcher. Each client is run on its own with `npm run dev`. heavy-client is a web app at a 1440 px layout. light-client is a web app designed at 393 px that runs in a phone browser (open the Network URL Vite prints), or can be added to the phone's Home Screen.
* The clients were moved from Flutter to React. Use React idioms, and do not add Flutter or Dart code back.

## Stack

light-client and heavy-client
* React 19 with TypeScript, built with Vite. Plain CSS, with all values coming from the tokens in src/theme/tokens.css (no CSS framework)
* react-router-dom for navigation in light-client. It uses HashRouter, so URLs look like /#/child and work from any static host. heavy-client is a single screen for now and has no router
* Fredoka bundled as font files in src/assets/fonts and declared with @font-face in tokens.css, so it works offline. Do not fetch fonts at runtime
* CSS transitions and animations for pet and celebration motion (no animation library)
* Material icons through react-icons/md (the Material Design set)
* Data and state in light-client: TanStack Query (@tanstack/react-query). Repositories are provided through React context, so switching Fake to Api is a change in one place (createRepositories in data/providers.tsx). heavy-client keeps the plan draft in a small hook (usePlanDraft) over the same kind of repository

server
* Python with FastAPI, PyMongo, and MongoDB
* Configuration through a server/.env file, with a committed server/.env.example
* ElevenLabs is called only from the server, with a mock voice fallback (see "Server rules")

Clients talk to the server through a REST API. A client never touches MongoDB directly.

## Folder structure

```
light-client/
  index.html, package.json, vite.config.ts, tsconfig.json
  src/
    main.tsx           React root, providers, HashRouter
    router.tsx         routes: /child, /parent, /pet-preview, and / redirects to /child
    theme/             tokens.css (token file, also Fredoka @font-face and text style classes)
    screens/           ChildHomeScreen.tsx, ParentFeedScreen.tsx, PetPreviewScreen.tsx (dev only)
    widgets/           Pet, BigButton, DottyChip, TaskCard, ActivityItem, EnergyMeter, PhoneFrame
                       (each a .tsx with its own .css)
    data/
      models/          models.ts: patient, quest, pet, activity, care plan types
      repositories/    repositories.ts (interfaces: plan, task, log, pet) and fakeRepositories.ts;
                       the API implementation goes next to it and calls the server through an
                       apiClient.ts, the only file that makes HTTP calls
      providers.tsx    repositories context, TanStack Query hooks, care actions
    assets/            fonts/Fredoka, pet/ (happy, sleepy, curious, cheering), background/

heavy-client/
  index.html, package.json, vite.config.ts, tsconfig.json
  src/
    main.tsx
    theme/             tokens.css (same tokens as light-client)
    screens/           ClinicianPlanBuilderScreen.tsx
    widgets/           BigButton, DottyChip, PlanRow
    data/              models/plan.ts, repositories/planRepository.ts, providers.tsx
    assets/            fonts/Fredoka

server/
  app/
    main.py            FastAPI app, CORS, router registration
    config.py          reads settings from .env
    db.py              the only place a MongoDB client is created
    routers/           treatment_plans.py, patients.py, care_events.py
    services/          game_logic.py, voice.py (ElevenLabs plus mock fallback)
  seed.py              creates patient Alex with two sample tasks
  .env.example
  requirements.txt
```

Screens compose widgets and read data through the hooks in data/providers.tsx. A widget never makes an HTTP call.

## Design source

The design lives in the Figma file Dotty: https://www.figma.com/design/mHgFfsOc0l7IiDMkrmQkvx/Dotty

Screens (page: Screens)
* ChildHome: node-id=14-2, built in light-client
* ParentFeed: node-id=14-44, built in light-client
* ClinicianPlanBuilder: node-id=14-68, built in heavy-client

Components (page: Pet design)
* Pet: node-id=11-54
* BigButton: node-id=12-6
* Chip: node-id=12-7
* TaskCard: node-id=12-23
* ActivityItem: node-id=12-24
* PlanRow: node-id=13-2

To read a node, call the Figma tool get_design_context with the file key mHgFfsOc0l7IiDMkrmQkvx and the node id.

The Figma file has limited tool calls on this account. Use the specs in this file first, and call Figma only for the exact frame you are building.

## Naming map: Figma to code

A Figma component name becomes a React component name (file names are PascalCase, for example BigButton.tsx, with a BigButton.css beside it). Variant properties and text properties are props.

| Figma component | React component | Props |
|---|---|---|
| Pet | Pet | mood: PetMood (happy, sleepy, curious, cheering), small |
| BigButton | BigButton | tone: primary or soft, label, icon, onPress |
| Chip | DottyChip | label, icon |
| TaskCard | TaskCard | done: boolean, title, subtitle, whyText, onComplete |
| ActivityItem | ActivityItem | message, time |
| PlanRow | PlanRow | task, window, childWording, whyText, reward, onRemove |

If a name would be confusing next to a library or DOM name (Chip is one), name the file and component to avoid the clash, for example DottyChip, and keep the Figma name in a doc comment.

## Tokens

src/theme/tokens.css is the token file in each client. Figma is the source of truth. Do not edit tokens.css until the spacing scale is verified from Figma (the unverified values below come from this file, not from Figma: sunny-amber, Display, Body large, button and clinician radius, spacing scale, sizes). When the Figma tool limit resets, the user will say so, and all remaining styles are read in one call. The Figma variables are saved as color/name, and they map to CSS custom properties in tokens.css (color/gill-rose becomes --color-gill-rose).

| Figma variable | CSS variable | Hex | Use |
|---|---|---|---|
| color/cream | --color-cream | #FFF8F0 | Page background |
| color/coral | --color-coral | #F28B82 | Primary, pet body, main buttons |
| color/gill-rose | --color-gill-rose | #E56B8A | Gills and highlights |
| color/lavender | --color-lavender | #B8A9E8 | Accent, soft buttons, banners |
| color/pond-blue | --color-pond-blue | #A9D8EE | Chips, water, info |
| color/mint | --color-mint | #A8E0C8 | Success, always with a check icon |
| color/sunny-amber | --color-sunny-amber | #F5C26B | Gentle attention, with a clock icon |
| color/ink | --color-ink | #2B2A33 | Text and icons |
| color/ink-muted | --color-ink-muted | #6B6875 | Secondary text |
| color/white | --color-white | #FFFFFF | Cards and surfaces |
| color/border | --color-border-soft | #EADFD3 | Card borders |

Text styles (Fredoka), as classes in tokens.css: Dotty/Display (.text-display) is 44/52 Bold. Dotty/Heading 1 (.text-h1) is 32/40 SemiBold. Dotty/Heading 2 (.text-h2) is 24/32 SemiBold. Dotty/Body large (.text-body-large) is 20/30. Dotty/Body (.text-body) is 18/28. Dotty/Button (.text-button) is 18/24 Medium. Dotty/Caption (.text-caption) is 14/20 Medium. Muted variants end in -muted. Clinician screens use .text-clinician (16/24).

Shape (--radius-*): card 24, button 16, clinician 8, pill 999. Spacing (--space-*): 4, 8, 12, 16, 24, 32, 48, plus 20 for card padding. Sizes (--size-*): main child button height 64, minimum tap target 48, status icon 44. Card border width is --border-width (2). One soft shadow (--shadow-soft): offset 0, 4, blur 12, black at 8 percent. Motion time is --motion-short, which is 0 when the user asked for reduced motion.

## Rules

* Use tokens for every color, font, radius, spacing, and size. Never write a hex color, a raw font size, or a magic pixel number inside a component, screen, or component CSS file. Use var(--...) and the text classes. Only tokens.css defines values.
* Use dark ink text on every colored surface. White text on coral fails contrast.
* Pair color with an icon or shape so meaning never depends on color alone.
* Main child buttons are 64 px tall. Minimum tap target is 48 px.
* Never show red, crosses, or scolding messages. Never use the close, clear, cancel, or cross Material icons (MdClose, MdClear, MdCancel and their variants). A missed task makes the pet sleepy and one tap wakes it up. The pet never dies.
* Done state uses MdCheck with mint. Waiting state uses MdSchedule (the clock) with sunny amber.
* Pet reactions never depend on a glucose number.
* The app never calculates or suggests a dose. Insulin adjustment information appears only as rules typed in by the clinician and labeled as coming from the care team.
* Engagement mechanics must never punish or shame. The streak chip reads "Days with Pip" and never resets to zero or removes rewards when a day is missed.
* Every task can show a short "Why am I doing this?" line in the child's wording.
* Respect the reduced motion setting for every animation. Use --motion-short for durations (it becomes 0 under prefers-reduced-motion: reduce), or wrap the animation in a prefers-reduced-motion media query. Never hard code a duration.
* Child screens use text of 18 px or larger. Clinician screens can use 16 px.
* Keep components small. A screen composes components and reads data through the hooks in data/providers.tsx.
* Fonts and pet images are bundled as assets (imported from src/assets, so Vite bundles them). The child app must render without a network connection.

## Data shape

Models are TypeScript types in the clients and Pydantic models on the server. The JSON field names below are the contract between them.

```
patient   { id, name, petName, streak }
plan      { id, version, updatedAt, note, tasks: [task] }
task      { id, type, task, window, childWording, done }
log       { id, taskId, at }
pet       { mood }        // happy, sleepy, curious, cheering
cheer     { id, message, at }
```

The server API (below) uses its own field names for the core loop. A repository maps between server responses and these client models, so components never see raw API shapes.

## Data layer in the clients

* Each repository (plan, tasks, logs, pet) is an interface in data/repositories/.
* Each has two implementations: a Fake one that returns data from local fake data, and an Api one that calls the server through apiClient.ts.
* A single switch chooses between them: the build-time flag `VITE_USE_SERVER=true` (read as import.meta.env.VITE_USE_SERVER, default false, so the UI runs without the server). The server base URL is also a Vite env variable (VITE_API_URL) with a localhost default.
* Screens and components depend only on the repository interfaces and the hooks in data/providers.tsx. They never import apiClient.ts.
* Keep repository method names and return types identical across both implementations, so switching does not change any screen.

## Core demo loop (server)

Build in this order. Do not start a later step until the earlier one works.

1. POST /api/treatment-plans stores a plan in the treatment_plans collection. Fields: patient_id, task, window {start, end as HH:MM}, reward (integer 0 to 100), why_text, and an optional title (the child's wording, defaults to task). Status: built.
2. GET /api/patients/{patient_id}/tasks reads the plans and returns quests, each with plan_id, title, real_task, reward, status ("waiting" or "done", never "missed"), and why_text.
3. POST /api/care-events stores a completion in the care_events collection with patient_id, plan_id, task, status, value, and timestamp.
4. The same care-events request updates the game_states collection by adding the reward to the pet's energy, and returns the updated pet values.

Game rules
* Energy is capped at 0 to 100.
* A quest counts once per plan per day. If the same plan is completed again that day, the server still stores the extra care event, returns the current pet values, and adds no reward.
* Evolution points are a separate value from energy, stored in game_states, and never reduced.

Rules for the loop
* The reward is fixed by the task (set on the plan). It never depends on the glucose value or any value field.
* The value field records what was logged (for example a glucose reading). It is stored for the clinician and never feeds any calculation, reward, or pet reaction.
* No endpoint calculates or suggests a dose.

## Server rules

* The server is the only place MongoDB and ElevenLabs credentials are used. They live in server/.env, which is git ignored. Commit only server/.env.example, with placeholder values.
* Add CORS middleware for local development (allow the localhost origins that the Vite dev servers and a phone on the local network use).
* ElevenLabs is called only from the server, and its API key never appears in any client, in fake data, or in a VITE_ variable (those are bundled into the app). A client asks the server for pet voice audio.
* Voice has a mock fallback: when no ElevenLabs key is set (or the call fails), the server returns a mock voice response so the app still works without a key.
* The clients never touch MongoDB directly. They call the REST API only.
* server/seed.py creates one patient named Alex with two sample tasks, using fake data only.

## How to build a screen

1. Read this file.
2. Call get_design_context for the frame node.
3. Reuse components from src/widgets. Create a missing component only when the frame needs it.
4. Use tokens from tokens.css for every value.
5. Fill the screen through the hooks in data/providers.tsx. The fake implementation supplies the data when the server is off.
6. Check the screen at 393 px wide for child and parent views (light-client) and 1440 px wide for the clinician view (heavy-client). Run `npm run build` to type check.

## Prompt recipes

Build a screen:
```
Read CLAUDE.md. Call get_design_context for ChildHome (node-id 14-2). Build light-client/src/screens/ChildHomeScreen.tsx using the components in light-client/src/widgets and the tokens in light-client/src/theme/tokens.css. Read data through the hooks in data/providers.tsx. Match spacing and text styles. Do not add any color that is not in the palette.
```

Build a component:
```
Read CLAUDE.md. Call get_design_context for TaskCard (node-id 12-23). Create light-client/src/widgets/TaskCard.tsx and TaskCard.css with props done, title, and subtitle. Use tokens only.
```

Add motion:
```
Add animation to light-client/src/widgets/Pet.tsx and Pet.css. Bounce when the mood changes. Flap the gills when the mood is cheering. Respect prefers-reduced-motion by using --motion-short.
```

Sync tokens after a design change:
```
Compare the color variables and text styles in the Figma file with light-client/src/theme/tokens.css and heavy-client/src/theme/tokens.css. Update both files so every token matches. List what changed.
```

Add a server feature:
```
Read CLAUDE.md. Add the next step of the core demo loop to server/. Keep the reward fixed by the task. Update the matching repository in light-client with both fake and API implementations.
```
