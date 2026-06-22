import { useEffect, useState } from "react";


const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const HEART_STORAGE_PREFIX = "review-heart:";


function getHeartStorageKey(reviewId) {
  return `${HEART_STORAGE_PREFIX}${reviewId}`;
}


function getSavedHeart(reviewId) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(getHeartStorageKey(reviewId)) === "true";
  } catch {
    return false;
  }
}


function saveHeart(reviewId, hearted) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getHeartStorageKey(reviewId), hearted ? "true" : "false");
  } catch {
    // Local storage can be blocked; the server count is still the source of truth.
  }
}


export default function HeartButton({ className = "", initialCount = 0, reviewId }) {
  const [hearted, setHearted] = useState(() => getSavedHeart(reviewId));
  const [heartCount, setHeartCount] = useState(Number(initialCount) || 0);
  const [heartError, setHeartError] = useState("");
  const [savingHeart, setSavingHeart] = useState(false);

  useEffect(() => {
    setHearted(getSavedHeart(reviewId));
    setHeartCount(Number(initialCount) || 0);
    setHeartError("");
  }, [initialCount, reviewId]);

  async function handleHeartClick() {
    if (savingHeart) {
      return;
    }

    const previousHearted = hearted;
    const previousCount = heartCount;
    const nextHearted = !hearted;
    const nextCount = Math.max(0, heartCount + (nextHearted ? 1 : -1));

    setSavingHeart(true);
    setHeartError("");
    setHearted(nextHearted);
    setHeartCount(nextCount);
    saveHeart(reviewId, nextHearted);

    try {
      const response = await fetch(`${API_BASE}/reviews/${reviewId}/heart`, {
        method: nextHearted ? "POST" : "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not update hearts");
      }

      const data = await response.json();
      setHeartCount(Number(data.hearts_count) || 0);
    } catch (err) {
      setHearted(previousHearted);
      setHeartCount(previousCount);
      saveHeart(reviewId, previousHearted);
      setHeartError(err.message || "Could not update hearts");
    } finally {
      setSavingHeart(false);
    }
  }

  return (
    <div className={`heart-control ${className}`}>
      <button
        aria-label={hearted ? "Remove heart from this review" : "Heart this review"}
        aria-pressed={hearted}
        className={`heart-button ${hearted ? "hearted" : ""}`}
        disabled={savingHeart}
        type="button"
        onClick={handleHeartClick}
      >
        <span aria-hidden="true">{"\u2665"}</span>
      </button>
      <span className="heart-count" aria-live="polite">
        {heartCount.toLocaleString("en")}
      </span>
      <span className="heart-label">hearts</span>
      {heartError && <span className="heart-error">try again</span>}
    </div>
  );
}
