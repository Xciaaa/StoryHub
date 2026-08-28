import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from '../components/Avatar';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    universesCreated: 0,
    totalNodes: 0,
    communityForks: 0,
    globalInfluence: 'Newcomer',
  });
  const [likedProjects, setLikedProjects] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  async function loadProfile() {
    setLoading(true);
    setError('');
    try {
      const users = await api.searchUsers(username);
      if (!users.length) {
        setError('User not found');
        return;
      }
      const publicUser = users[0];
      
      let profileData = { ...publicUser };
      
      if (currentUser && publicUser.username === currentUser.username) {
        try {
          const fullProfile = await api.getProfile();
          profileData = { ...profileData, ...fullProfile };
        } catch {
          console.error('Failed to load full profile');
        }
      }
      
      setProfile(profileData);

      const [projectsData, followStatus] = await Promise.all([
        api.listPublicProjects(1, 50).catch(() => []),
        api.getFollowStatus(profileData.id).catch(() => ({ isFollowing: false })),
      ]);
      const userProjects = projectsData.filter((p) => p.user_id === profileData.id || p.username === profileData.username);
      setProjects(userProjects);
      setIsFollowing(followStatus.isFollowing);

      const totalNodes = userProjects.reduce((sum, p) => {
        const count = p.canvasData?.nodes?.length || 0;
        return sum + count;
      }, 0);

      const communityForks = userProjects.reduce((sum, p) => {
        return sum + (p.fork_count || 0);
      }, 0);

      setStats({
        universesCreated: userProjects.length,
        totalNodes,
        communityForks,
        globalInfluence: userProjects.length > 10 ? 'Top 1%' : userProjects.length > 5 ? 'Top 5%' : 'Rising',
      });

      const likes = {};
      const counts = {};
      await Promise.all(
        userProjects.map(async (p) => {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleFollow = async () => {
    if (!profile || !currentUser) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(profile.id);
        setIsFollowing(false);
      } else {
        await api.followUser(profile.id);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Follow action failed', err);
    } finally {
      setFollowLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-surface-variant flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="logo-continuous-loop">
            <Logo className="w-12 h-12" />
          </div>
          <p className="font-body-md text-body-md">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center gap-4 text-sm">
        <p className="text-error">{error || 'User not found'}</p>
        <Link to="/community" className="text-on-surface-variant hover:text-primary transition-colors">
          Back to Community
        </Link>
      </div>
    );
  }

  const coverGradient = theme === 'light'
    ? 'from-white/80 to-background'
    : 'from-surface-container-lowest to-transparent';

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-12 h-16 glass-strong border-b border-outline-variant/30">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="font-display-lg text-display-lg font-bold text-on-surface text-[24px] tracking-tight">
            LoreCanvas
          </Link>
          <div className="hidden md:flex gap-6 items-center">
            <Link to="/dashboard" className="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-colors duration-200">
              Dashboard
            </Link>
            <Link to="/editor/new" className="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-colors duration-200">
              Canvas
            </Link>
            <Link to="/community" className="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-colors duration-200">
              Community
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <Link to="/settings" aria-label="Settings" className="text-on-surface-variant hover:text-primary transition-colors duration-200">
            <span className="material-symbols-outlined">settings</span>
          </Link>
          <Link to={`/profile/${currentUser?.username}`} className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30">
            <Avatar src={currentUser?.avatar} alt="User profile" className="w-full h-full object-cover" />
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pt-24 pb-20 md:pb-6 px-4 md:px-12 max-w-[1600px] mx-auto min-h-screen">
        {/* Profile Header (Cinematic) */}
        <header className="relative w-full rounded-xl overflow-hidden glass-panel mb-8 border border-outline-variant/30">
          {/* Cover Art */}
          <div className="absolute inset-0 z-0 h-48 md:h-64 opacity-50">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAy9M9lYUnKh8rVrCKMfCJGTlNEclByzRRmRmU8AV5xXmxCVskW_WRYyhRaCPFYkWFFQ4HMWiAxlfS99tq1ImZ9lgxsv9Zgu8JYs0ckKFlZ4BFHvcJJG9yH_vuATspPW8chJxWg8iQYU-H7JH1th4YFZwZvB60SUnk_daFKTt8Z2hkPew4yRK0VSjnpLvikV31zFxGK7uKFOtMDU00PrXNM_79uwmLCdGAGoFvG-iAemGm5ZvwMo8h6IA')`,
              }}
            />
          </div>
          <div className={`absolute inset-0 z-0 bg-gradient-to-t ${coverGradient} h-48 md:h-64`} />
          <div className="relative z-10 pt-32 md:pt-40 px-6 md:px-10 pb-8 flex flex-col md:flex-row gap-6 items-end">
            {/* Avatar */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden border-2 border-primary-container shadow-[0_0_30px_rgba(79,70,229,0.4)] shrink-0">
              <Avatar src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
            </div>
            {/* User Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 w-full">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold bg-primary-container/20 text-primary border border-primary-container/50">
                      Master Rank
                    </span>
                    <span className="font-label-md text-label-md text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      {profile.username}
                    </span>
                  </div>
                  <h1 className="font-display-lg text-display-lg text-on-surface mb-2">
                    {profile.full_name || profile.username}
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                    {profile.bio || 'No bio yet.'}
                  </p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0 shrink-0">
                  <button className="px-4 py-2 rounded-lg font-label-md text-label-md text-on-surface border border-outline-variant/30 hover:bg-surface-variant/30 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    Share
                  </button>
                  {currentUser && currentUser.id !== profile.id && (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`px-6 py-2 rounded-lg font-label-md text-label-md flex items-center gap-2 transition-colors ${
                        isFollowing
                          ? 'border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30'
                          : 'bg-primary-container text-on-primary-container hover:bg-primary-container/90'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isFollowing ? 'person_remove' : 'person_add'}
                      </span>
                      {followLoading ? 'Loading…' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="relative z-10 border-t border-outline-variant/30 bg-surface-container-highest/30 backdrop-blur-md px-6 md:px-10 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Universes Created</div>
              <div className="font-headline-md text-headline-md text-primary">{stats.universesCreated}</div>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Total Nodes</div>
              <div className="font-headline-md text-headline-md text-on-surface">{stats.totalNodes.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Community Forks</div>
              <div className="font-headline-md text-headline-md text-on-surface">{stats.communityForks}</div>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Global Influence</div>
              <div className="font-headline-md text-headline-md text-secondary">{stats.globalInfluence}</div>
            </div>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Portfolio */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <h2 className="font-headline-md text-headline-md text-on-surface border-b border-outline-variant/30 pb-2">
              Public Portfolio
            </h2>
            {projects.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No public projects yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/project/${p.id}`}
                    className="group block rounded-xl border border-outline-variant/40 bg-surface-container/60 overflow-hidden hover:border-primary-container/60 transition-all"
                  >
                    <div className="h-40 w-full relative overflow-hidden">
                      {p.cover_image ? (
                        <img
                          alt={p.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          src={`${API_BASE}${p.cover_image}`}
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                          <span className="material-symbols-outlined text-[48px] text-outline">image</span>
                        </div>
                      )}
                      <div className={`absolute inset-0 bg-gradient-to-t ${coverGradient}`} />
                      <div className="absolute bottom-3 left-3 flex gap-2">
                        <span className="px-2 py-1 rounded bg-surface-container/80 backdrop-blur-md border border-outline-variant/30 font-label-sm text-label-sm text-on-surface">
                          {p.genre || 'Universe'}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-headline-md text-[20px] text-on-surface mb-2 group-hover:text-primary transition-colors">
                        {p.title}
                      </h3>
                      {p.description && (
                        <p className="font-body-sm text-[14px] text-on-surface-variant mb-4 flex-1 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/20">
                        <div className="flex items-center gap-3 text-outline font-label-sm text-label-sm">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">account_tree</span>
                            {p.canvasData?.nodes?.length || 0} Nodes
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLike(p.id);
                          }}
                          className="flex items-center gap-1 text-on-surface-variant hover:text-red-400 transition-colors"
                        >
                          <span
                            className="material-symbols-outlined text-[16px]"
                            style={{ fontVariationSettings: likedProjects[p.id] ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            favorite
                          </span>
                          <span className="font-label-sm">{likeCounts[p.id] || 0}</span>
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Bio & Info */}
          <div className="flex flex-col gap-6">
            <section className="glass-panel p-6 rounded-xl">
              <h3 className="font-headline-md text-[20px] text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">fingerprint</span>
                Architect Bio
              </h3>
              <div className="font-body-md text-[14px] text-on-surface-variant space-y-4">
                <p>{profile.bio || 'No bio yet.'}</p>
              </div>
              <div className="mt-6 pt-6 border-t border-outline-variant/30">
                <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-3">Core Competencies</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-surface-variant border border-outline-variant/30 font-label-sm text-label-sm text-on-surface-variant">
                    World Building
                  </span>
                  <span className="px-3 py-1 rounded-full bg-surface-variant border border-outline-variant/30 font-label-sm text-label-sm text-on-surface-variant">
                    Node Mapping
                  </span>
                  <span className="px-3 py-1 rounded-full bg-surface-variant border border-outline-variant/30 font-label-sm text-label-sm text-on-surface-variant">
                    Narrative Design
                  </span>
                </div>
              </div>
            </section>

            <section className="glass-panel p-6 rounded-xl">
              <h3 className="font-headline-md text-[20px] text-on-surface mb-4">Connect</h3>
              <div className="flex flex-col gap-3">
                <a className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-variant/40 transition-colors border border-transparent hover:border-outline-variant/30 group" href="#">
                  <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center text-on-surface group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[18px]">language</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-label-md text-label-md text-on-surface">Personal Codex</div>
                    <div className="font-label-sm text-label-sm text-outline">{profile.username}.io</div>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary text-[18px] transition-colors">
                    open_in_new
                  </span>
                </a>
                <a className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-variant/40 transition-colors border border-transparent hover:border-outline-variant/30 group" href="#">
                  <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center text-on-surface group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[18px]">forum</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-label-md text-label-md text-on-surface">Community Discord</div>
                    <div className="font-label-sm text-label-sm text-outline">@{profile.username}</div>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary text-[18px] transition-colors">
                    open_in_new
                  </span>
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
