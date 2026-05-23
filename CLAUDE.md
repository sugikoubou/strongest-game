# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start the server (default port 3000, or $PORT env var)
npm start
```

There is no test suite or linter configured.

## Architecture

This is an Express.js + Pug character battle game deployed on DigitalOcean App Platform.

**Entry point**: `bin/www` → `app.js` → `routes/index.js`

Note: `index.js` at the project root is **not** the entry point. It is an old standalone prototype with dangling `app.get` / `app.listen` calls at the bottom and is not loaded by the server.

### Firebase setup (`app.js`)

Firebase Admin SDK is initialized at startup using `strongest-game-key.json` (gitignored — must be provided manually). The Realtime Database reference is attached to every request as `req.db` via middleware, making it available in all route handlers.

- Firebase DB URL: `https://strongest-game-default-rtdb.firebaseio.com/`
- Data path: `users/${userId}/characters/${charId}`
- Character fields: `name`, `ability`, `strength`, `intelligence`, `agility`, `wins`, `losses`, `createdAt`

### Routes (`routes/index.js`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List characters for `?userId=` |
| POST | `/create-character` | Create a new character |
| POST | `/battle` | Battle two characters; Gemini AI integration is stubbed (fighter1 always wins currently) |
| GET | `/data-from-db` | Display raw DB data |
| POST | `/save-data` | Write arbitrary data to DB |
| ALL | `*` | Catch-all: generates deterministic random lorem ipsum-style pages |

### Random page generation

All unmatched URLs render a pseudo-random page. Content is deterministic per URL: `md5(hostname + path)` produces a numeric seed for a `MersenneTwister`, which drives word selection from large static arrays of nouns, verbs, adjectives, and adverbs. The same URL always renders the same content.

### Gemini AI

The `@google/generative-ai` package is installed but the battle outcome logic in `POST /battle` is only stubbed. The actual call to Gemini is commented out — fighter1 always wins.

## Required credentials

- `strongest-game-key.json` — Firebase service account JSON (gitignored). Place in the project root before starting.
