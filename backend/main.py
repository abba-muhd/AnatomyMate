import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from google import genai
from database import SessionLocal, Student
from passlib.context import CryptContext

# Load environment variables
load_dotenv()

# Get Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()

# Create Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create FastAPI app
app = FastAPI(
    title="AnatomyMate.ai",
    description="AI-powered Human Anatomy learning platform",
    version="1.0.0"
)

# Allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/register")
def register_student(data: dict):
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return {
            "error": "Name, email, and password are required."
        }

    if len(password) < 6:
        return {
            "error": "Password must be at least 6 characters."
        }

    db = SessionLocal()

    try:
        existing_student = db.query(Student).filter(
            Student.email == email
        ).first()

        if existing_student:
            return {
                "error": "An account with this email already exists."
            }

        password_hash = pwd_context.hash(password)

        student = Student(
            name=name,
            email=email,
            password_hash=password_hash,
            role="student"
)

        db.add(student)
        db.commit()
        db.refresh(student)

        return {
            "message": "Student account created successfully.",
            "student": {
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "role": student.role,
            }
        }

    finally:
        db.close()


from jose import jwt
from datetime import datetime, timedelta, timezone

SECRET_KEY = os.getenv("SECRET_KEY", "").strip()

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is missing. Set it in the backend .env file."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer()

def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        student_id = int(payload["sub"])

        db = SessionLocal()
        try:
            student = db.query(Student).filter(
                Student.id == student_id
            ).first()

            if student is None:
                raise HTTPException(
                    status_code=401,
                    detail="Student account not found."
                )

            return {
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "role": student.role
            }
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token."
        )

def require_admin(
    current_student: dict = Depends(get_current_student)
):
    if not ADMIN_EMAIL:
        raise HTTPException(
            status_code=503,
            detail="Admin access is not configured."
        )

    if (
        current_student["email"].lower() != ADMIN_EMAIL
        or current_student.get("role") != "admin"
    ):
        raise HTTPException(
            status_code=403,
            detail="Administrator access required."
        )

    return current_student

@app.post("/api/login")
def login_student(data: dict):
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return {"error": "Email and password are required."}

    db = SessionLocal()

    try:
        student = db.query(Student).filter(
            Student.email == email
        ).first()

        if not student or not pwd_context.verify(
            password, student.password_hash
        ):
            return {"error": "Invalid email or password."}

        token = jwt.encode(
            {
                "sub": str(student.id),
                "email": student.email,
                "exp": datetime.now(timezone.utc)
                + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            },
            SECRET_KEY,
            algorithm=ALGORITHM,
        )

        return {
            "message": "Login successful.",
            "access_token": token,
            "token_type": "bearer",
            "student": {
                "id": student.id,
                "name": student.name,
                "email": student.email,
            },
        }

    finally:
        db.close()

@app.get("/api/me")
def get_my_profile(
    current_student: dict = Depends(get_current_student)
):
    return {
        "message": "Authenticated successfully.",
        "student": current_student
    }

@app.get("/api/health")
def health():
    return {"status": "healthy"}

@app.get("/api/admin/me")
def admin_profile(
    current_admin: dict = Depends(require_admin)
):
    return {
        "message": "Admin access verified.",
        "admin": current_admin
    }

@app.get("/api/admin/students")
def admin_list_students(
    current_admin: dict = Depends(require_admin)
):
    db = SessionLocal()

    try:
        students = db.query(Student).order_by(
            Student.created_at.desc()
        ).all()

        return {
            "total": len(students),
            "students": [
                {
                    "id": student.id,
                    "name": student.name,
                    "email": student.email,
                    "role": student.role,
                    "created_at": (
                        student.created_at.isoformat()
                        if student.created_at else None
                    )
                }
                for student in students
            ]
        }
    finally:
        db.close()

@app.post("/api/chat")
def chat(
    data: dict,
    current_student: dict = Depends(get_current_student)
):
    message = data.get("message", "").strip()

    if not message:
        return {
            "reply": "Please enter an anatomy question."
        }

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=message,
            config={
                "system_instruction": """
You are AnatomyMate, an AI tutor specialized in Human Anatomy.

Your main purpose is to help students understand Human Anatomy clearly,
accurately, and academically.

When answering:
- Explain concepts in simple language first.
- Use correct anatomical terminology.
- Organize longer answers with headings and bullet points.
- Give examples when useful.
- For anatomical structures, explain location, relations, parts,
  blood supply, nerve supply, function, and clinical relevance when
  appropriate.
- Help students prepare for university examinations.
- If a question is not related to anatomy, politely explain that you
  are primarily an Anatomy tutor but still try to help when appropriate.
- Never invent anatomical facts.
- If you are uncertain, clearly say so.
"""
            }
        )

        return {
            "reply": response.text
        }

    except Exception as e:
        print("Gemini error:", e)

        return {
            "reply": "Sorry, I could not connect to Gemini right now. Please try again."
        }

@app.post("/api/quiz")
def generate_quiz(
    data: dict,
    current_student: dict = Depends(get_current_student)
):
    topic = data.get("topic", "Human Anatomy")
    difficulty = data.get("difficulty", "undergraduate")
    number = data.get("number", 10)

    prompt = f"""
Generate {number} multiple-choice Human Anatomy questions.

Topic: {topic}
Level: {difficulty}

Requirements:
- Each question must have exactly four options: A, B, C, D.
- Only one option must be correct.
- Questions should be academically accurate.
- Focus on undergraduate Human Anatomy.
- Include a short explanation for the correct answer.
- Return ONLY valid JSON.

Use this exact JSON format:

{{
  "questions": [
    {{
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Short explanation"
    }}
  ]
}}

The answer must be the option index:
0 = A
1 = B
2 = C
3 = D
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt
        )

        import json

        quiz_text = response.text.strip()

        if quiz_text.startswith("```"):
            quiz_text = quiz_text.replace("```json", "").replace("```", "").strip()

        quiz = json.loads(quiz_text)

        return quiz

    except Exception as e:
        print("Quiz generation error:", e)
        return {
            "error": "Could not generate quiz questions."
        }

# Serve frontend
frontend_path = Path(__file__).resolve().parent.parent / "frontend"

app.mount(
    "/",
    StaticFiles(directory=frontend_path, html=True),
    name="frontend"
)