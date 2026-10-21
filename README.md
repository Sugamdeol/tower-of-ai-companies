# Tower of AI-run Companies

[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)

A 3D tower where **every floor is one business**, run by **one human owner and their AI agent**.
The agents do the daily work — research, outreach, building, reports — and bring finished jobs
back to the owner for the decisions that need a human. Visitors turn the tower, ride between
floors, step into any office, browse the company directory and apply to rent the next office.

**Everyone pays with their own Pollen.** The app never holds a shared API key: visitors sign in
with Pollinations (Bring Your Own Pollen) and every agent job is billed to the visitor's own
balance through their own access token.

Built for [Pollinations quest #17999](https://github.com/pollinations/pollinations/issues/17999).

**Live app:** https://sugamdeol.github.io/tower-of-ai-companies/

---

## What is in the tower

| Floor | Company | Human owner | AI agent | Sector |
| ----- | ------- | ----------- | -------- | ------ |
| 1 | Honeycomb Analytics | Ada Okonkwo | Scout | Data & Analytics |
| 2 | Vellum Studio | Ryo Tanaka | Quill | Media & Writing |
| 3 | Solstice Solar | Maya Bergström | Helios | Climate & Hardware |
| 4 | Lantern Media | Diego Ramos | Lumen | Media & Creative |
| 5 | Ironleaf Robotics | Priya Nair | Atlas | Hardware & Robotics |
| 6 | Copperfield Logistics | Sam Whitfield | Route | Logistics |
| 7 | Aurora Labs | *available* | — | Open |
| 8 | Meridian Advisory | *available* | — | Open |

## Features

- **A real 3D tower in pure CSS.** No WebGL, no Three.js, no CDN, no build step. Floors are CSS 3D
  boxes (`perspective` + `rotateY` / `translateZ` on six faces each). Drag the tower to turn it, use
  the on-screen buttons, or pick a floor in the elevator panel — the camera rides smoothly to the
  floor you chose.
- **Step into any office.** Click a floor to open that company: the human owner, the agent, the
  agent's live status, and its work log.
- **The agent really runs on Pollinations.** Inside an office you can send the agent a job
  ("market research brief", "outreach sequence", "weekly owner report"). The app calls
  `POST https://gen.pollinations.ai/v1/chat/completions` with **the visitor's own access token**,
  streams the real result into the office, and shows the real token count and the real cost in
  Pollen. When a call fails, the raw error from Pollinations is shown as-is.
- **BYOP sign-in (OAuth 2.1 + PKCE).** "Sign in with your own Pollen" runs the full
  authorization-code flow against `https://enter.pollinations.ai`, exchanges the code at
  `https://enter.pollinations.ai/api/oauth/token`, reads your profile and your
  **Pollen balance** from `https://gen.pollinations.ai/account/balance`. The token is stored in
  `sessionStorage` only — never in `localStorage`, never in a URL, never logged — and the code is
  stripped from the address bar as soon as it is handled.
- **A directory** of every company in the tower, with the open offices flagged.
- **Apply to rent** the next free office: a real pitch form, persisted in `localStorage`, listed
  in the **Landlord** view together with the queue of open floors, where the landlord can approve
  an application and hand over the keys.
- **Human in the loop.** A finished agent job lands on the owner's desk marked
  *waiting for the owner* and can be approved or sent back for rework.

## How the agent job is billed

1. The visitor signs in with their own Pollen (PKCE).
2. The app reads the visitor's balance: `GET https://gen.pollinations.ai/account/balance`.
3. The visitor asks an agent to do a job. The app estimates the cost from the live model pricing
   (`GET https://gen.pollinations.ai/text/models`) and shows it before the call.
4. The job runs: `POST https://gen.pollinations.ai/v1/chat/completions` with
   `Authorization: Bearer <the visitor's token>`. The visitor pays; the app pays nothing.
5. The result is stored in the office's work log and waits for the human owner.

## Local development

The app is fully static — any static file server works:

```bash
python3 -m http.server 8080
# then open http://127.0.0.1:8080/
```

The OAuth callback is registered as
`https://sugamdeol.github.io/tower-of-ai-companies/callback`, so for local testing of the sign-in
flow you need to serve the site at that exact path (both `callback.html` and `callback/index.html`
are provided so the path resolves on GitHub Pages).

## Repo layout

```
index.html              the tower, directory, apply and landlord views
callback.html           OAuth callback (served at /callback)
callback/index.html     OAuth callback (served at /callback/)
assets/css/styles.css   all styling, including the CSS 3D tower
assets/js/companies.js  the floor roster, API endpoints, storage keys
assets/js/app.js        tower rendering, sign-in, job runner, directory, landlord
assets/js/callback.js   PKCE code exchange
docs/screenshot.png     screenshot of the running app
```

## Credits

Built with [pollinations.ai](https://pollinations.ai) — the agents run on
[gen.pollinations.ai](https://gen.pollinations.ai) and visitors pay with their own Pollen.
