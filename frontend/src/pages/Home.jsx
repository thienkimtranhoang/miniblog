import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import ReviewCard from "../components/ReviewCard.jsx";


const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";


export default function Home() {
  const [reviews, setReviews] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadReviews() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_BASE}/reviews`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Could not load reviews");
        }
        const data = await response.json();
        setReviews(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Could not load reviews");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReviews();
    return () => controller.abort();
  }, []);

  const visibleReviews = useMemo(() => {
    if (activeCategory === "all") {
      return reviews;
    }
    return reviews.filter((review) => review.category === activeCategory);
  }, [activeCategory, reviews]);

  function scrollToReviews() {
    document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="page-shell">
      <Navbar activeCategory={activeCategory} onCategoryChange={setActiveCategory} showFilters />

      <section className="hero">
        <div className="hero-aura" aria-hidden="true" />
        <div className="hero-content">
          <h1> reviews that may sound stupid </h1>
          <p> may not really worth your time but hopefully not corny</p>
          <button className="primary-button" type="button" onClick={scrollToReviews}>
            latest ↓
          </button>
        </div>
      </section>

      <main className="reviews-section" id="reviews">
        <span className="section-kicker">Latest reviews</span>

        {loading && <div className="loading-state">Loading reviews...</div>}

        {!loading && error && (
          <div className="error-state">
            <h2>Reviews are unavailable.</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && visibleReviews.length === 0 && (
          <div className="empty-state">
            <h2>No reviews yet.</h2>
            <p>Published pieces will appear here.</p>
          </div>
        )}

        {!loading && !error && visibleReviews.length > 0 && (
          <div className="review-grid">
            {visibleReviews.map((review, index) => (
              <ReviewCard index={index} key={review.id} review={review} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
