from datetime import datetime, timezone
import os
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import create_review, delete_review, get_review, init_db, list_reviews, update_review


ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "reviewblog2025")
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))
ALLOWED_CATEGORIES = {"book", "movie", "music", "other"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]


UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Review Blog API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def startup():
    init_db()


def require_admin_password(x_admin_password: str | None):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")


def normalize_category(category: str):
    normalized = category.strip().lower()
    if normalized not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail="Category must be book, movie, music, or other")
    return normalized


def normalize_rating(rating: int):
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    return rating


def clean_required_text(value: str, field_name: str):
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail=f"{field_name} is required")
    return cleaned


def delete_cover_file(cover_url: str | None):
    if cover_url and cover_url.startswith("/uploads/"):
        cover_path = UPLOAD_DIR / Path(cover_url).name
        if cover_path.exists():
            cover_path.unlink()


async def save_cover_image(cover: UploadFile | None):
    if cover is None or not cover.filename:
        return None

    if cover.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Cover image must be JPEG, PNG, WEBP, or GIF")

    original_name = Path(cover.filename).name
    extension = Path(original_name).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        extension = ".jpg"

    filename = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename
    contents = await cover.read()
    destination.write_bytes(contents)
    return f"/uploads/{filename}"


@app.get("/reviews")
def read_reviews():
    return list_reviews()


@app.get("/reviews/{review_id}")
def read_review(review_id: int):
    review = get_review(review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@app.post("/reviews", status_code=201)
async def publish_review(
    title: str = Form(...),
    author: str = Form(...),
    category: str = Form(...),
    rating: int = Form(...),
    excerpt: str = Form(...),
    body: str = Form(...),
    cover: UploadFile | None = File(None),
    x_admin_password: str | None = Header(None, alias="X-Admin-Password"),
):
    require_admin_password(x_admin_password)

    cover_url = await save_cover_image(cover)
    created_at = datetime.now(timezone.utc).isoformat()

    return create_review(
        title=clean_required_text(title, "Title"),
        author=clean_required_text(author, "Author"),
        category=normalize_category(category),
        rating=normalize_rating(rating),
        excerpt=clean_required_text(excerpt, "Excerpt"),
        body=clean_required_text(body, "Review body"),
        cover_url=cover_url,
        created_at=created_at,
    )


@app.put("/reviews/{review_id}")
async def edit_review(
    review_id: int,
    title: str = Form(...),
    author: str = Form(...),
    category: str = Form(...),
    rating: int = Form(...),
    excerpt: str = Form(...),
    body: str = Form(...),
    remove_cover: bool = Form(False),
    cover: UploadFile | None = File(None),
    x_admin_password: str | None = Header(None, alias="X-Admin-Password"),
):
    require_admin_password(x_admin_password)

    existing = get_review(review_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Review not found")

    new_cover_url = await save_cover_image(cover)
    next_cover_url = existing.get("cover_url")

    if new_cover_url:
        delete_cover_file(next_cover_url)
        next_cover_url = new_cover_url
    elif remove_cover:
        delete_cover_file(next_cover_url)
        next_cover_url = None

    return update_review(
        review_id=review_id,
        title=clean_required_text(title, "Title"),
        author=clean_required_text(author, "Author"),
        category=normalize_category(category),
        rating=normalize_rating(rating),
        excerpt=clean_required_text(excerpt, "Excerpt"),
        body=clean_required_text(body, "Review body"),
        cover_url=next_cover_url,
    )


@app.delete("/reviews/{review_id}")
def remove_review(
    review_id: int,
    x_admin_password: str | None = Header(None, alias="X-Admin-Password"),
):
    require_admin_password(x_admin_password)

    deleted = delete_review(review_id)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Review not found")

    delete_cover_file(deleted.get("cover_url"))

    return {"ok": True, "deleted_id": review_id}
