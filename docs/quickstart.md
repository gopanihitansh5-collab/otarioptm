# OtariOptm Quickstart

## Prerequisites

- Node.js 18+ and Python 3.12+
- Otari API key (`OTARI_API_KEY` env var)
- Docker (optional, for self-hosted gateway)

## 1. Bootstrap the Project

```bash
git clone https://github.com/your-handle/otarioptm.git
cd otarioptm
uv sync --extra dev
```

## 2. Start the OTARI Gateway

```bash
# Using hosted Otari.ai (recommended for hackathon)
export OTARI_API_KEY="pk-…from-otari.ai"
uv run otari serve --config config/example.yml

# Or self-hosted
docker compose up -d
```

## 3. Launch the Frontend

```bash
cd web
npm install && npm run dev
```

Open http://localhost:5173 to see the composer.

## 4. Build Your First Workflow

1. **Drag a "Model Chat" node** onto the canvas
2. **Set model**: `alibaba/qwen-3.5-35b-a3b` (or any `provider:model`)
3. **Drag a "Web Search" node** and query: `"latest AI funding news"`
4. **Drag a "Code Exec" node** with script: `print("Hello from sandbox")`
5. **Connect nodes**: Chat → Search → Code
6. **Hit "Run"** and watch live cost/tokens in the sidebar

## 5. Test Budget Enforcement

- Set per-project budget: `$5.00` in workflow config
- Run workflow until spend approaches limit
- Verify request blocking at cap

## 6. Export & Share

- **Save workflow** as JSON/YAML
- **Share API key** with scoped budget
- **Export activity CSV** from dashboard

## 7. Record Your Demo (3‑5 min)

1. Open the app at localhost:5173
2. Build a research agent (Search → LLM → Code)
3. Show live cost ticking in sidebar
4. Demonstrate auto‑model switch when latency spikes
5. Export activity log and review spend
6. Stop recording (~3 minutes)

## 7. Submit to DoraHacks

See `docs/submission.md` for the full checklist.