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
import CustomNode from '../components/CustomNode';

const GENRES = ['Epic Fantasy', 'Cyberpunk', 'Sci-Fi', 'Grimdark'];
const nodeTypes = { custom: CustomNode };

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
  const [selectedNode, setSelectedNode] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNodeClick = (_, node) => {
    setSelectedNode(node);
  };

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
      <header className="glass-strong px-4 md:px-8 h-16 flex items-center justify-between shrink-0 z-50 border-b border-outline-variant/30">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/community" className="shrink-0 p-2 rounded-lg hover:bg-surface-variant/30 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-headline-md text-headline-md text-on-surface truncate">{project.title}</h1>
              {project.genre && (
                <span className="hidden sm:inline-block px-2.5 py-0.5 bg-primary-container/10 text-primary-container border border-primary-container/20 rounded-full font-label-xs text-label-xs">
                  {project.genre}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <Link to={`/profile/${authorName}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <Avatar src={project.avatar} alt={authorName} className="w-5 h-5 rounded-full object-cover" />
                <span className="font-label-sm text-label-sm text-on-surface-variant">@{authorName}</span>
              </Link>
              <span className="hidden md:inline text-on-surface-variant/40">•</span>
              <span className="hidden md:inline font-label-sm text-label-sm text-on-surface-variant">
                {nodeCount} nodes
              </span>
              <span className="hidden md:inline text-on-surface-variant/40">•</span>
              <span className="hidden md:inline font-label-sm text-label-sm text-on-surface-variant">
                {edgeCount} edges
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <>
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">info</span>
              </button>
              <NotificationBell />
              <button
                onClick={handleLike}
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
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
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all disabled:opacity-50 ${
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
                className="hidden md:block px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary-container/90 transition-all disabled:opacity-50 border border-primary-container/30"
              >
                {forking ? 'Forking…' : 'Fork Project'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile Actions Bar */}
      {user && (
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-outline-variant/20 bg-surface-container/50">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all flex-1 ${
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
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all disabled:opacity-50 flex-1 ${
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
            {forking ? 'Forking…' : 'Fork'}
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas Area */}
        <main className="flex-1 relative">
          <ReactFlow
            nodes={canvas.nodes.map((n) => ({ ...n, data: { ...n.data, readOnly: true } }))}
            edges={canvas.edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView={{ padding: 0.2 }}
            onNodeClick={handleNodeClick}
            defaultEdgeOptions={{
              style: { stroke: '#6366f1', strokeWidth: 2 },
              type: 'default',
              labelStyle: { fill: '#908fa0', fontSize: 11 },
              labelBgStyle: { fill: 'rgba(12, 19, 36, 0.8)' },
              labelBgPadding: [4, 2],
              labelBgBorderRadius: 4,
              selectable: true,
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

        {/* Right Sidebar - Desktop */}
        <aside className="hidden md:flex w-80 glass-panel border-l border-outline-variant/20 flex-col shrink-0 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Project Info */}
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-1">{project.title}</h2>
              {project.description && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">{project.description}</p>
              )}
            </div>

            {/* Selected Node Info */}
            {selectedNode && (() => {
              const data = selectedNode.data || {};
              return (
                <div className="bg-surface-container/50 rounded-xl p-4 border border-outline-variant/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-label-md text-label-md text-on-surface truncate">{data.label || 'Untitled'}</h3>
                    <button onClick={() => setSelectedNode(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-variant/10 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] uppercase tracking-wider border ${data.type === 'Character' ? 'bg-violet-glow/10 text-violet-glow border-violet-glow/20' : data.type === 'Location' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : data.type === 'Plot Event' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.type === 'Lore' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : data.type === 'Item' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : data.type === 'Faction' ? 'bg-red-500/10 text-red-400 border-red-500/20' : data.type === 'Theme' ? 'bg-indigo-electric/10 text-indigo-electric border-indigo-electric/20' : 'bg-surface-tint/10 text-surface-tint border-outline-variant/20'}`}>
                      {data.type || 'Entity'}
                    </span>
                  </div>
                  {data.description && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 line-clamp-3">{data.description}</p>
                  )}
                  {(data.type === 'Character' && (data.role || data.age || data.affiliation || data.status)) && (
                    <div className="space-y-1 mb-3">
                      {data.role && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Role:</span> {data.role}</p>}
                      {data.age && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Age:</span> {data.age}</p>}
                      {data.affiliation && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Affiliation:</span> {data.affiliation}</p>}
                      {data.status && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Status:</span> {data.status}</p>}
                    </div>
                  )}
                  {(data.type === 'Faction' && (data.leader || data.size || data.influence || data.status)) && (
                    <div className="space-y-1 mb-3">
                      {data.leader && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Leader:</span> {data.leader}</p>}
                      {data.size && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Size:</span> {data.size}</p>}
                      {data.influence && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Influence:</span> {data.influence}</p>}
                      {data.status && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Status:</span> {data.status}</p>}
                    </div>
                  )}
                  {(data.type === 'Location' && (data.title || data.ruler || data.status)) && (
                    <div className="space-y-1 mb-3">
                      {data.title && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Title:</span> {data.title}</p>}
                      {data.ruler && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Ruler:</span> {data.ruler}</p>}
                      {data.status && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Status:</span> {data.status}</p>}
                    </div>
                  )}
                  {(data.type === 'Plot Event' && (data.title || data.timing || data.spark || data.keyCharacters)) && (
                    <div className="space-y-1 mb-3">
                      {data.title && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Title:</span> {data.title}</p>}
                      {data.timing && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Timing:</span> {data.timing}</p>}
                      {data.spark && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Spark:</span> {data.spark}</p>}
                      {data.keyCharacters && <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap"><span className="text-outline">Key Characters:</span> {data.keyCharacters.split('\n').slice(0, 2).join('\n')}</p>}
                    </div>
                  )}
                  {(data.type === 'Item' && (data.itemType || data.rarity || data.owner || data.abilities)) && (
                    <div className="space-y-1 mb-3">
                      {data.itemType && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Type:</span> {data.itemType}</p>}
                      {data.rarity && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Rarity:</span> {data.rarity}</p>}
                      {data.owner && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Owner:</span> {data.owner}</p>}
                      {data.abilities && <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap"><span className="text-outline">Abilities:</span> {data.abilities}</p>}
                    </div>
                  )}
                  {(data.type === 'Lore' && (data.category || data.status)) && (
                    <div className="space-y-1 mb-3">
                      {data.category && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Category:</span> {data.category}</p>}
                      {data.status && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Status:</span> {data.status}</p>}
                    </div>
                  )}
                  {(data.type === 'Theme' && (data.theme || data.opposingForce)) && (
                    <div className="space-y-1 mb-3">
                      {data.theme && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Theme:</span> {data.theme}</p>}
                      {data.opposingForce && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Opposing Force:</span> {data.opposingForce}</p>}
                    </div>
                  )}
                  {(data.role || data.affiliation) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {data.role && <span className="px-2 py-0.5 rounded bg-violet-glow/10 border border-violet-glow/20 text-[11px] text-violet-glow font-label-sm">{data.role}</span>}
                      {data.affiliation && <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400 font-label-sm">{data.affiliation}</span>}
                    </div>
                  )}
                  {data.type === 'Plot Event' && data.keyCharacters && (
                    <div className="mb-3">
                      <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-1">Key Characters</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-wrap">{data.keyCharacters.split('\n').slice(0, 2).join('\n')}</p>
                    </div>
                  )}
                </div>
              );
            })()}

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

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-full glass-panel border-l border-outline-variant/20 flex flex-col overflow-y-auto">
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-md text-headline-md text-on-surface">Project Info</h2>
                <button onClick={() => setSidebarOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-variant/10 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Project Info */}
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-1">{project.title}</h3>
                {project.description && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{project.description}</p>
                )}
              </div>

              {/* Selected Node Info */}
              {selectedNode && (() => {
                const data = selectedNode.data || {};
                return (
                  <div className="bg-surface-container/50 rounded-xl p-4 border border-outline-variant/20">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-label-md text-label-md text-on-surface truncate">{data.label || 'Untitled'}</h3>
                      <button onClick={() => { setSelectedNode(null); setSidebarOpen(false); }} className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-variant/10 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] uppercase tracking-wider border ${data.type === 'Character' ? 'bg-violet-glow/10 text-violet-glow border-violet-glow/20' : data.type === 'Location' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : data.type === 'Plot Event' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.type === 'Lore' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : data.type === 'Item' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : data.type === 'Faction' ? 'bg-red-500/10 text-red-400 border-red-500/20' : data.type === 'Theme' ? 'bg-indigo-electric/10 text-indigo-electric border-indigo-electric/20' : 'bg-surface-tint/10 text-surface-tint border-outline-variant/20'}`}>
                        {data.type || 'Entity'}
                      </span>
                    </div>
                    {data.description && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 line-clamp-3">{data.description}</p>
                    )}
                    {(data.type === 'Character' && (data.role || data.age || data.affiliation || data.status)) && (
                      <div className="space-y-1 mb-3">
                        {data.role && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Role:</span> {data.role}</p>}
                        {data.age && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Age:</span> {data.age}</p>}
                        {data.affiliation && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Affiliation:</span> {data.affiliation}</p>}
                        {data.status && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Status:</span> {data.status}</p>}
                      </div>
                    )}
                    {(data.type === 'Faction' && (data.leader || data.size || data.influence || data.status)) && (
                      <div className="space-y-1 mb-3">
                        {data.leader && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Leader:</span> {data.leader}</p>}
                        {data.size && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Size:</span> {data.size}</p>}
                        {data.influence && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Influence:</span> {data.influence}</p>}
                        {data.status && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Status:</span> {data.status}</p>}
                      </div>
                    )}
                    {(data.type === 'Location' && (data.title || data.ruler || data.status)) && (
                      <div className="space-y-1 mb-3">
                        {data.title && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Title:</span> {data.title}</p>}
                        {data.ruler && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Ruler:</span> {data.ruler}</p>}
                        {data.status && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Status:</span> {data.status}</p>}
                      </div>
                    )}
                    {(data.type === 'Plot Event' && (data.title || data.timing || data.spark || data.keyCharacters)) && (
                      <div className="space-y-1 mb-3">
                        {data.title && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Title:</span> {data.title}</p>}
                        {data.timing && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Timing:</span> {data.timing}</p>}
                        {data.spark && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Spark:</span> {data.spark}</p>}
                        {data.keyCharacters && <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap"><span className="text-outline">Key Characters:</span> {data.keyCharacters.split('\n').slice(0, 2).join('\n')}</p>}
                      </div>
                    )}
                    {(data.type === 'Item' && (data.itemType || data.rarity || data.owner || data.abilities)) && (
                      <div className="space-y-1 mb-3">
                        {data.itemType && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Type:</span> {data.itemType}</p>}
                        {data.rarity && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Rarity:</span> {data.rarity}</p>}
                        {data.owner && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Owner:</span> {data.owner}</p>}
                        {data.abilities && <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap"><span className="text-outline">Abilities:</span> {data.abilities}</p>}
                      </div>
                    )}
                    {(data.type === 'Lore' && (data.category || data.status)) && (
                      <div className="space-y-1 mb-3">
                        {data.category && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Category:</span> {data.category}</p>}
                        {data.status && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Status:</span> {data.status}</p>}
                      </div>
                    )}
                    {(data.type === 'Theme' && (data.theme || data.opposingForce)) && (
                      <div className="space-y-1 mb-3">
                        {data.theme && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Theme:</span> {data.theme}</p>}
                        {data.opposingForce && <p className="font-body-sm text-body-sm text-on-surface"><span className="text-outline">Opposing Force:</span> {data.opposingForce}</p>}
                      </div>
                    )}
                    {(data.role || data.affiliation) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {data.role && <span className="px-2 py-0.5 rounded bg-violet-glow/10 border border-violet-glow/20 text-[11px] text-violet-glow font-label-sm">{data.role}</span>}
                        {data.affiliation && <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400 font-label-sm">{data.affiliation}</span>}
                      </div>
                    )}
                    {data.type === 'Plot Event' && data.keyCharacters && (
                      <div className="mb-3">
                        <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-1">Key Characters</h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-wrap">{data.keyCharacters.split('\n').slice(0, 2).join('\n')}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                onClick={() => setSidebarOpen(false)}
              >
                Browse More
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
