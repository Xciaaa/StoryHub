import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listProjects();
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const project = await api.createProject({ title: newTitle.trim() });
      navigate(`/editor/${project.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Lore Canvas</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-400">
          <Link to="/community" className="hover:text-neutral-200">
            Community
          </Link>
          <span>{user?.username}</span>
          <button onClick={logout} className="hover:text-neutral-200">
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <form onSubmit={handleCreate} className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder="New project title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-neutral-100 text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'New project'}
          </button>
        </form>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {loading ? (
          <p className="text-neutral-500 text-sm">Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className="text-neutral-500 text-sm">No projects yet — create your first one above.</p>
        ) : (
          <ul className="divide-y divide-neutral-900 border border-neutral-900 rounded-md">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link to={`/editor/${p.id}`} className="font-medium hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    {p.is_public ? 'Public' : 'Private'} · updated{' '}
                    {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  <Link to={`/editor/${p.id}`} className="text-neutral-400 hover:text-neutral-200">
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-400/80 hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
