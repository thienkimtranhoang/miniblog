import { Link } from "react-router-dom";
import HeartButton from "./HeartButton.jsx";


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


function renderStars(rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating) || 1));
  return Array.from({ length: 5 }, (_, index) => (
    <span className={index < safeRating ? "star-filled" : "star-empty"} key={index}>
      {index < safeRating ? "★" : "☆"}
    </span>
  ));
}


export default function ReviewCard({ review, index }) {
  const coverSource = getCoverSource(review.cover_url);
  const category = review.category || "other";
  const delay = `${index * 80}ms`;

  return (
    <article className="review-card" style={{ "--delay": delay }}>
      {coverSource ? (
        <img className="card-cover" src={coverSource} alt={`${review.title} cover`} />
      ) : (
        <div className={`card-cover placeholder placeholder-${category}`} aria-hidden="true">
          {formatCategory(category).charAt(0)}
        </div>
      )}

      <div className="card-content">
        <span className="category-tag">{formatCategory(category)}</span>
        <h2 className="card-title">{review.title}</h2>
        <p className="card-author">{review.author}</p>
        <div className="card-meta-row">
          <div className="stars" aria-label={`${review.rating} out of 5 stars`}>
            {renderStars(review.rating)}
          </div>
          <HeartButton initialCount={review.hearts_count} reviewId={review.id} />
        </div>
        <p className="card-excerpt">{review.excerpt}</p>
        <Link className="read-more" to={`/review/${review.id}`}>
          Read more →
        </Link>
      </div>
    </article>
  );
}
