import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  MiniMap,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { api } from '../lib/api';
import { useDebouncedEffect } from '../lib/useDebouncedEffect';

const draftKey = (id) => `lorecanvas:draft:${id}`;
const AUTOSAVE_DELAY_MS = 1500;

function loadDraft(id) {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(id, canvasData) {
  localStorage.setItem(draftKey(id), JSON.stringify({ canvasData, savedAt: Date.now() }));
}

function clearDraft(id) {
  localStorage.removeItem(draftKey(id));
}

const typeStyles = {
  Character: 'bg-violet-glow/20 text-violet-glow border-violet-glow/30',
  Location: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Plot Event': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  default: 'bg-surface-tint/20 text-surface-tint border-outline-variant/30',
};

function CustomNode({ data, selected }) {
  const safeData = data || {};
  const typeClass = typeStyles[safeData.type] || typeStyles.default;

  return (
    <div
      className={`node-card rounded-xl p-5 cursor-pointer w-[280px] ${
        selected ? 'active' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2.5 py-0.5 rounded font-label-sm text-[10px] font-semibold uppercase tracking-widest border ${typeClass}`}>
          {safeData.type || 'Entity'}
        </span>
        <span className="material-symbols-outlined text-outline text-[18px] hover:text-on-surface transition-colors">
          more_horiz
        </span>
      </div>
      <h3 className="font-headline-md text-[22px] font-semibold text-on-surface mb-2 truncate">
        {safeData.label || 'Untitled'}
      </h3>
      {safeData.description && (
        <p className="font-body-md text-[14px] leading-relaxed text-on-surface-variant line-clamp-3">
          {safeData.description}
        </p>
      )}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-indigo-electric" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-indigo-electric" />
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [selectedNode, setSelectedNode] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('nodes');

  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Missing project ID');
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const server = await api.getProject(id);
        if (cancelled) return;

        const draft = loadDraft(id);
        const canvas = draft?.canvasData || server.canvas_data || { nodes: [], edges: [] };

        setProject(server);
        setTitle(server.title);
        setIsPublic(server.is_public);
        setNodes((canvas.nodes || []).map((n) => ({ ...n, type: 'custom', data: n.data || {} })));
        setEdges(canvas.edges || []);

        if (draft) setSaveStatus('offline');
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load project');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection) => setEdges((eds) => addEdge(connection, eds)), []);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
    setInspectorOpen(true);
  }, []);

  const updateSelectedNode = useCallback((updates) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id ? { ...n, ...updates, data: { ...n.data, ...updates.data } } : n
      )
    );
    setSelectedNode((prev) => ({ ...prev, ...updates, data: { ...prev.data, ...updates.data } }));
  }, [selectedNode]);

  const addNode = () => {
    const newNode = {
      id: `node_${Date.now()}`,
      type: 'custom',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
      data: { label: 'New entity', type: 'Entity', description: '' },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  useEffect(() => {
    if (isFirstLoad.current || !id) {
      isFirstLoad.current = false;
      return;
    }
    saveDraft(id, { nodes, edges });
  }, [id, nodes, edges]);

  useDebouncedEffect(
    () => {
      if (isFirstLoad.current || loading || !id) return;

      async function sync() {
        if (!navigator.onLine) {
          setSaveStatus('offline');
          return;
        }
        setSaveStatus('saving');
        try {
          const updated = await api.updateProject(id, {
            canvasData: { nodes, edges },
          });
          setProject(updated);
          clearDraft(id);
          setSaveStatus('saved');
        } catch {
          setSaveStatus('error');
        }
      }
      sync();
    },
    [nodes, edges],
    AUTOSAVE_DELAY_MS
  );

  const handleTitleBlur = async () => {
    if (!title.trim() || title === project?.title || !id) return;
    try {
      const updated = await api.updateProject(id, { title: title.trim() });
      setProject(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTogglePublic = async () => {
    if (!id) return;
    const next = !isPublic;
    setIsPublic(next);
    try {
      const updated = await api.updateProject(id, { isPublic: next });
      setProject(updated);
    } catch (err) {
      setIsPublic(!next);
      setError(err.message);
    }
  };

  const backlinks = nodes.filter((n) =>
    edges.some((e) => e.target === selectedNode?.id && e.source === n.id)
  );

  const handleBacklinkClick = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-surface-variant flex items-center justify-center text-sm">
        Loading canvas…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center gap-4 text-sm">
        <p className="text-error">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="text-indigo-electric hover:underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const statusLabel = {
    idle: '',
    saving: 'Saving…',
    saved: 'Saved',
    offline: 'Offline — saved locally',
    error: 'Save failed — retrying next edit',
  }[saveStatus];

  return (
    <div className="h-screen w-screen bg-background text-on-background flex flex-col font-body-md text-body-md overflow-hidden">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-desktop h-16 glass-strong border-b border-outline-variant/30">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            LoreCanvas
          </Link>
          <div className="hidden md:flex gap-6">
            <Link to="/dashboard" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md">
              Dashboard
            </Link>
            <span className="text-indigo-electric font-bold border-b-2 border-indigo-electric pb-1 opacity-90 font-label-md text-label-md">
              Canvas
            </span>
            <Link to="/community" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md">
              Community
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors duration-200 rounded-full hover:bg-surface-variant/40">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors duration-200 rounded-full hover:bg-surface-variant/40">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30 ml-2">
            <img
              alt="User profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAI-LnYosoUEfBtZhFPziZoOOI6WPgwfhpJsfqUFiXPESkSAm6MknpF-z7RRiVkEhKQm9HlBHeZI16dZSZM5DkAGiXfQRGVJul9YJjDxSgsDfRq2XLTbukadda__SHJY2VN4cDhrly9FcFKiNY0Af18PRH_GmY32xvst4A7dLZuv_cUK_-56iC-2gVLyAXuauy-dWyiIWwIp-e0NtM6P1B6r3w1jLbYqSoC8CNrs7-gcGI1zUwcn6Vxwg"
            />
          </div>
        </div>
      </nav>

      {/* Side Navigation */}
      <aside className="fixed left-0 top-20 bottom-6 z-40 flex flex-col p-4 w-panel-width ml-6 glass-strong border border-outline-variant/30 shadow-lg rounded-xl">
        <div className="flex items-center gap-4 mb-8 p-2">
          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-outline-variant/20 shadow-sm">
            <img
              alt="Project logo"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVhhnBZglGenWNdu9GWDta2YMl_S-oLSvIf4EKjm0hwR87TZKUcFWDoM-O9rtsO85fZDY4FuTb9k0grpDLvbDaCxMrLVVXcSNCX7__zVvyFT5t2fTcdV1BE0U4ZlgKx6JE8d25K8Gu18FyJfg7_ixb_IaHubZMfIM7ES8Fu2ACbexfeIw_73kzFLGqbwJrzHzefoXF6TiD7sVYMEuZkSAfTNnixjjd4ph6W2bBsuNofAj4nV2KtySiFQ"
            />
          </div>
          <div>
            <h2 className="font-headline-md text-[20px] font-semibold text-on-surface truncate">{title || 'Untitled'}</h2>
            <p className="font-body-md text-[14px] text-on-surface-variant">Novel - Sci-Fi</p>
          </div>
        </div>
        <button
          onClick={addNode}
          className="mb-6 w-full py-2.5 bg-indigo-electric text-white rounded-lg font-label-md text-label-md flex justify-center items-center gap-2 hover:bg-indigo-electric/90 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] border border-indigo-500/50"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Entity
        </button>
        <nav className="flex-1 flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex items-center gap-3 p-3 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'nodes'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined" data-icon="account_tree">account_tree</span>
            Nodes
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-3 p-3 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'timeline'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined" data-icon="event_note">event_note</span>
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('atlas')}
            className={`flex items-center gap-3 p-3 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'atlas'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined" data-icon="map">map</span>
            Atlas
          </button>
          <button
            onClick={() => setActiveTab('codex')}
            className={`flex items-center gap-3 p-3 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'codex'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined" data-icon="menu_book">menu_book</span>
            Codex
          </button>
          <button
            onClick={() => setActiveTab('graveyard')}
            className={`flex items-center gap-3 p-3 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'graveyard'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined" data-icon="delete">delete</span>
            Graveyard
          </button>
        </nav>
        <div className="mt-auto border-t border-outline-variant/30 pt-4 flex flex-col gap-1.5">
          <button className="flex items-center gap-3 p-2.5 rounded-lg text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all font-label-md text-label-md text-left">
            <span className="material-symbols-outlined text-[20px]" data-icon="help">help</span>
            Help
          </button>
          <button className="flex items-center gap-3 p-2.5 rounded-lg text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all font-label-md text-label-md text-left">
            <span className="material-symbols-outlined text-[20px]" data-icon="rate_review">rate_review</span>
            Feedback
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 relative canvas-bg ml-[calc(320px+48px)] mt-16 overflow-hidden">
        {activeTab === 'nodes' ? (
          <div className="absolute inset-0 z-10" style={{ width: '100%', height: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              fitView
              nodeTypes={nodeTypes}
              defaultEdgeOptions={{
                style: { stroke: 'url(#indigo-violet-gradient)', strokeWidth: 1.5 },
                type: 'smoothstep',
              }}
            >
              <Background variant="dots" gap={32} size={1} color="rgba(144, 143, 160, 0.3)" />
              <Controls className="hidden" />
              <MiniMap
                pannable
                zoomable
                className="glass-strong rounded-lg"
                nodeColor={() => 'rgba(99, 102, 241, 0.5)'}
                maskColor="rgba(12, 19, 36, 0.8)"
              />
            </ReactFlow>
          </div>
        ) : (
          <div className="absolute inset-0 z-10 overflow-y-auto">
            {activeTab === 'timeline' && <Timeline project={project} />}
            {activeTab === 'atlas' && <Atlas project={project} />}
            {activeTab === 'codex' && <Codex project={project} />}
            {activeTab === 'graveyard' && <Graveyard project={project} />}
          </div>
        )}

        {activeTab === 'nodes' && (
          <>
            {/* Floating Controls: Zoom/Add */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-full floating-glass border border-outline-variant/30 z-20 shadow-xl">
              <button className="p-2 text-on-surface hover:text-indigo-electric transition-colors rounded-full hover:bg-surface-variant/50">
                <span className="material-symbols-outlined text-[20px]">zoom_out</span>
              </button>
              <span className="font-label-md text-[13px] font-medium text-on-surface-variant px-3 min-w-[60px] text-center">100%</span>
              <button className="p-2 text-on-surface hover:text-indigo-electric transition-colors rounded-full hover:bg-surface-variant/50">
                <span className="material-symbols-outlined text-[20px]">zoom_in</span>
              </button>
              <div className="w-px h-5 bg-outline-variant/50 mx-1" />
              <button
                onClick={addNode}
                className="p-2 ml-1 bg-indigo-electric text-white rounded-full hover:bg-indigo-electric/90 transition-all shadow-[0_0_12px_rgba(79,70,229,0.5)] border border-indigo-400/30"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>

            {/* Floating Minimap */}
            <div className="absolute bottom-8 right-8 w-48 h-32 rounded-xl floating-glass border border-outline-variant/30 z-20 overflow-hidden shadow-xl p-2.5">
              <div className="w-full h-full border border-outline-variant/20 rounded-lg relative bg-zinc-950/60 shadow-inner">
                <div className="absolute top-[20%] left-[10%] w-[60%] h-[50%] border-2 border-indigo-electric/60 bg-indigo-electric/10 rounded-sm shadow-[0_0_8px_rgba(79,70,229,0.2)]" />
                <div className="absolute top-[30%] left-[25%] w-2 h-2 rounded-full bg-violet-glow shadow-[0_0_4px_rgba(124,58,237,0.8)]" />
                <div className="absolute top-[60%] left-[55%] w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.8)]" />
                <div className="absolute top-[75%] left-[15%] w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Slide-out Inspector Panel */}
      {inspectorOpen && selectedNode && (
        <aside className="fixed right-6 top-20 bottom-6 w-[420px] rounded-xl floating-glass border border-outline-variant/30 z-40 flex flex-col shadow-2xl overflow-hidden translate-x-0 transition-transform duration-300 inset-ring inset-ring-white/5 bg-slate-900/60">
          {/* Header */}
          <div className="p-6 border-b border-outline-variant/30 flex justify-between items-start bg-slate-900/40">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] font-semibold uppercase tracking-widest border ${typeStyles[selectedNode.data.type] || typeStyles.default}`}>
                  {selectedNode.data.type || 'Entity'}
                </span>
                <span className="px-2 py-0.5 rounded border border-outline-variant/50 text-on-surface-variant font-label-sm text-[10px] font-medium tracking-wide">
                  Active
                </span>
              </div>
              <input
                value={selectedNode.data.label || ''}
                onChange={(e) => updateSelectedNode({ data: { ...selectedNode.data, label: e.target.value } })}
                className="bg-transparent border-none text-on-surface font-headline-lg text-[32px] font-semibold mb-1 tracking-tight p-0 focus:outline-none focus:ring-0 w-full"
              />
              <p className="font-label-md text-[13px] text-outline font-medium">ID: {selectedNode.id}</p>
            </div>
            <button
              onClick={() => setInspectorOpen(false)}
              className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
            {/* Metadata Form */}
            <div className="flex flex-col gap-6">
              <div className="group">
                <label className="block font-label-sm text-[12px] font-semibold text-outline mb-2 uppercase tracking-wide group-focus-within:text-indigo-400 transition-colors">Role</label>
                <input
                  type="text"
                  value={selectedNode.data.role || ''}
                  onChange={(e) => updateSelectedNode({ data: { ...selectedNode.data, role: e.target.value } })}
                  className="w-full bg-black/20 border border-outline-variant/30 rounded-lg text-on-surface font-body-md p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
              </div>
              <div className="group">
                <label className="block font-label-sm text-[12px] font-semibold text-outline mb-2 uppercase tracking-wide group-focus-within:text-indigo-400 transition-colors">Affiliation</label>
                <input
                  type="text"
                  value={selectedNode.data.affiliation || ''}
                  onChange={(e) => updateSelectedNode({ data: { ...selectedNode.data, affiliation: e.target.value } })}
                  className="w-full bg-black/20 border border-outline-variant/30 rounded-lg text-on-surface font-body-md p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Markdown Editor Area */}
            <div className="border-t border-outline-variant/20 pt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline-md text-[18px] font-semibold text-on-surface">Biography</h3>
                <div className="flex gap-1 bg-black/30 p-1 rounded-md border border-outline-variant/20">
                  <button className="p-1.5 text-outline hover:text-on-surface hover:bg-white/10 rounded transition-colors">
                    <span className="material-symbols-outlined text-[16px]">format_bold</span>
                  </button>
                  <button className="p-1.5 text-outline hover:text-on-surface hover:bg-white/10 rounded transition-colors">
                    <span className="material-symbols-outlined text-[16px]">format_italic</span>
                  </button>
                  <button className="p-1.5 text-outline hover:text-on-surface hover:bg-white/10 rounded transition-colors">
                    <span className="material-symbols-outlined text-[16px]">link</span>
                  </button>
                </div>
              </div>
              <div
                className="bg-black/20 rounded-lg border border-outline-variant/30 p-5 min-h-[220px] shadow-inner font-body-md text-[15px] leading-relaxed text-on-surface focus-within:border-indigo-500/50 transition-colors"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateSelectedNode({ data: { ...selectedNode.data, description: e.target.innerText } })}
              >
                {selectedNode.data.description || 'No description yet.'}
              </div>
            </div>

            {/* Backlinks */}
            <div className="border-t border-outline-variant/20 pt-8 pb-4">
              <h3 className="font-headline-md text-[18px] font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-outline">account_tree</span>
                Backlinks ({backlinks.length})
              </h3>
              <ul className="flex flex-col gap-2.5">
                {backlinks.length === 0 ? (
                  <li className="text-sm text-on-surface-variant">No backlinks yet.</li>
                ) : (
                  backlinks.map((link) => (
                    <li
                      key={link.id}
                      onClick={() => handleBacklinkClick(link.id)}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer border border-outline-variant/10 hover:border-outline-variant/30 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                          <span className="material-symbols-outlined text-blue-400 text-[18px]">location_on</span>
                        </div>
                        <span className="font-body-md text-[14px] font-medium text-on-surface">{link.data?.label || 'Untitled'}</span>
                      </div>
                      <span className="font-label-sm text-[11px] text-outline px-2 py-1 bg-black/20 rounded-md">
                        {link.data?.type || 'Entity'}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
