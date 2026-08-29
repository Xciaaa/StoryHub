import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
import { useToast } from '../context/ToastContext';
import SearchInput from '../components/SearchInput';

const GENRES = ['All', 'Epic Fantasy', 'Cyberpunk', 'Sci-Fi', 'Grimdark'];

const PROMPTS = [
  {
    id: 1,
    title: 'The Silent Heist',
    description: 'Design a magic system where spells are cast by absolute silence rather than spoken words.',
    difficulty: 'Hard',
    icon: 'edit_note',
  },
  {
    id: 2,
    title: 'Dyson Dilemma',
    description: 'A civilization must decide whether to dismantle their home star to build a ringworld.',
    difficulty: 'Epic',
    icon: 'public',
  },
  {
    id: 3,
    title: 'Memory Market',
    description: 'Create a black-market economy where memories are traded as currency.',
    difficulty: 'Medium',
    icon: 'account_balance',
  },
  {
    id: 4,
    title: 'The Last Cartographer',
    description: 'Map a world where geography changes overnight and only one person remembers the old layout.',
    difficulty: 'Medium',
    icon: 'map',
  },
  {
    id: 5,
    title: 'Verdict of the Sea',
    description: 'Write a trial where the defendant is an ocean and the jury is made of shells.',
    difficulty: 'Experimental',
    icon: 'gavel',
  },
  {
    id: 6,
    title: 'Echoes of Empire',
    description: 'Build a fallen empire whose ruins still broadcast propaganda from a thousand years ago.',
    difficulty: 'Hard',
    icon: 'castle',
  },
];

export default function Community() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
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
  const [savedProjects, setSavedProjects] = useState({});
  const [saveLoadingIds, setSaveLoadingIds] = useState({});
  const [savedLibrary, setSavedLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryGenre, setLibraryGenre] = useState('All');
  const [librarySort, setLibrarySort] = useState('recent');
  const [libraryViewMode, setLibraryViewMode] = useState('grid');
  const [helpOpen, setHelpOpen] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(loadAll = false) {
    setLoading(true);
    setError('');
    try {
      const limit = loadAll ? 100 : 20;
      const [projectsData, architectsData] = await Promise.all([
        api.listPublicProjects(1, limit).catch(() => []),
        api.searchUsers('a').catch(() => []),
      ]);
      setProjects(projectsData);
      setArchitects(architectsData);

      const likes = {};
      const counts = {};
      const saves = {};
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
          try {
            const saveStatus = await api.getSaveStatus(p.id);
            saves[p.id] = saveStatus.saved;
          } catch {
            saves[p.id] = false;
          }
        })
      );
      setLikedProjects(likes);
      setLikeCounts(counts);
      setSavedProjects(saves);

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

  const loadLibrary = async () => {
    console.log('[Community] loadLibrary start');
    setLibraryLoading(true);
    setLibraryError('');
    try {
      const data = await api.listSavedProjects();
      console.log('[Community] loadLibrary result', data);
      setSavedLibrary(data);
    } catch (err) {
      console.error('[Community] loadLibrary failed', err);
      setLibraryError(err.message || 'Failed to load saved projects');
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'library') {
      loadLibrary();
    }
  }, [activeTab]);

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
        api.completeGoal('follow_architect').catch(() => {});
      }
    } catch (err) {
      console.error('Follow failed:', err);
    } finally {
      setFollowLoadingIds((prev) => ({ ...prev, [architectId]: false }));
    }
  };

  const handleExploreAll = async () => {
    setShowAllProjects(true);
    await loadData(true);
  };

  const filteredProjects = projects.filter((p) => {
    if (activeGenre !== 'All' && p.genre !== activeGenre) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.genre || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleFork = async (projectId) => {
    if (!user) return;
    setForkingId(projectId);
    try {
      await api.forkProject(projectId);
      toast.addToast('Project forked to your account!', 'success');
    } catch (err) {
      toast.addToast(err.message, 'error');
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

  const handleSave = async (projectId) => {
    if (!user) return;
    setSaveLoadingIds((prev) => ({ ...prev, [projectId]: true }));
    try {
      if (savedProjects[projectId]) {
        console.log('[Community] unsave', projectId);
        await api.unsaveProject(projectId);
        setSavedProjects((prev) => ({ ...prev, [projectId]: false }));
      } else {
        console.log('[Community] save', projectId);
        await api.saveProject(projectId);
        setSavedProjects((prev) => ({ ...prev, [projectId]: true }));
      }
    } catch (err) {
      console.error('[Community] save failed', err);
    } finally {
      setSaveLoadingIds((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const handleAcceptChallenge = async (prompt) => {
    if (!user) return;
    try {
      const project = await api.createProject({
        title: prompt.title,
        description: prompt.description,
        canvasData: { nodes: [], edges: [] },
        genre: 'Challenge',
      });
      navigate(`/editor/${project.id}`);
      api.completeGoal('complete_challenge').catch(() => {});
    } catch (err) {
      toast.addToast(err.message, 'error');
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
        <div className="hidden md:flex items-center justify-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search universes..."
            type="universes"
            className="w-full max-w-md"
          />
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <Link to="/settings" className="text-on-surface-variant hover:text-primary-container transition-colors p-2 rounded-full hover:bg-surface-variant/20">
            <span className="material-symbols-outlined">settings</span>
          </Link>
          <Link to={`/profile/${user?.username}`} className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant/30">
            <Avatar src={user?.avatar} alt="User" className="w-full h-full object-cover" />
          </Link>
        </div>
      </nav>

      {/* Side Navigation */}
      <aside className="hidden md:flex flex-col p-gutter gap-4 bg-surface-container-lowest/80 backdrop-blur-2xl border-r border-outline-variant/10 shadow-xl fixed left-0 top-16 h-[calc(100vh-64px)] w-panel-width z-40">
        <div className="flex items-center gap-3 p-2 mb-4 border-b border-outline-variant/20 pb-4">
          <div className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden">
            <Avatar src={user?.avatar} alt="Architect" className="w-full h-full object-cover" />
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
          <button type="button" onClick={() => setHelpOpen(!helpOpen)} className={`flex items-center gap-3 px-4 py-2 rounded-xl font-label-sm transition-all ${helpOpen ? 'bg-surface-variant/30 text-on-surface' : 'text-on-surface-variant hover:bg-surface-variant/20'}`}>
            <span className="material-symbols-outlined text-sm">help</span>
            Help
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
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {activeTab === 'world-feed' && (
                <>
                  <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2">
                    <h2 className="font-headline-md text-on-surface">Featured Universes</h2>
                    <button onClick={handleExploreAll} className="font-label-sm text-primary hover:text-primary-container transition-colors flex items-center gap-1">
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
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="logo-continuous-loop">
                        <Logo className="w-12 h-12" />
                      </div>
                      <p className="text-on-surface-variant text-sm">Loading universes…</p>
                    </div>
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
                                {p.username === 'LoreArchitect' && p.title === 'The Shattered Crown' && (
                                  <>
                                    <span className="material-symbols-outlined text-xs text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                                    <span className="font-label-sm text-on-surface">Reference</span>
                                  </>
                                )}
                                {(p.trending_score > 10 || (p.like_count > 5 || p.fork_count > 3)) && (
                                  <>
                                    <span className="material-symbols-outlined text-xs text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    <span className="font-label-sm text-on-surface">Trending</span>
                                  </>
                                )}
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
                                      <Avatar src={p.avatar} alt={p.username || 'Architect'} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-label-sm text-on-surface-variant">@{p.username || 'Architect'}</span>
                                  </Link>
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSave(p.id);
                                    }}
                                    disabled={saveLoadingIds[p.id]}
                                    className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
                                  >
                                    <span
                                      className="material-symbols-outlined text-sm"
                                      style={{ fontVariationSettings: savedProjects[p.id] ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                      bookmark
                                    </span>
                                    <span className="font-label-sm">{savedProjects[p.id] ? 'Saved' : 'Save'}</span>
                                  </button>
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
                                    <span className="font-label-sm">{p.fork_count || 0}</span>
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
                                    <span className="font-label-sm">{likeCounts[p.id] ?? p.like_count ?? 0}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {activeTab === 'prompts' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2">
                    <h2 className="font-headline-md text-on-surface">Writing Prompts</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PROMPTS.map((prompt) => (
                      <div key={prompt.id} className="glass-card rounded-xl p-5 flex flex-col gap-3 hover:border-primary-container/40 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary">{prompt.icon}</span>
                          <h3 className="font-headline-md text-[20px] text-on-surface">{prompt.title}</h3>
                        </div>
                        <p className="font-body-md text-on-surface-variant flex-1">{prompt.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">{prompt.difficulty}</span>
                          <button onClick={() => handleAcceptChallenge(prompt)} className="font-label-sm text-primary hover:text-primary-container transition-colors border border-outline-variant/30 rounded-lg px-3 py-1.5 hover:border-primary-container/50">
                            Accept Challenge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'architects' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2">
                    <h2 className="font-headline-md text-on-surface">All Architects</h2>
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
                                <Avatar src={architect.avatar} alt={architect.username} className="w-full h-full object-cover" />
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
              )}
              {activeTab === 'library' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <h2 className="font-headline-md text-on-surface">Saved Projects</h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Community projects you've bookmarked.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <SearchInput
                        value={librarySearch}
                        onChange={setLibrarySearch}
                        placeholder="Search saved projects..."
                        type="universes"
                        className="w-full md:w-64"
                      />
                      <select
                        value={libraryGenre}
                        onChange={(e) => setLibraryGenre(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all cursor-pointer"
                      >
                        {['All', 'Epic Fantasy', 'Cyberpunk', 'Sci-Fi', 'Grimdark'].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <select
                        value={librarySort}
                        onChange={(e) => setLibrarySort(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all cursor-pointer"
                      >
                        <option value="recent">Recently Saved</option>
                        <option value="title">Title</option>
                        <option value="nodes">Most Nodes</option>
                      </select>
                      <div className="flex items-center gap-1 bg-surface-container border border-outline-variant/30 rounded-lg p-1">
                        <button
                          onClick={() => setLibraryViewMode('grid')}
                          className={`p-1.5 rounded-md transition-colors ${libraryViewMode === 'grid' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">grid_view</span>
                        </button>
                        <button
                          onClick={() => setLibraryViewMode('list')}
                          className={`p-1.5 rounded-md transition-colors ${libraryViewMode === 'list' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">view_list</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {libraryError && <p className="text-sm text-error mb-4">{libraryError}</p>}

                  {libraryLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="logo-continuous-loop">
                        <Logo className="w-12 h-12" />
                      </div>
                      <p className="text-on-surface-variant text-sm">Loading saved projects…</p>
                    </div>
                  ) : (() => {
                    const filtered = savedLibrary
                      .filter((p) => {
                        const matchesSearch = (p.title || '').toLowerCase().includes(librarySearch.toLowerCase()) || (p.description || '').toLowerCase().includes(librarySearch.toLowerCase());
                        const matchesGenre = libraryGenre === 'All' || p.genre === libraryGenre;
                        return matchesSearch && matchesGenre;
                      })
                      .sort((a, b) => {
                        if (librarySort === 'recent') return new Date(b.saved_at || b.updated_at) - new Date(a.saved_at || a.updated_at);
                        if (librarySort === 'title') return (a.title || '').localeCompare(b.title || '');
                        if (librarySort === 'nodes') return (b.node_count ?? (b.canvas_data?.nodes || []).length) - (a.node_count ?? (a.canvas_data?.nodes || []).length);
                        return 0;
                      });
                    const visible = filtered.slice(0, 12);
                    const hasMore = filtered.length > 12;

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-20">
                          <p className="text-on-surface-variant text-sm mb-4">No saved projects yet. Browse the Community and save projects you want to revisit.</p>
                        </div>
                      );
                    }

                    if (libraryViewMode === 'grid') {
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {visible.map((p, index) => {
                            const nodeCount = p.node_count ?? (p.canvas_data?.nodes || []).length;
                            return (
                              <Link
                                key={p.id}
                                to={`/project/${p.id}`}
                                className="story-card-hover relative h-[380px] rounded-xl overflow-hidden glass-panel cursor-pointer group block"
                              >
                                <div className="absolute inset-0 z-0">
                                  {p.cover_image ? (
                                    <img src={`${API_BASE}${p.cover_image}`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
                                  ) : (
                                    <div
                                      className="absolute inset-0 opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"
                                      style={{ background: ['linear-gradient(135deg, rgba(79, 70, 229, 0.3), rgba(124, 58, 237, 0.3))', 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3))', 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 182, 212, 0.3))'][index % 3] }}
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-slate-900/60 to-transparent" />
                                </div>
                                <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                      <span className="px-3 py-1 bg-surface-container/80 backdrop-blur-md rounded-full font-label-sm text-label-sm text-on-surface-variant border border-outline-variant/30">
                                        {p.is_public ? 'Public' : 'Private'}
                                      </span>
                                      {p.genre && (
                                        <span className="px-3 py-1 bg-surface-container/80 backdrop-blur-md rounded-full font-label-sm text-label-sm text-on-surface-variant border border-outline-variant/30">
                                          {p.genre}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-3 py-1 bg-surface-container/80 backdrop-blur-md rounded-full font-label-sm text-label-sm text-on-surface border border-outline-variant/30">
                                        {nodeCount} nodes
                                      </span>
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
                                        View Project
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-3">
                        {visible.map((p) => {
                          const nodeCount = p.node_count ?? (p.canvas_data?.nodes || []).length;
                          const edgeCount = (p.canvas_data?.edges || []).length;
                          return (
                            <Link
                              key={p.id}
                              to={`/project/${p.id}`}
                              className="glass-panel rounded-xl p-4 flex items-center gap-4 hover:border-primary-container/40 transition-colors group block"
                            >
                              <div className="w-12 h-12 rounded-lg bg-surface-variant border border-outline-variant/30 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-on-surface-variant">auto_stories</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-headline-md text-headline-md text-on-surface truncate group-hover:text-primary transition-colors">{p.title}</h3>
                                  <span className={`px-2 py-0.5 rounded-full font-label-xs text-label-xs border border-outline-variant/30 ${p.is_public ? 'bg-primary-container/10 text-primary-container' : 'bg-surface-variant text-on-surface-variant'}`}>
                                    {p.is_public ? 'Public' : 'Private'}
                                  </span>
                                  {p.genre && (
                                    <span className="px-2 py-0.5 rounded-full font-label-xs text-label-xs text-on-surface-variant border border-outline-variant/30">
                                      {p.genre}
                                    </span>
                                  )}
                                </div>
                                {p.description && (
                                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mb-1">{p.description}</p>
                                )}
                                <div className="flex items-center gap-4 font-label-xs text-label-xs text-on-surface-variant">
                                  <span>{nodeCount} nodes</span>
                                  <span>{edgeCount} edges</span>
                                  <span>Saved {new Date(p.saved_at || p.updated_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {(() => {
                    const filtered = savedLibrary
                      .filter((p) => {
                        const matchesSearch = (p.title || '').toLowerCase().includes(librarySearch.toLowerCase()) || (p.description || '').toLowerCase().includes(librarySearch.toLowerCase()) || (p.genre || '').toLowerCase().includes(librarySearch.toLowerCase());
                        const matchesGenre = libraryGenre === 'All' || p.genre === libraryGenre;
                        return matchesSearch && matchesGenre;
                      })
                      .sort((a, b) => {
                        if (librarySort === 'recent') return new Date(b.saved_at || b.updated_at) - new Date(a.saved_at || a.updated_at);
                        if (librarySort === 'title') return (a.title || '').localeCompare(b.title || '');
                        if (librarySort === 'nodes') return (b.node_count ?? (b.canvas_data?.nodes || []).length) - (a.node_count ?? (a.canvas_data?.nodes || []).length);
                        return 0;
                      });
                    return filtered.length > 12 ? (
                      <div className="mt-8 text-center">
                        <button className="px-6 py-2.5 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface font-label-md hover:bg-surface-variant transition-colors">
                          Load More
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* Right Column: Sidebar */}
            <div className="space-y-6">
              {/* Daily Prompts */}
              <div className="space-y-4">
                <button onClick={() => setActiveTab('prompts')} className="flex justify-between items-end border-b border-outline-variant/30 pb-2 w-full text-left">
                  <h2 className="font-headline-md text-on-surface">Daily Prompts</h2>
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_forward</span>
                </button>
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
                    <button onClick={() => handleAcceptChallenge(PROMPTS[0])} className="w-full text-center font-label-sm text-primary hover:text-primary-container transition-colors border border-outline-variant/30 rounded-lg py-2 hover:border-primary-container/50">
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
                              <Avatar src={architect.avatar} alt={architect.username} className="w-full h-full object-cover" />
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

              {/* How to Use Community */}
              <div className="space-y-4">
                <button
                  onClick={() => setHelpOpen(!helpOpen)}
                  className="flex justify-between items-end border-b border-outline-variant/30 pb-2 w-full text-left"
                >
                  <h2 className="font-headline-md text-on-surface">How to Use Community</h2>
                  <span className="material-symbols-outlined text-sm text-on-surface-variant transition-transform" style={{ transform: helpOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    expand_more
                  </span>
                </button>
                {helpOpen && (
                  <div className="glass-panel p-5 rounded-xl space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary-container/20 rounded-lg text-primary-container border border-primary-container/30 shrink-0">
                          <span className="material-symbols-outlined text-sm">public</span>
                        </div>
                        <div>
                          <h4 className="font-label-md text-on-surface mb-1">World Feed</h4>
                          <p className="font-body-sm text-on-surface-variant">Browse public universes shared by other architects. Click any card to open the project and explore its canvas.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary-container/20 rounded-lg text-primary-container border border-primary-container/30 shrink-0">
                          <span className="material-symbols-outlined text-sm">auto_stories</span>
                        </div>
                        <div>
                          <h4 className="font-label-md text-on-surface mb-1">Library</h4>
                          <p className="font-body-sm text-on-surface-variant">Save projects you want to revisit. Your saved projects appear in the Library tab for quick access anytime.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary-container/20 rounded-lg text-primary-container border border-primary-container/30 shrink-0">
                          <span className="material-symbols-outlined text-sm">person_add</span>
                        </div>
                        <div>
                          <h4 className="font-label-md text-on-surface mb-1">Follow Architects</h4>
                          <p className="font-body-sm text-on-surface-variant">Follow creators whose worlds inspire you. Their updates and new projects will keep you connected.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary-container/20 rounded-lg text-primary-container border border-primary-container/30 shrink-0">
                          <span className="material-symbols-outlined text-sm">fork_right</span>
                        </div>
                        <div>
                          <h4 className="font-label-md text-on-surface mb-1">Fork Projects</h4>
                          <p className="font-body-sm text-on-surface-variant">Found a universe you want to remix? Fork it into your own projects and start building from there.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary-container/20 rounded-lg text-primary-container border border-primary-container/30 shrink-0">
                          <span className="material-symbols-outlined text-sm">edit_note</span>
                        </div>
                        <div>
                          <h4 className="font-label-md text-on-surface mb-1">Daily Prompts</h4>
                          <p className="font-body-sm text-on-surface-variant">Accept a writing prompt to jumpstart your next project. Each prompt is a creative challenge to expand your world.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>
  );
}


