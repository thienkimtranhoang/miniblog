import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router-dom";
import HeartButton from "../components/HeartButton.jsx";
import Navbar from "../components/Navbar.jsx";


const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";


function getCoverSource(coverUrl) {
  if (!coverUrl) {
    return null;
  }
  if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) {
    return coverUrl;
  }
  return `${API_BASE}${coverUrl}`;
}


function formatCategory(category) {
  return category ? category.charAt(0).toUpperCase() + category.slice(1) : "Other";
}


function formatDate(dateValue) {
  if (!dateValue) {
    return "";
  }
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateValue));
}


function renderStars(rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating) || 1));
  return Array.from({ length: 5 }, (_, index) => (
    <span className={index < safeRating ? "star-filled" : "star-empty"} key={index}>
      {index < safeRating ? "★" : "☆"}
    </span>
  ));
}


export default function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteStatus, setDeleteStatus] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReview() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_BASE}/reviews/${id}`, { signal: controller.signal });
        if (response.status === 404) {
          throw new Error("Review not found");
        }
        if (!response.ok) {
          throw new Error("Could not load this review");
        }
        const data = await response.json();
        setReview(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Could not load this review");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReview();
    return () => controller.abort();
  }, [id]);

  async function handleDelete() {
    if (!deletePassword.trim()) {
      setDeleteStatus("Enter the admin password to delete this review.");
      return;
    }

    try {
      setDeleting(true);
      setDeleteStatus("");
      const response = await fetch(`${API_BASE}/reviews/${id}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Password": deletePassword,
        },
      });

      if (response.status === 401) {
        throw new Error("Incorrect password");
      }
      if (!response.ok) {
        throw new Error("Could not delete this review");
      }

      navigate("/");
    } catch (err) {
      setDeleteStatus(err.message || "Could not delete this review");
    } finally {
      setDeleting(false);
    }
  }

  const coverSource = getCoverSource(review?.cover_url);
  const category = review?.category || "other";

  return (
    <div className="page-shell">
      <Navbar />

      <main className="review-page">
        <Link className="back-link" to="/">
          ← All reviews
        </Link>

        {loading && <div className="loading-state">Loading review...</div>}

        {!loading && error && (
          <div className="error-state">
            <h2>This page is quiet.</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && review && (
          <article className="review-article">
            <div className="review-cover-wrap">
              {coverSource ? (
                <img className="review-cover" src={coverSource} alt={`${review.title} cover`} />
              ) : (
                <div className={`review-cover-placeholder placeholder-${category}`} aria-hidden="true">
                  {formatCategory(category).charAt(0)}
                </div>
              )}
            </div>

            <header className="review-header">
              <span className="category-tag">{formatCategory(category)}</span>
              <h1>{review.title}</h1>
              <p className="review-author">{review.author}</p>
            </header>

            <div className="review-meta">
              <div className="stars" aria-label={`${review.rating} out of 5 stars`}>
                {renderStars(review.rating)}
              </div>
              <span className="review-date">{formatDate(review.created_at)}</span>
              <HeartButton initialCount={review.hearts_count} reviewId={review.id} />
            </div>

            <div className="divider" />

            <div className="review-body">
              <ReactMarkdown>{review.body}</ReactMarkdown>
            </div>

            <div className="delete-area">
              <Link className="secondary-button" to={`/admin/edit/${review.id}`}>
                Edit review
              </Link>

              <button className="danger-button" type="button" onClick={() => setDeleteOpen((open) => !open)}>
                Delete review
              </button>

              {deleteOpen && (
                <div className="inline-delete">
                  <input
                    aria-label="Admin password"
                    onChange={(event) => setDeletePassword(event.target.value)}
                    placeholder="Admin password"
                    type="password"
                    value={deletePassword}
                  />
                  <button className="danger-button" disabled={deleting} type="button" onClick={handleDelete}>
                    {deleting ? "Deleting..." : "Confirm delete"}
                  </button>
                </div>
              )}

              {deleteStatus && <p className="status-line error">{deleteStatus}</p>}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
