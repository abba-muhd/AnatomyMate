# AnatomyMate.ai

Your AI Anatomy Tutor — starter project.

## Project structure

- `frontend/` — website interface
- `backend/` — FastAPI backend
- `backend/.env.example` — future server-side AI configuration

## Requirements

- Python 3.10+
- VS Code or GitHub Codespaces
- A modern web browser

## Start the backend

Open a terminal:

```bash
cd backend
python -m venv .venv
```

Activate the environment.

Windows:

```bash
.venv\Scripts\activate
```

Linux/macOS/Codespaces:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the API:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at:

http://localhost:8000

## Start the frontend

Open `frontend/index.html` with a browser, or use VS Code Live Server.

The frontend sends questions to:

http://localhost:8000/api/chat

## Current version

This starter intentionally uses a temporary response rather than a real AI provider. This keeps secret credentials out of the frontend.

## Next development stages

1. Connect a real AI model through the backend.
2. Add AnatomyMate system instructions.
3. Add conversation memory.
4. Add anatomy notes and PDF retrieval (RAG).
5. Add MCQ and quiz generation.
6. Add exam mode.
7. Add user accounts and chat history.
8. Deploy the frontend and backend.
9. Add a custom domain such as anatomymate.ai.
10. Later evaluate fine-tuning/open-source models for a specialized AnatomyMate model.

## Security

Never put private API keys in:
- `index.html`
- `style.css`
- `script.js`

Keep secrets on the server in environment variables.
