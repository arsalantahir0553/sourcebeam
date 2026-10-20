# Sourcebeam web client

The React interface for **Sourcebeam**, a citation-first, multimodal AI workspace. It provides private account access, saved conversations, a reusable PDF knowledge base, private image attachments, streamed Markdown answers, and an evidence drawer with page citations and semantic match scores.

The FastAPI + pgvector backend lives in the sibling `py` directory. Its README contains the architecture, security model, API documentation, and full local setup.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

The Vite development proxy sends `/api` requests to `http://127.0.0.1:8000`.

## Configuration

`VITE_API_BASE_URL` is optional. Leave it unset to use the same-origin `/api` path through the development or production reverse proxy. Set it only when the API is hosted on a different origin, and add the frontend origin to the backend's `ALLOWED_ORIGINS`.

## Quality checks

```powershell
npm run lint
npm run build
```

## Portfolio highlights

- Incremental NDJSON streaming with cancellation and partial-response recovery
- Conversation and document lifecycle management
- JPEG, PNG, and WebP composer attachments with private previews
- Per-conversation retrieval context with visible active-source state
- Grounded source cards showing PDF name, page, excerpt, and similarity score
- GitHub-flavored Markdown, tables, and copyable code blocks
- Responsive layout, keyboard focus states, reduced-motion support, and accessible status messaging
