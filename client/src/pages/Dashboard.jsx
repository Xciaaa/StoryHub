import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

function getNodeCount(canvasData) {
  if (!canvasData) return 0;
  return (canvasData.nodes || []).length;
}

function getThumbnailStyle(index) {
  const thumbnails = [
    'linear-gradient(135deg, rgba(79, 70, 229, 0.3), rgba(124, 58, 237, 0.3))',
    'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3))',
    'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 182, 212, 0.3))',
  ];
  return thumbnails[index % thumbnails.length];
}

const GENRES = ['Epic Fantasy', 'Cyberpunk', 'Sci-Fi', 'Grimdark'];
const VISIBLE_CARDS = 6;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [coverImage, setCoverImage] = useState('');
  const [stats, setStats] = useState({ totalNodes: 0, connections: 0, wordsMapped: 0, editsThisWeek: 0 });
  const [activity, setActivity] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const [projectsData, statsData, activityData] = await Promise.all([
        api.listProjects(),
        api.getDashboardStats().catch(() => null),
        api.getActivityHeatmap().catch(() => []),
      ]);
      setProjects(projectsData);
      if (statsData) setStats(statsData);
      setActivity(activityData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openModal = () => {
    setTitle('');
    setDescription('');
    setGenre(GENRES[0]);
    setCoverImage('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const project = await api.createProject({
        title: title.trim(),
        description: description.trim() || null,
        canvasData: { nodes: [], edges: [] },
        coverImage: coverImage || null,
        genre: genre.trim() || null,
      });
      closeModal();
      navigate(`/editor/${project.id}`);
      api.completeGoal('create_first_project').catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.deleteProject(deleteConfirmId);
      setProjects((prev) => prev.filter((p) => p.id !== deleteConfirmId));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const totalNodes = projects.reduce((sum, p) => sum + (p.node_count ?? getNodeCount(p.canvas_data)), 0);
  const totalEdges = projects.reduce((sum, p) => sum + ((p.canvas_data?.edges || []).length), 0);
  const visibleProjects = projects.slice(0, VISIBLE_CARDS);
  const hasMore = projects.length > VISIBLE_CARDS;

  const heatmapData = activity.length > 0 ? activity : Array.from({ length: 28 }).map((_, i) => ({ date: new Date(Date.now() - i * 86400000).toISOString(), count: 0 }));

  const maxCount = Math.max(1, ...heatmapData.map((d) => d.count));

  return (
    <div className="min-h-screen bg-background text-on-background overflow-x-hidden">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-desktop h-16 glass-strong border-b border-outline-variant/30 transition-all duration-300">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight" style={{ fontSize: '28px' }}>
            LoreCanvas
          </Link>
          <div className="hidden md:flex gap-6">
            <span className="text-indigo-electric font-bold border-b-2 border-indigo-electric pb-1 font-label-md text-label-md">
              Dashboard
            </span>
            {projects.length > 0 ? (
              <Link to={`/editor/${projects[0].id}`} className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md">
                Canvas
              </Link>
            ) : (
              <span className="text-on-surface-variant/50 font-label-md text-label-md cursor-not-allowed">Canvas</span>
            )}
            <Link to="/community" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md">
              Community
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {searchOpen && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search universes..."
              className="w-48 md:w-64 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
            />
          )}
          <button 
            onClick={() => setSearchOpen(!searchOpen)} 
            className="text-on-surface-variant hover:text-primary transition-colors duration-200"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
          <Link to="/notifications" className="text-on-surface-variant hover:text-primary transition-colors duration-200">
            <span className="material-symbols-outlined">notifications</span>
          </Link>
          <Link to="/settings" className="text-on-surface-variant hover:text-primary transition-colors duration-200">
            <span className="material-symbols-outlined">settings</span>
          </Link>
          <Link to={`/profile/${user?.username}`} className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline/30 ml-2">
            <Avatar src={user?.avatar} alt="User profile" className="w-full h-full object-cover" />
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:ml-24 pt-24 pb-12 px-margin-mobile md:px-margin-desktop min-h-screen">
        {/* Hero Section */}
        <section className="mb-12">
          <Link to={`/profile/${user?.username}`} className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-on-surface mb-6 hover:text-primary transition-colors">
            Welcome back, {user?.username || 'Architect'}
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-electric/5 to-transparent pointer-events-none" />
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Nodes Created</span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg text-primary">{stats.totalNodes.toLocaleString()}</span>
                <span className="font-label-sm text-label-sm text-indigo-electric">+{stats.editsThisWeek} this week</span>
              </div>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-glow/5 to-transparent pointer-events-none" />
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Active Connections</span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg text-secondary">{stats.connections.toLocaleString()}</span>
                <span className="font-label-sm text-label-sm text-indigo-electric">+{stats.editsThisWeek} this week</span>
              </div>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-electric/5 to-transparent pointer-events-none" />
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Words Mapped</span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg text-primary">{stats.wordsMapped.toLocaleString()}</span>
                <span className="font-label-sm text-label-sm text-indigo-electric">+{Math.round(stats.wordsMapped * 0.02).toLocaleString()} this week</span>
              </div>
            </div>
          </div>
        </section>

        {/* Immersive Story Cards */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-headline-md text-headline-md text-on-surface">Active Universes</h2>
            <div className="flex items-center gap-4">
              {hasMore && (
                <button className="font-label-md text-label-md text-indigo-electric hover:text-primary transition-colors">
                  View All
                </button>
              )}
              <button onClick={openModal} className="font-label-md text-label-md text-indigo-electric hover:text-primary transition-colors flex items-center gap-1">
                New Story <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-error mb-4">{error}</p>}
          {loading ? (
            <p className="text-on-surface-variant text-sm">Loading projects…</p>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-on-surface-variant text-sm mb-4">No projects yet — create your first story above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleProjects.map((p, index) => {
                const nodeCount = p.node_count ?? getNodeCount(p.canvas_data);

                return (
                  <Link
                    key={p.id}
                    to={`/editor/${p.id}`}
                    className="story-card-hover relative h-[380px] rounded-xl overflow-hidden glass-panel cursor-pointer group block"
                  >
                    <div className="absolute inset-0 z-0">
                      {p.cover_image ? (
                        <img src={`${API_BASE}${p.cover_image}`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div
                          className="absolute inset-0 opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"
                          style={{ background: getThumbnailStyle(index) }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-slate-900/60 to-transparent" />
                    </div>
                    <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const next = !p.is_public;
                              try {
                                const updated = await api.updateProject(p.id, {
                                  isPublic: next,
                                });
                                setProjects((prev) => prev.map((project) => project.id === p.id ? { ...project, is_public: updated.is_public } : project));
                              } catch (err) {
                                console.error('Failed to update visibility', err);
                                setError(err.message || 'Failed to update project visibility');
                              }
                            }}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.is_public ? 'bg-indigo-electric' : 'bg-surface-variant'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${p.is_public ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </button>
                          <span className="px-3 py-1 bg-surface-container/80 backdrop-blur-md rounded-full font-label-sm text-label-sm text-on-surface-variant border border-outline-variant/30">
                            {p.is_public ? 'Public' : 'Private'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-surface-container/80 backdrop-blur-md rounded-full font-label-sm text-label-sm text-on-surface border border-outline-variant/30">
                            {nodeCount} nodes
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelete(p.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-surface-container/80 backdrop-blur-md text-on-surface-variant hover:text-red-400 border border-outline-variant/30 transition-all"
                            title="Delete project"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2 group-hover:text-primary transition-colors truncate">
                          {p.title}
                        </h3>
                        {p.description && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-2">{p.description}</p>
                        )}
                        <div className="hover-content opacity-0 transform translate-y-4 transition-all duration-300">
                           <span className="w-full py-2 bg-indigo-electric/90 backdrop-blur-sm text-on-primary rounded-lg font-label-md text-label-md hover:bg-indigo-electric transition-colors border border-indigo-electric/50 text-center block">
                            Open Canvas
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Activity Heatmap */}
        <section>
          <div className="glass-panel rounded-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Lore Activity</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Your creative consistency over the last 30 days.</p>
              </div>
              <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-surface-container-high" />
                <div className="w-3 h-3 rounded-sm bg-indigo-electric/30" />
                <div className="w-3 h-3 rounded-sm bg-indigo-electric/60" />
                <div className="w-3 h-3 rounded-sm bg-indigo-electric" />
                <div className="w-3 h-3 rounded-sm bg-violet-glow" />
                <span>More</span>
              </div>
            </div>
            <div className="overflow-x-auto pb-4">
              <div className="grid grid-rows-4 grid-flow-col gap-1 min-w-max">
                {heatmapData.map((day, i) => {
                  let intensity = 'bg-surface-container-high';
                  const ratio = day.count / maxCount;
                  if (ratio > 0.75) intensity = 'bg-violet-glow';
                  else if (ratio > 0.5) intensity = 'bg-indigo-electric';
                  else if (ratio > 0.25) intensity = 'bg-indigo-electric/60';
                  else if (ratio > 0) intensity = 'bg-indigo-electric/30';

                  return (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-md ${intensity} heatmap-cell cursor-crosshair`}
                      title={`${day.count} edits on ${new Date(day.date).toLocaleDateString()}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* New Story Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={closeModal} />
          <div className="relative w-full max-w-lg glass-panel rounded-xl border border-outline/30 shadow-2xl overflow-hidden transition-all duration-300">
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Create New Story</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">Define the foundation of your next epic journey.</p>
                </div>
                <button onClick={closeModal} className="text-on-surface-variant hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-6">
                {/* Story Title */}
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface block">Story Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-surface-container-highest border border-outline/20 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-indigo-electric transition-colors"
                    placeholder="e.g. The Chronicles of Aetheria"
                    required
                  />
                </div>
                {/* Genre Selection */}
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface block">Genre</label>
                  <input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-surface-container-highest border border-outline/20 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-indigo-electric transition-colors"
                    placeholder="Select or type a genre..."
                  />
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGenre(g)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-label-sm border transition-colors ${
                          genre === g
                             ? 'bg-indigo-electric text-on-primary border-indigo-electric'
                            : 'bg-surface-variant text-on-surface-variant border-outline/10 hover:border-primary/30'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Description */}
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-surface-container-highest border border-outline/20 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-indigo-electric transition-colors resize-none"
                    placeholder="Briefly describe the core conflict or setting..."
                    rows={4}
                  />
                </div>
                {/* Cover Image */}
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface block">Cover Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('image', file);
                      try {
                        const result = await api.uploadImage(formData);
                        if (result?.url) setCoverImage(result.url);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="block text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-electric/20 file:text-indigo-electric hover:file:bg-indigo-electric/30"
                  />
                  {coverImage && (
                    <img src={`${API_BASE}${coverImage}`} alt="Cover preview" className="mt-2 h-32 w-full object-cover rounded-lg border border-outline-variant/30" />
                  )}
                </div>
                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-variant transition-colors border border-outline/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !title.trim()}
                     className="flex-1 px-6 py-3 rounded-lg font-label-md text-label-md bg-indigo-electric text-on-primary hover:bg-indigo-electric/90 transition-colors shadow-lg shadow-indigo-electric/20 disabled:opacity-50"
                  >
                    {creating ? 'Creating…' : 'Create Story'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-container/70 backdrop-blur-md" onClick={cancelDelete} />
          <div className="relative w-full max-w-md glass-panel rounded-xl border border-outline/30 shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Delete Project</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Are you sure you want to delete this project? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-surface-container/20 flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-lg border border-outline/10 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-error text-on-error hover:bg-error/90 font-label-md text-label-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
