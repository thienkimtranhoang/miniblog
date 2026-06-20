import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";


const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const EMPTY_FORM = {
  title: "",
  author: "",
  category: "book",
  rating: 5,
  excerpt: "",
  body: "",
  cover: null,
};


export default function Admin() {
  const { id: editId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(editId);
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem("review-admin-password") || "");
  const [gateError, setGateError] = useState("");
  const [unlocked, setUnlocked] = useState(() => Boolean(sessionStorage.getItem("review-admin-password")));
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [currentCoverUrl, setCurrentCoverUrl] = useState("");
  const [removeCover, setRemoveCover] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!unlocked || !isEditing) {
      return;
    }

    const controller = new AbortController();

    async function loadReviewForEdit() {
      try {
        setLoadingReview(true);
        setLoadError("");
        setStatus({ type: "", message: "" });
        const response = await fetch(`${API_BASE}/reviews/${editId}`, { signal: controller.signal });
        if (response.status === 404) {
          throw new Error("Review not found");
        }
        if (!response.ok) {
          throw new Error("Could not load this review");
        }
        const review = await response.json();
        setForm({
          title: review.title || "",
          author: review.author || "",
          category: review.category || "book",
          rating: review.rating || 5,
          excerpt: review.excerpt || "",
          body: review.body || "",
          cover: null,
        });
        setCurrentCoverUrl(review.cover_url || "");
        setRemoveCover(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setLoadError(err.message || "Could not load this review");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingReview(false);
        }
      }
    }

    loadReviewForEdit();
    return () => controller.abort();
  }, [editId, isEditing, unlocked]);

  useEffect(() => {
    if (!isEditing) {
      setForm(EMPTY_FORM);
      setCurrentCoverUrl("");
      setRemoveCover(false);
      setLoadError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isEditing]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function getCoverSource(coverUrl) {
    if (!coverUrl) {
      return "";
    }
    if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) {
      return coverUrl;
    }
    return `${API_BASE}${coverUrl}`;
  }

  async function unlockAdmin() {
    if (!password.trim()) {
      setGateError("Enter the admin password");
      return;
    }

    try {
      setCheckingPassword(true);
      setGateError("");
      const response = await fetch(`${API_BASE}/admin/session`, {
        method: "POST",
        headers: {
          "X-Admin-Password": password,
        },
      });

      if (response.status === 401) {
        throw new Error("Incorrect password");
      }
      if (!response.ok) {
        throw new Error("Could not verify password");
      }

      sessionStorage.setItem("review-admin-password", password);
      setAdminPassword(password);
      setUnlocked(true);
    } catch (err) {
      setGateError(err.message || "Could not verify password");
    } finally {
      setCheckingPassword(false);
    }
  }

  function insertMarkdown(before, after, fallbackText) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart ?? form.body.length;
    const end = textarea.selectionEnd ?? form.body.length;
    const selected = form.body.slice(start, end);
    const innerText = selected || fallbackText;
    const insert = `${before}${innerText}${after}`;
    const nextBody = `${form.body.slice(0, start)}${insert}${form.body.slice(end)}`;

    updateField("body", nextBody);

    requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + before.length;
      const selectionEnd = selectionStart + innerText.length;
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  async function submitReview() {
    if (!form.title.trim() || !form.author.trim() || !form.excerpt.trim() || !form.body.trim()) {
      setStatus({ type: "error", message: "Title, author, excerpt, and review body are required." });
      return;
    }
    if (!adminPassword) {
      setStatus({ type: "error", message: "Admin session expired. Refresh and enter the password again." });
      return;
    }

    const payload = new FormData();
    payload.append("title", form.title);
    payload.append("author", form.author);
    payload.append("category", form.category);
    payload.append("rating", String(form.rating));
    payload.append("excerpt", form.excerpt);
    payload.append("body", form.body);
    payload.append("remove_cover", String(removeCover));
    if (form.cover) {
      payload.append("cover", form.cover);
    }

    try {
      setSubmitting(true);
      setStatus({ type: "", message: "" });
      const response = await fetch(isEditing ? `${API_BASE}/reviews/${editId}` : `${API_BASE}/reviews`, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "X-Admin-Password": adminPassword,
        },
        body: payload,
      });

      if (response.status === 401) {
        throw new Error("Incorrect admin password");
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Could not publish review");
      }

      const savedReview = await response.json();
      setPreviewOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (isEditing) {
        navigate(`/review/${savedReview.id}`);
        return;
      }

      setForm(EMPTY_FORM);
      setRemoveCover(false);
      setCurrentCoverUrl("");
      setStatus({ type: "success", message: "Review published." });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Could not save review" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="page-shell">
        <Navbar />
        <main className="admin-gate">
          <div className="gate-panel">
          <h1>{isEditing ? "Edit Review" : "Admin"}</h1>
          <p>Enter the publishing password.</p>
            <input
              autoFocus
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  unlockAdmin();
                }
              }}
              placeholder="Password"
              type="password"
              value={password}
            />
            <button className="primary-button" disabled={checkingPassword} type="button" onClick={unlockAdmin}>
              {checkingPassword ? "Checking..." : "Enter"}
            </button>
            {gateError && <p className="status-line error">{gateError}</p>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Navbar />

      <main className="admin-page">
        <header className="admin-header">
          <h1>{isEditing ? "Edit Review" : "Publish Review"}</h1>
          <p>{isEditing ? "Revise the saved piece and keep its original date." : "Draft in Markdown, attach a cover if you have one, then publish."}</p>
        </header>

        <section className="admin-panel">
          {loadingReview && <div className="loading-state">Loading review...</div>}

          {loadError && (
            <div className="error-state">
              <h2>Review unavailable.</h2>
              <p>{loadError}</p>
            </div>
          )}

          {!loadingReview && !loadError && (
            <div className="form-grid">
            <label className="field">
              <span>Title</span>
              <input
                onChange={(event) => updateField("title", event.target.value)}
                type="text"
                value={form.title}
              />
            </label>

            <label className="field">
              <span>Author / Director / Artist</span>
              <input
                onChange={(event) => updateField("author", event.target.value)}
                type="text"
                value={form.author}
              />
            </label>

            <label className="field">
              <span>Category</span>
              <select onChange={(event) => updateField("category", event.target.value)} value={form.category}>
                <option value="book">Book</option>
                <option value="movie">Movie</option>
                <option value="music">Music</option>
                <option value="other">Other</option>
              </select>
            </label>

            <div className="field">
              <label>Rating</label>
              <div className="star-picker" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    className={`star-button ${value <= form.rating ? "active" : ""}`}
                    key={value}
                    onClick={() => updateField("rating", value)}
                    title={`${value} stars`}
                    type="button"
                  >
                    {value <= form.rating ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            <label className="field field-full">
              <span>Excerpt</span>
              <input
                onChange={(event) => updateField("excerpt", event.target.value)}
                type="text"
                value={form.excerpt}
              />
            </label>

            <label className="field field-full">
              <span>Cover image</span>
              <input
                accept="image/*"
                onChange={(event) => {
                  updateField("cover", event.target.files?.[0] || null);
                  setRemoveCover(false);
                }}
                ref={fileInputRef}
                type="file"
              />
            </label>

            {isEditing && currentCoverUrl && (
              <div className="field field-full current-cover">
                <span>Current cover</span>
                <img src={getCoverSource(currentCoverUrl)} alt="Current cover" />
                <label className="checkbox-field">
                  <input
                    checked={removeCover}
                    onChange={(event) => {
                      setRemoveCover(event.target.checked);
                      if (event.target.checked && fileInputRef.current) {
                        fileInputRef.current.value = "";
                        updateField("cover", null);
                      }
                    }}
                    type="checkbox"
                  />
                  <span>Remove cover image</span>
                </label>
              </div>
            )}

            <div className="field field-full">
              <label htmlFor="review-body">Review body</label>
              <div className="editor-toolbar">
                <button
                  className="toolbar-button"
                  onClick={() => insertMarkdown("**", "**", "bold text")}
                  title="Bold"
                  type="button"
                >
                  B
                </button>
                <button
                  className="toolbar-button"
                  onClick={() => insertMarkdown("*", "*", "italic text")}
                  title="Italic"
                  type="button"
                >
                  I
                </button>
                <button
                  className="toolbar-button"
                  onClick={() => insertMarkdown("> ", "", "quoted passage")}
                  title="Blockquote"
                  type="button"
                >
                  "
                </button>
                <button
                  className="toolbar-button"
                  onClick={() => insertMarkdown("## ", "", "Section heading")}
                  title="Heading"
                  type="button"
                >
                  #
                </button>
                <button
                  className={`toolbar-button ${previewOpen ? "active" : ""}`}
                  onClick={() => setPreviewOpen((open) => !open)}
                  type="button"
                >
                  Preview
                </button>
              </div>
              <textarea
                id="review-body"
                onChange={(event) => updateField("body", event.target.value)}
                ref={textareaRef}
                value={form.body}
              />

              {previewOpen && (
                <div className="preview-panel review-body">
                  <ReactMarkdown>{form.body || "Preview will appear here."}</ReactMarkdown>
                </div>
              )}
            </div>
            </div>
          )}

          <div className="admin-actions">
            {!loadError && (
              <button className="primary-button" disabled={submitting || loadingReview} type="button" onClick={submitReview}>
                {submitting ? "Saving..." : isEditing ? "Save Changes" : "Publish Review"}
              </button>
            )}
            {isEditing && (
              <Link className="secondary-button" to={`/review/${editId}`}>
                Cancel
              </Link>
            )}
            {status.message && <p className={`status-line ${status.type}`}>{status.message}</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
