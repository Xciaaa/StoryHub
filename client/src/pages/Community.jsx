import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const GENRES = ['All', 'Epic Fantasy', 'Cyberpunk', 'Sci-Fi', 'Grimdark'];

export default function Community() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [architects, setArchitects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('world-feed');
  const [activeGenre, setActiveGenre] = useState('All');
  const [forkingId, setForkingId] = useState(null);
  const [likedProjects, setLikedProjects] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [followingIds, setFollowingIds] = useState({});
  const [followLoadingIds, setFollowLoadingIds] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [projectsData, architectsData] = await Promise.all([
        api.listPublicProjects(1, 20).catch(() => []),
        api.searchUsers('a').catch(() => []),
      ]);
      setProjects(projectsData);
      setArchitects(architectsData);

      const likes = {};
      const counts = {};
      await Promise.all(
        projectsData.map(async (p) => {
          try {
            const [status, count] = await Promise.all([
              api.getLikeStatus(p.id),
              api.getLikeCount(p.id),
            ]);
            likes[p.id] = status.liked;
            counts[p.id] = count.count;
          } catch {
            likes[p.id] = false;
            counts[p.id] = 0;
          }
        })
      );
      setLikedProjects(likes);
      setLikeCounts(counts);

      if (user) {
        const followStatuses = {};
        await Promise.all(
          architectsData.map(async (architect) => {
            if (architect.id === user.id) return;
            try {
              const status = await api.getFollowStatus(architect.id);
              followStatuses[architect.id] = status.isFollowing;
            } catch {
              followStatuses[architect.id] = false;
            }
          })
        );
        setFollowingIds(followStatuses);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleArchitectFollow = async (architectId) => {
    if (!user) return;
    setFollowLoadingIds((prev) => ({ ...prev, [architectId]: true }));
    try {
      const status = await api.getFollowStatus(architectId);
      if (status.isFollowing) {
        await api.unfollowUser(architectId);
        setFollowingIds((prev) => ({ ...prev, [architectId]: false }));
      } else {
        await api.followUser(architectId);
        setFollowingIds((prev) => ({ ...prev, [architectId]: true }));
      }
    } catch (err) {
      console.error('Follow failed:', err);
    } finally {
      setFollowLoadingIds((prev) => ({ ...prev, [architectId]: false }));
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (activeGenre !== 'All' && p.genre !== activeGenre) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleFork = async (projectId) => {
    if (!user) return;
    setForkingId(projectId);
    try {
      await api.forkProject(projectId);
      alert('Project forked to your account!');
    } catch (err) {
      alert(err.message);
    } finally {
      setForkingId(null);
    }
  };

  const handleLike = async (projectId) => {
    try {
      const result = await api.toggleLike(projectId);
      setLikedProjects((prev) => ({ ...prev, [projectId]: result.liked }));
      setLikeCounts((prev) => ({ ...prev, [projectId]: result.count }));
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface-container/60 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm flex justify-between items-center px-margin-desktop h-16">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="font-display-lg text-[24px] md:text-[32px] bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
            Lore Canvas
          </Link>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center bg-surface-container-high rounded-full px-4 py-1.5 border border-outline-variant/30 focus-within:border-primary-container focus-within:shadow-[0_0_10px_rgba(79,70,229,0.3)] transition-all">
          <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none text-on-surface focus:ring-0 text-sm w-64 placeholder:text-on-surface-variant/70"
            placeholder="Search universes..."
          />
        </div>

        <div className="flex items-center gap-4">
          <Link to="/notifications" className="text-on-surface-variant hover:text-primary-container transition-colors p-2 rounded-full hover:bg-surface-variant/20">
            <span className="material-symbols-outlined">notifications</span>
          </Link>
          <Link to="/settings" className="text-on-surface-variant hover:text-primary-container transition-colors p-2 rounded-full hover:bg-surface-variant/20">
            <span className="material-symbols-outlined">settings</span>
          </Link>
          <Link to={`/profile/${user?.username}`} className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant/30">
            <img
              alt="User"
              className="w-full h-full object-cover"
              src={user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`) : "https://lh3.googleusercontent.com/aida-public/AB6AXuCCfcNH1fBdde7X9avFk5fvDyXlPe8nPvQPnWSWGd9qmGAcBVvFIWIyDQnEOqrYJS1QZFtXC8WadgprFr0UlLltggH-zkRQLFTkevN6X2e9p9YWg7CbPa2LsCm8qFdVLuEndoBIEX-alklxB6aVvUwjdCL1nfXhL63RubZFnnNlXAoJ93ersdQRiCN3b0-UNoMbzpmxcNqTWRYz1CMJnTAzZk0uiQ-qed306ZmCoLi0Vmno0eNUPN8emA"}
              onError={(e) => {
                e.target.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuCCfcNH1fBdde7X9avFk5fvDyXlPe8nPvQPnWSWGd9qmGAcBVvFIWIyDQnEOqrYJS1QZFtXC8WadgprFr0UlLltggH-zkRQLFTkevN6X2e9p9YWg7CbPa2LsCm8qFdVLuEndoBIEX-alklxB6aVvUwjdCL1nfXhL63RubZFnnNlXAoJ93ersdQRiCN3b0-UNoMbzpmxcNqTWRYz1CMJnTAzZk0uiQ-qed306ZmCoLi0Vmno0eNUPN8emA";
              }}
            />
          </Link>
        </div>
      </nav>

      {/* Side Navigation */}
      <aside className="hidden md:flex flex-col p-gutter gap-4 bg-surface-container-lowest/80 backdrop-blur-2xl border-r border-outline-variant/10 shadow-xl fixed left-0 top-16 h-[calc(100vh-64px)] w-panel-width z-40">
        <div className="flex items-center gap-3 p-2 mb-4 border-b border-outline-variant/20 pb-4">
          <div className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden">
            <img
              alt="Architect"
              className="w-full h-full object-cover"
              src={user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`) : "https://lh3.googleusercontent.com/aida-public/AB6AXuCxE3PcbNA5VAgsefLTrj0tRu8dsav1ydZMojPQvI5J7BzT-900A9fIQPoHRwilIkkqVTiY5jSKErY9VD193GVxSv8lY3gKNIv5AoPAESke21cHPqpYVmnuhanzoh3HP79QUXOXtwTskayQrtjx5m3pLmVZUG0Tm-kXwDB4_18Gwqi6-rHpAZBNi0Jm8hO8jJF11FDdlqR_0RyvqKs4BPZQvCFBaUknPobE0g6SPy1Uz2sUe6zTh8c8nA"}
              onError={(e) => {
                e.target.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuCxE3PcbNA5VAgsefLTrj0tRu8dsav1ydZMojPQvI5J7BzT-900A9fIQPoHRwilIkkqVTiY5jSKErY9VD193GVxSv8lY3gKNIv5AoPAESke21cHPqpYVmnuhanzoh3HP79QUXOXtwTskayQrtjx5m3pLmVZUG0Tm-kXwDB4_18Gwqi6-rHpAZBNi0Jm8hO8jJF11FDdlqR_0RyvqKs4BPZQvCFBaUknPobE0g6SPy1Uz2sUe6zTh8c8nA";
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-[18px] text-primary leading-tight">Chronos Architect</span>
            <span className="font-label-sm text-[12px] text-on-surface-variant">Master World Builder</span>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-grow">
          <button
            onClick={() => setActiveTab('world-feed')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-label-md text-left transition-all ${
              activeTab === 'world-feed'
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                : 'text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
            World Feed
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-label-md text-left transition-all ${
              activeTab === 'prompts'
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                : 'text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            Prompts
          </button>
          <button
            onClick={() => setActiveTab('architects')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-label-md text-left transition-all ${
              activeTab === 'architects'
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                : 'text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined">workspace_premium</span>
            Architects
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-label-md text-left transition-all ${
              activeTab === 'library'
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                : 'text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined">auto_stories</span>
            Library
          </button>
          <button
            onClick={() => setActiveTab('deep-dive')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-label-md text-left transition-all ${
              activeTab === 'deep-dive'
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                : 'text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined">visibility</span>
            Deep Dive
          </button>
        </nav>

        <button className="mt-4 bg-primary-container text-on-primary-container font-label-md py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container/90 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]">
          <span className="material-symbols-outlined">add</span>
          New Universe
        </button>

        <div className="mt-auto border-t border-outline-variant/20 pt-4 flex flex-col gap-2">
          <Link to="/settings" className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-variant/20 rounded-xl font-label-sm transition-all">
            <span className="material-symbols-outlined text-sm">settings</span>
            Settings
          </Link>
          <button className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-variant/20 rounded-xl font-label-sm transition-all">
            <span className="material-symbols-outlined text-sm">help</span>
            Help
          </button>
          <button onClick={logout} className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-variant/20 rounded-xl font-label-sm transition-all">
            <span className="material-symbols-outlined text-sm">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4 md:px-8 md:ml-[320px] min-h-screen">
        <div className="max-w-[1200px] mx-auto space-y-8">
          {/* Hero Section */}
          <section className="text-center md:text-left space-y-3">
            <h1 className="font-display-lg text-primary">The Architect's Commons</h1>
            <p className="font-body-lg text-on-surface-variant max-w-2xl">
              Discover, fork, and collaborate on interconnected story worlds crafted by the leading minds of the Lore Canvas community.
            </p>
          </section>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Featured Universes */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2">
                <h2 className="font-headline-md text-on-surface">Featured Universes</h2>
                <button className="font-label-sm text-primary hover:text-primary-container transition-colors flex items-center gap-1">
                  Explore All <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>

              {/* Genre Filters */}
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setActiveGenre(genre)}
                    className={`px-4 py-1.5 rounded-full border font-label-sm text-label-sm whitespace-nowrap transition-colors ${
                      activeGenre === genre
                        ? 'border-primary-container text-primary-container bg-primary-container/10'
                        : 'border-outline-variant/40 text-on-surface-variant hover:border-primary-container/50 hover:text-on-surface'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>

              {loading ? (
                <p className="text-on-surface-variant text-sm">Loading universes…</p>
              ) : filteredProjects.length === 0 ? (
                <p className="text-on-surface-variant text-sm">No universes found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProjects.map((p) => {
                    const nodeCount = (p.canvas_data?.nodes || []).length;
                    return (
                      <Link
                        key={p.id}
                        to={`/project/${p.id}`}
                        className="glass-card rounded-xl overflow-hidden flex flex-col group cursor-pointer"
                      >
                        <div className="h-40 w-full relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent z-10" />
                          {p.cover_image ? (
                            <img src={`${API_BASE}${p.cover_image}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full bg-surface-container" />
                          )}
                          <div className="absolute top-3 right-3 z-20 bg-surface-container/80 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 border border-outline-variant/50">
                            <span className="material-symbols-outlined text-xs text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <span className="font-label-sm text-on-surface">Trending</span>
                          </div>
                        </div>
                        <div className="p-5 flex flex-col flex-grow relative z-20 -mt-6">
                          <h3 className="font-headline-md text-primary mb-2">{p.title}</h3>
                          {p.description && (
                            <p className="font-body-md text-on-surface-variant mb-4 line-clamp-2">{p.description}</p>
                          )}
                          <div className="mt-auto pt-4 border-t border-outline-variant/20 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Link to={`/profile/${p.username || 'Architect'}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-variant">
                                  <img alt="" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtavyHa8gkS0Jnv1r9NTxqoSpUPAUo45ym88VCLyOmQxfqz0iHbJ-JWJX7Lov7Xn3aq2RKO_ulZCwt9rr8sj54It-VbPhtYQeCCHV32NWF9XKjCMNhu37KqSAvl-jzxdeUtXTD4YhswWSDar_VW0N-DVpw-NscxsoFnPa7aqqfG_5dQ5c02oy8MViOU_RgLW2ULajhroiqJfLP9mD__0PyRytETSTuTxamh0fZ2hlPaH-ArAJIZ7e0ew" />
                                </div>
                                <span className="font-label-sm text-on-surface-variant">@{p.username || 'Architect'}</span>
                              </Link>
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleFork(p.id);
                                }}
                                disabled={forkingId === p.id}
                                className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-sm">fork_right</span>
                                <span className="font-label-sm">{forkingId === p.id ? 'Forking…' : 'Fork'}</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleLike(p.id);
                                }}
                                className="flex items-center gap-1 text-on-surface-variant hover:text-red-400 transition-colors"
                              >
                                <span
                                  className="material-symbols-outlined text-sm"
                                  style={{ fontVariationSettings: likedProjects[p.id] ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                  favorite
                                </span>
                                <span className="font-label-sm">{likeCounts[p.id] || 0}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Sidebar */}
            <div className="space-y-6">
              {/* Daily Prompts */}
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2">
                  <h2 className="font-headline-md text-on-surface">Daily Prompts</h2>
                </div>
                <div className="glass-panel p-5 rounded-xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary-container/20 rounded-lg text-primary-container border border-primary-container/30">
                      <span className="material-symbols-outlined">edit_note</span>
                    </div>
                    <div>
                      <h4 className="font-label-md text-primary mb-1">The Silent Heist</h4>
                      <p className="font-body-md text-sm text-on-surface-variant">
                        Design a magic system where spells are cast by absolute silence rather than spoken words.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-outline-variant/20">
                    <button className="w-full text-center font-label-sm text-primary hover:text-primary-container transition-colors border border-outline-variant/30 rounded-lg py-2 hover:border-primary-container/50">
                      Accept Challenge
                    </button>
                  </div>
                </div>
              </div>

              {/* Hall of Architects */}
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2">
                  <h2 className="font-headline-md text-on-surface">Hall of Architects</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {architects.map((architect) => {
                    const isFollowing = followingIds[architect.id] || false;
                    const isLoading = followLoadingIds[architect.id] || false;
                    return (
                      <div key={architect.id} className="flex items-center justify-between p-3 glass-card rounded-xl hover:bg-surface-container-high/50">
                        <Link to={`/profile/${architect.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-outline-variant/50">
                              <img alt={architect.username} className="w-full h-full object-cover" src={architect.avatar ? (architect.avatar.startsWith('http') ? architect.avatar : `${API_BASE}${architect.avatar}`) : "https://lh3.googleusercontent.com/aida-public/AB6AXuBtavyHa8gkS0Jnv1r9NTxqoSpUPAUo45ym88VCLyOmQxfqz0iHbJ-JWJX7Lov7Xn3aq2RKO_ulZCwt9rr8sj54It-VbPhtYQeCCHV32NWF9XKjCMNhu37KqSAvl-jzxdeUtXTD4YhswWSDar_VW0N-DVpw-NscxsoFnPa7aqqfG_5dQ5c02oy8MViOU_RgLW2ULajhroiqJfLP9mD__0PyRytETSTuTxamh0fZ2hlPaH-ArAJIZ7e0ew"} onError={(e) => { e.target.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuBtavyHa8gkS0Jnv1r9NTxqoSpUPAUo45ym88VCLyOmQxfqz0iHbJ-JWJX7Lov7Xn3aq2RKO_ulZCwt9rr8sj54It-VbPhtYQeCCHV32NWF9XKjCMNhu37KqSAvl-jzxdeUtXTD4YhswWSDar_VW0N-DVpw-NscxsoFnPa7aqqfG_5dQ5c02oy8MViOU_RgLW2ULajhroiqJfLP9mD__0PyRytETSTuTxamh0fZ2hlPaH-ArAJIZ7e0ew"; }} />
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-label-md text-on-surface truncate">{architect.username}</span>
                            <span className="font-label-sm text-on-surface-variant">Architect</span>
                          </div>
                        </Link>
                        {user && architect.id !== user.id && (
                          <button
                            onClick={() => handleArchitectFollow(architect.id)}
                            disabled={isLoading}
                            className={`font-label-sm border rounded-full px-3 py-1 transition-colors ${
                              isFollowing
                                ? 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30'
                                : 'border-primary-container/50 text-primary-container hover:bg-primary-container hover:text-on-primary-container'
                            } disabled:opacity-50`}
                          >
                            {isLoading ? 'Loading…' : isFollowing ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
