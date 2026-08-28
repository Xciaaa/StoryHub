import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactFlow, {
  Background,
  MiniMap,
  Controls,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { api, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
import { useToast } from '../context/ToastContext';

export default function PublicProject() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forking, setForking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('canvas');

  const handleSave = async () => {
    if (!user) return;
    setSaveLoading(true);
    try {
      if (saved) {
        await api.unsaveProject(id);
        setSaved(false);
      } else {
        await api.saveProject(id);
        setSaved(true);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getPublicProject(id);
        if (!cancelled) setProject(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleFork = async () => {
    if (!user) return;
    setForking(true);
    try {
      const forked = await api.forkProject(id);
      toast.addToast('Project forked to your account!', 'success');
    } catch (err) {
      toast.addToast(err.message, 'error');
    } finally {
      setForking(false);
    }
  };

  const handleLike = async () => {
    if (!user) return;
    try {
      const result = await api.toggleLike(id);
      setLiked(result.liked);
      setLikeCount(result.count);
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  useEffect(() => {
    if (project && user) {
      api.getLikeStatus(id).then((status) => setLiked(status.liked));
      api.getLikeCount(id).then((data) => setLikeCount(data.count));
      api.getSaveStatus(id).then((status) => setSaved(status.saved));
    }
  }, [project, id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-surface-variant flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="logo-continuous-loop">
            <Logo className="w-12 h-12" />
          </div>
          <p className="font-body-md text-body-md">Loading universe...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center gap-4">
        <div className="glass-panel p-8 rounded-2xl text-center max-w-md">
          <span className="material-symbols-outlined text-5xl text-error mb-4 block">error</span>
          <p className="text-error font-body-md mb-4">{error || 'This project is private or does not exist.'}</p>
          <Link to="/community" className="text-indigo-electric hover:text-primary transition-colors font-label-md">
            ← Back to Community
          </Link>
        </div>
      </div>
    );
  }

  const canvas = project.canvas_data || { nodes: [], edges: [] };
  const nodeCount = (canvas.nodes || []).length;
  const edgeCount = (canvas.edges || []).length;
  const authorName = project.username || 'Unknown Architect';

  const thumbnailStyle = GENRES.includes(project.genre)
    ? `linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(124, 58, 237, 0.2))`
    : 'linear-gradient(135deg, rgba(79, 70, 229, 0.3), rgba(124, 58, 237, 0.3))';

  return (
    <div className="h-screen w-screen bg-background text-on-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass-strong px-6 py-3 flex items-center justify-between shrink-0 z-20 border-b border-outline-variant/20">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/community" className="shrink-0 p-2 rounded-lg hover:bg-surface-variant/30 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-headline-md text-headline-md text-on-surface truncate">{project.title}</h1>
              {project.genre && (
                <span className="px-2.5 py-0.5 bg-primary-container/10 text-primary-container border border-primary-container/20 rounded-full font-label-xs text-label-xs">
                  {project.genre}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <Link to={`/profile/${authorName}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <Avatar src={project.avatar} alt={authorName} className="w-5 h-5 rounded-full object-cover" />
                <span className="font-label-sm text-label-sm text-on-surface-variant">@{authorName}</span>
              </Link>
              <span className="text-on-surface-variant/40">•</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {nodeCount} nodes
              </span>
              <span className="text-on-surface-variant/40">•</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {edgeCount} edges
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <>
              <NotificationBell />
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
                  liked
                    ? 'border-red-400/30 text-red-400 bg-red-400/10'
                    : 'border-outline-variant/30 text-on-surface-variant hover:text-red-400 hover:border-red-400/30'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}>
                  favorite
                </span>
                <span className="font-label-sm text-label-sm">{likeCount}</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saveLoading}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all disabled:opacity-50 ${
                  saved
                    ? 'border-primary-container/30 text-primary-container bg-primary-container/10'
                    : 'border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary-container/50'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}>
                  bookmark
                </span>
                <span className="font-label-sm text-label-sm">{saved ? 'Saved' : 'Save'}</span>
              </button>
              <button
                onClick={handleFork}
                disabled={forking}
                className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary-container/90 transition-all disabled:opacity-50 border border-primary-container/30"
              >
                {forking ? 'Forking…' : 'Fork Project'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <main className="flex-1 relative">
          <ReactFlow
            nodes={canvas.nodes.map((n) => ({
              ...n,
              style: {
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                fontFamily: 'var(--font-family-body)',
                color: 'var(--color-on-background)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              },
            }))}
            edges={canvas.edges.map((e) => ({
              ...e,
              style: { stroke: '#6366f1', strokeWidth: 2 },
              type: 'smoothstep',
            }))}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            defaultEdgeOptions={{
              style: { stroke: '#6366f1', strokeWidth: 2 },
              type: 'smoothstep',
            }}
          >
            <Background variant="dots" gap={32} size={1} color="rgba(144, 143, 160, 0.2)" />
            <Controls className="glass-panel !bg-surface-container/80 !border !border-outline-variant/30 !rounded-xl !shadow-lg" />
            <MiniMap
              pannable={false}
              zoomable={false}
              className="glass-strong rounded-xl border border-outline-variant/30"
              nodeColor={() => 'rgba(99, 102, 241, 0.6)'}
              maskColor="rgba(12, 19, 36, 0.85)"
            />
          </ReactFlow>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 glass-panel border-l border-outline-variant/20 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Project Info */}
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-1">{project.title}</h2>
              {project.description && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">{project.description}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container/50 rounded-xl p-3 border border-outline-variant/20">
                <div className="font-headline-lg text-headline-lg text-primary">{nodeCount}</div>
                <div className="font-label-sm text-label-sm text-on-surface-variant">Nodes</div>
              </div>
              <div className="bg-surface-container/50 rounded-xl p-3 border border-outline-variant/20">
                <div className="font-headline-lg text-headline-lg text-secondary">{edgeCount}</div>
                <div className="font-label-sm text-label-sm text-on-surface-variant">Edges</div>
              </div>
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 p-3 bg-surface-container/30 rounded-xl border border-outline-variant/20">
              <Avatar src={project.avatar} alt={authorName} className="w-10 h-10 rounded-full object-cover" />
              <div className="min-w-0">
                <div className="font-label-md text-label-md text-on-surface truncate">{authorName}</div>
                <div className="font-label-sm text-label-sm text-on-surface-variant">Creator</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleFork}
                disabled={forking}
                className="w-full px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary-container/90 transition-all disabled:opacity-50 border border-primary-container/30"
              >
                {forking ? 'Forking…' : 'Fork to My Projects'}
              </button>
              <Link
                to="/community"
                className="block text-center px-4 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50 transition-all font-label-md text-label-md"
              >
                Browse More
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
