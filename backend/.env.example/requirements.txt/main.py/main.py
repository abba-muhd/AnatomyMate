import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="AnatomyMate API",
    version="1.0.0"
)

# Development CORS configuration.
# Restrict this to your real domain before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str


@app.get("/")
def root():
    return {
        "message": "AnatomyMate API is running"
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "AnatomyMate"
    }


@app.post("/api/chat")
def chat(request: ChatRequest):
    question = request.question.strip()

    if not question:
        return {
            "answer": "Please enter an anatomy question."
        }

    # Temporary development response.
    # Replace this section with your chosen AI model/API integration.
    answer = (
        "AnatomyMate is running in development mode.\n\n"
        f"Your question: {question}\n\n"
        "The next step is to connect this endpoint to a real AI model "
        "and add AnatomyMate's anatomy knowledge base."
    )

    return {"answer": answer}
