## Getting Started

This backend exposes a meal-photo analysis API (the Netlify function in `netlify/functions/analyze-meal-photo.js`).

**1. Copy environment variables:**
```bash
cp .env.example .env
```

Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk-...
PORT=4000
```

**2. Install and run:**
```bash
npm install
npm run dev
```

The API listens on `http://localhost:4000`.

- `GET /health` — liveness check
- `POST /analyze-meal-photo` — send `{ "imageBase64": "...", "language": "en" }`

The same function is deployed on Netlify as `/.netlify/functions/analyze-meal-photo`.
