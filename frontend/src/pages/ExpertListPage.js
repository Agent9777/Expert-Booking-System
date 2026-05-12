import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { expertService } from '../services/api';

const CATEGORIES = ['All', 'Technology', 'Finance', 'Health', 'Legal', 'Marketing', 'Design', 'Business', 'Education'];

const AVATAR_COLORS = {
  Technology: ['#6c63ff', '#1a1a2e'],
  Finance: ['#22c55e', '#0a1f0f'],
  Health: ['#ef4444', '#1f0a0a'],
  Legal: ['#f59e0b', '#1f180a'],
  Marketing: ['#ec4899', '#1f0a14'],
  Design: ['#06b6d4', '#0a1a1f'],
  Business: ['#8b5cf6', '#150a1f'],
  Education: ['#3b82f6', '#0a101f'],
};

function Avatar({ name, category, size = 52 }) {
  const colors = AVATAR_COLORS[category] || ['#6c63ff', '#1a1a2e'];
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${colors[1]}, ${colors[1]} 40%, ${colors[0]}22)`,
        border: `1.5px solid ${colors[0]}44`,
        color: colors[0],
        fontSize: size * 0.38,
        borderRadius: size * 0.27,
      }}
    >
      {initials}
    </div>
  );
}

function StarRating({ rating }) {
  return (
    <span className="rating">
      ★ {rating.toFixed(1)}
    </span>
  );
}

function ExpertCard({ expert, onClick }) {
  return (
    <div className="card expert-card fade-in" onClick={() => onClick(expert._id)}>
      <div className="expert-card-header">
        <Avatar name={expert.name} category={expert.category} />
        <div style={{ flex: 1 }}>
          <div className="expert-name">{expert.name}</div>
          <div className="expert-meta">
            <span className="badge badge-purple">{expert.category}</span>
            <span className="expert-exp">{expert.experience}y exp</span>
          </div>
        </div>
        <StarRating rating={expert.rating} />
      </div>
      <p className="expert-bio">{expert.bio}</p>
      <div className="expert-card-footer">
        <div className="expert-rate">
          ₹{expert.hourlyRate?.toLocaleString('en-IN')}
          <span> / hr</span>
        </div>
        <span className="badge badge-green">Available</span>
      </div>
    </div>
  );
}

export default function ExpertListPage() {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const searchTimer = useRef(null);
  const navigate = useNavigate();

  const fetchExperts = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await expertService.getExperts(params);
      setExperts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.displayMessage || 'Failed to load experts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchExperts({ page: 1, limit: 6, category, search });
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search, category, fetchExperts]);

  useEffect(() => {
    fetchExperts({ page, limit: 6, category, search });
  }, [page]); // eslint-disable-line

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (!pagination.totalPages || pagination.totalPages <= 1) return null;
    const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);
    return (
      <div className="pagination">
        <button
          className="page-btn"
          disabled={!pagination.hasPrev}
          onClick={() => handlePageChange(page - 1)}
        >
          ←
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={`page-btn ${p === page ? 'active' : ''}`}
            onClick={() => handlePageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          className="page-btn"
          disabled={!pagination.hasNext}
          onClick={() => handlePageChange(page + 1)}
        >
          →
        </button>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Find Your Expert<span className="accent-dot">.</span></h1>
        <p className="page-subtitle">Book 1-on-1 sessions with verified professionals across industries</p>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="search-input"
            placeholder="Search by name, skill or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {!loading && !error && (
        <p className="results-info">
          {pagination.total !== undefined
            ? `Showing ${experts.length} of ${pagination.total} experts`
            : ''}
        </p>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Finding the best experts for you...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <div className="state-icon">⚠</div>
          <div className="state-title">Something went wrong</div>
          <p className="state-msg">{error}</p>
          <button className="btn btn-primary" onClick={() => fetchExperts({ page, limit: 6, category, search })}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && experts.length === 0 && (
        <div className="empty-state">
          <div className="state-icon">🔍</div>
          <div className="state-title">No experts found</div>
          <p className="state-msg">Try adjusting your search or filters</p>
        </div>
      )}

      {!loading && !error && experts.length > 0 && (
        <>
          <div className="expert-grid">
            {experts.map((expert) => (
              <ExpertCard key={expert._id} expert={expert} onClick={(id) => navigate(`/experts/${id}`)} />
            ))}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
}
