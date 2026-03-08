# Wireframe to React

Fullstack hackathon app built with Next.js. Upload or paste a wireframe, mockup, or UI screenshot, send it to OpenAI for layout analysis, and get back:

- a layout summary
- a live preview
- a copyable `React + Tailwind` component

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file:

```bash
cp .env.example .env.local
```

3. Set your OpenAI key in `.env.local`:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
```

## Notes

- Supported image inputs: pasted clipboard images, PNG, JPG
- Generation endpoint: `POST /api/generate`
- Preview rendering happens inside a sandboxed iframe
- Results are stored only in the current browser session
