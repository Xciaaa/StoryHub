import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Extracts a project id whether the user pastes a raw UUID or a full
// share link like https://yourapp.com/project/<id>.
function extractId(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/([0-9a-fA-F-]{36})/);
  return match ? match[1] : trimmed;
}

export default function Community() {
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const id = extractId(input);
    if (!id) return;
    navigate(`/project/${id}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Community</h1>
        <Link to="/dashboard" className="text-sm text-neutral-400 hover:text-neutral-200">
          Dashboard
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-6 py-16 text-center">
        <p className="text-neutral-400 text-sm mb-6">
          Paste a shared Lore Canvas link or project ID to open a public canvas.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Paste link or project ID…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-100 text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-white"
          >
            Open
          </button>
        </form>
      </main>
    </div>
  );
}
