import { Link, NavLink } from "react-router-dom";


const FILTERS = [
  { value: "all", label: "All" },
  { value: "book", label: "Books" },
  { value: "movie", label: "Movies" },
  { value: "music", label: "Music" },
  { value: "other", label: "Other" },
];


export default function Navbar({ activeCategory = "all", onCategoryChange, showFilters = false }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link className="wordmark" to="/">
          Violet Margins
        </Link>

        <nav className="nav-right" aria-label="Primary navigation">
          {showFilters && (
            <div className="filter-tabs" aria-label="Review filters">
              {FILTERS.map((filter) => (
                <button
                  className={`filter-tab ${activeCategory === filter.value ? "active" : ""}`}
                  key={filter.value}
                  type="button"
                  onClick={() => onCategoryChange(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/admin">
            Admin
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
