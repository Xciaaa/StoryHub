import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Community() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.listPublicProjects(page, 20);
        if (cancelled) return;
        setProjects((prev) => (page === 1 ? data : [...prev, ...data]));
        setHasMore(data.length === 20);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page]);

  const handleDirectAccess = (e) => {
    e.preventDefault();
    const id = e.target.elements.id.value.trim();
    if (!id) return;
    navigate(`/project/${id}`);
  };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="glass-strong sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold">Community</h1>
        <Link to="/dashboard" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
          Dashboard
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {error && <p className="text-sm text-error mb-4">{error}</p>}

        <form onSubmit={handleDirectAccess} className="flex gap-2 mb-8">
          <input
            name="id"
            type="text"
            placeholder="Paste a shared link or project ID to open directly…"
            className="flex-1 rounded-md bg-zinc-950/80 border border-outline-variant px-3 py-2 text-sm text-on-background placeholder:text-on-surface-variant/60 focus:outline-none focus:border-violet-glow focus:ring-1 focus:ring-violet-glow transition-colors"
          />
          <button
            type="submit"
            className="rounded-md bg-indigo-electric text-white px-4 py-2 text-sm font-medium hover:bg-indigo-electric/90 transition-colors"
          >
            Open
          </button>
        </form>

        {loading && page === 1 ? (
          <p className="text-on-surface-variant text-sm">Loading community canvases…</p>
        ) : projects.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No public projects yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  to={`/project/${p.id}`}
                  className="group block rounded-lg border border-outline-variant/40 bg-surface-container/60 p-4 hover:border-indigo-electric/60 transition-colors"
                >
                  <h3 className="font-display font-medium text-sm mb-1 truncate group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  {p.description && (
                    <p className="text-xs text-on-surface-variant line-clamp-2 mb-2">{p.description}</p>
                  )}
                  <p className="text-xs text-on-surface-variant/70">
                    Updated {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-outline-variant px-3 py-1 text-sm hover:border-indigo-electric/60 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-on-surface-variant">Page {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="rounded-md border border-outline-variant px-3 py-1 text-sm hover:border-indigo-electric/60 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
