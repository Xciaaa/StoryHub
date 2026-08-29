import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  useStore,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from '../components/CustomNode';
import Timeline from '../components/Timeline';
import Atlas from '../components/Atlas';
import Avatar from '../components/Avatar';
import Codex from '../components/Codex';
import Graveyard from '../components/Graveyard';
import Help from '../components/Help';
import { api, API_BASE } from '../lib/api';
import { useDebouncedEffect } from '../lib/useDebouncedEffect';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';

const nodeTypes = { custom: CustomNode };

const draftKey = (id) => `lorecanvas:draft:${id}`;
const AUTOSAVE_DELAY_MS = 1500;

function FloatingToolbar({ onAddNode, onSave, saveStatus, nodeType = 'Character' }) {
  const { zoomTo } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const roundedZoom = Math.round(zoom * 100 / 10) * 10;

  const handleZoomIn = () => {
    const next = Math.min(400, roundedZoom + 10);
    zoomTo(next / 100, { duration: 150 });
  };

  const handleZoomOut = () => {
    const next = Math.max(10, roundedZoom - 10);
    zoomTo(next / 100, { duration: 150 });
  };

  const zoomPercent = `${roundedZoom}%`;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-full floating-glass border border-outline-variant/30 z-20 shadow-xl">
      <button onClick={handleZoomOut} className="p-2 text-on-surface hover:text-indigo-electric transition-colors rounded-full hover:bg-surface-variant/50">
        <span className="material-symbols-outlined text-[20px]">zoom_out</span>
      </button>
      <span className="font-label-md text-[13px] font-medium text-on-surface-variant px-3 min-w-[60px] text-center">{zoomPercent}</span>
      <button onClick={handleZoomIn} className="p-2 text-on-surface hover:text-indigo-electric transition-colors rounded-full hover:bg-surface-variant/50">
        <span className="material-symbols-outlined text-[20px]">zoom_in</span>
      </button>
      <div className="w-px h-5 bg-outline-variant/50 mx-1" />
      <button
        onClick={() => onAddNode({
          id: `node_${Date.now()}`,
          type: 'custom',
          position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
          data: { label: `New ${nodeType}`, type: nodeType, description: '', role: '', affiliation: '' },
        })}
        className="p-2 ml-1 bg-indigo-electric text-on-primary rounded-full hover:bg-indigo-electric/90 transition-all shadow-[0_0_12px_rgba(79,70,229,0.5)] border border-indigo-400/30"
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
      </button>
      <div className="w-px h-5 bg-outline-variant/50 mx-1" />
      <button
        onClick={onSave}
        disabled={saveStatus === 'saving'}
        className="px-3 py-1.5 bg-emerald-600 text-on-primary rounded-full hover:bg-emerald-500 transition-all text-[12px] font-semibold disabled:opacity-50 border border-emerald-400/30"
      >
        {saveStatus === 'saving' ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

function loadDraft(id) {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(id, canvasData) {
  try {
    const serializable = {
      nodes: (canvasData.nodes || []).map(({ data, ...rest }) => ({
        ...rest,
        data: data && typeof data === 'object' ? { ...data } : data,
      })),
      edges: canvasData.edges || [],
    };
    localStorage.setItem(draftKey(id), JSON.stringify({ canvasData: serializable, savedAt: Date.now() }));
  } catch {
    // ignore storage/serialization errors
  }
}

function clearDraft(id) {
  localStorage.removeItem(draftKey(id));
}

function serializeCanvas({ nodes, edges }) {
  return {
    nodes: (nodes || []).map(({ data, ...rest }) => ({
      ...rest,
      data: data && typeof data === 'object' ? { ...data } : data,
    })),
    edges: edges || [],
  };
}

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);
  const [activeTab, setActiveTab] = useState('nodes');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [newNodeType, setNewNodeType] = useState('Character');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isFirstLoad = useRef(true);
  const savingRef = useRef(false);

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
        const hasDraftContent = Boolean(draft?.canvasData && (draft.canvasData.nodes?.length || draft.canvasData.edges?.length));
        const canvas = hasDraftContent ? draft.canvasData : (server.canvas_data || { nodes: [], edges: [] });

        console.log('[Editor] load', { id, draft: !!draft, hasDraftContent, serverNodes: (server.canvas_data?.nodes || []).length, canvasNodes: (canvas.nodes || []).length });

        setProject(server);
        setTitle(server.title);
        setIsPublic(server.is_public);
        const nextNodes = attachNodeHandlers((canvas.nodes || []).filter((n) => !n.data?.trashed));
        const nodeIds = new Set(nextNodes.map((n) => n.id));
        setNodes(nextNodes);
        setEdges(sanitizeEdges(canvas.edges || [], nodeIds));

        if (draft) setSaveStatus('offline');
      } catch (err) {
        if (!cancelled) {
          if (err.status === 401) {
            handleSessionExpired();
          } else {
            setError(err.message || 'Failed to load project');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    const sourceType = sourceNode?.data?.type || 'Entity';
    const targetType = targetNode?.data?.type || 'Entity';
    const defaultLabel = `${sourceType} → ${targetType}`;
    setEdges((eds) => addEdge({ ...connection, label: defaultLabel, labelStyle: { fill: '#908fa0', fontSize: 11 }, labelBgStyle: { fill: 'rgba(12, 19, 36, 0.8)' }, labelBgPadding: [4, 2], labelBgBorderRadius: 4 }, eds));
  }, [nodes]);

  const sanitizeEdges = useCallback((eds, nodeIds) => {
    const ids = new Set(nodeIds);
    return eds.filter((e) => {
      if (e.source && !ids.has(e.source)) return false;
      if (e.target && !ids.has(e.target)) return false;
      return true;
    });
  }, []);

  useEffect(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    setEdges((eds) => sanitizeEdges(eds, nodeIds));
  }, [nodes, sanitizeEdges]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    setInspectorOpen(true);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((_, edge) => {
    setSelectedEdgeId(edge.id);
    setInspectorOpen(true);
    setSelectedNodeId(null);
  }, []);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const updateNodeData = useCallback((nodeId, field, value) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...(n.data || {}), [field]: value } } : n))
    );
  }, []);

  const attachNodeHandlers = useCallback((nds) => {
    return nds.map((n) => {
      const safePosition = {
        x: typeof n.position?.x === 'number' && !Number.isNaN(n.position.x) ? n.position.x : 0,
        y: typeof n.position?.y === 'number' && !Number.isNaN(n.position.y) ? n.position.y : 0,
      };
      return {
        ...n,
        position: safePosition,
        type: n.type || 'custom',
        data: {
          ...(n.data || {}),
          onChange: (field, value) => updateNodeData(n.id, field, value),
          onDelete: () => {
            setPendingDelete({
              nodes: [n],
              edges: [],
            });
          },
        },
      };
    });
  }, [updateNodeData, selectedNodeId]);

  const deleteSelected = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const selectedNodes = currentNodes.filter((n) => n.selected);
    const selectedEdges = currentEdges.filter((e) => e.selected);

    if (!selectedNodes.length && !selectedEdges.length) return;

    setPendingDelete({
      nodes: selectedNodes,
      edges: selectedEdges,
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (pendingDelete) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (document.activeElement?.isContentEditable) return;
        deleteSelected();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, pendingDelete]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    const { nodes: nodesToDelete, edges: edgesToDelete } = pendingDelete;
    const nodeIds = new Set(nodesToDelete.map((n) => n.id));
    const edgeIds = new Set(edgesToDelete.map((e) => e.id));

    setNodes((nds) => nds.map((n) => nodeIds.has(n.id) ? { ...n, data: { ...(n.data || {}), trashed: true } } : n));
    setEdges((eds) => eds.filter((e) => !edgeIds.has(e.id) && !nodeIds.has(e.source) && !nodeIds.has(e.target)));
    setInspectorOpen(false);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setPendingDelete(null);
  }, [pendingDelete]);

  const cancelDelete = useCallback(() => {
    setPendingDelete(null);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && pendingDelete) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (document.activeElement?.isContentEditable) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmDelete();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelDelete();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingDelete, confirmDelete, cancelDelete]);

  useEffect(() => {
    function handleBeforeUnload(e) {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    return () => {
      if (!id || !hasUnsavedChanges) return;
      try {
        saveDraft(id, { nodes, edges });
      } catch {
        // ignore cleanup errors
      }
    };
  }, [id, hasUnsavedChanges, nodes, edges]);

  const addNode = (customNode) => {
    const newNode = customNode || {
      id: `node_${Date.now()}`,
      type: 'custom',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
      data: { label: 'New entity', type: 'Character', description: '', role: '', affiliation: '' },
    };
    setNodes((nds) => attachNodeHandlers([...nds, newNode]));
  };

  useEffect(() => {
    if (isFirstLoad.current || !id) {
      isFirstLoad.current = false;
      return;
    }
    saveDraft(id, { nodes, edges });
    setHasUnsavedChanges(true);
    console.log('[Editor] draft saved', { id, nodeCount: nodes.length, edgeCount: edges.length });
  }, [id, nodes, edges]);

  const handleSessionExpired = useCallback(() => {
    setSessionExpired(true);
    setSaveStatus('idle');
    savingRef.current = false;
    localStorage.removeItem('token');
  }, []);

  const handleCoverImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const result = await api.uploadImage(formData);
      if (result?.url) {
        const updated = await api.updateProject(id, {
          canvasData: serializeCanvas({ nodes, edges }),
          coverImage: result.url,
        });
        setProject(updated);
      }
    } catch (err) {
      console.error('Failed to upload cover image', err);
    }
  };

  const manualSave = useCallback(async () => {
    if (!id || !navigator.onLine || savingRef.current) return;
    if (sessionExpired) return;
    savingRef.current = true;
    console.log('[Editor] manual save start', { nodeCount: nodes.length, edgeCount: edges.length });
    setSaveStatus('saving');
    try {
      const payload = serializeCanvas({ nodes, edges });
      console.log('[Editor] manual save payload', payload);
      const updated = await api.updateProject(id, {
        canvasData: payload,
        coverImage: project?.cover_image || null,
      });
      console.log('[Editor] manual save success', updated);
      setProject(updated);
      clearDraft(id);
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[Editor] manual save failed', err);
      if (err.status === 401) {
        handleSessionExpired();
        return;
      }
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      savingRef.current = false;
    }
  }, [id, nodes, edges, sessionExpired, handleSessionExpired, project?.cover_image]);

  useDebouncedEffect(
    () => {
      if (isFirstLoad.current || loading || !id || savingRef.current || sessionExpired) return;

      async function sync() {
        if (!navigator.onLine) {
          setSaveStatus('offline');
          return;
        }
        savingRef.current = true;
        setSaveStatus('saving');
        try {
          const payload = serializeCanvas({ nodes, edges });
          console.log('[Editor] autosave start', { nodeCount: payload.nodes.length, edgeCount: payload.edges.length });
          const updated = await api.updateProject(id, {
            canvasData: payload,
            coverImage: project?.cover_image || null,
          });
          console.log('[Editor] autosave success');
          setProject(updated);
          clearDraft(id);
          setSaveStatus('saved');
          setHasUnsavedChanges(false);
        } catch (err) {
          console.error('[Editor] autosave failed', err);
          if (err.status === 401) {
            handleSessionExpired();
            return;
          }
          setSaveStatus('error');
        } finally {
          savingRef.current = false;
        }
      }
      sync();
    },
    [nodes, edges],
    AUTOSAVE_DELAY_MS
  );

  const handleTitleBlur = async () => {
    if (!title.trim() || title === project?.title || !id || savingRef.current || sessionExpired) return;
    savingRef.current = true;
    try {
      const updated = await api.updateProject(id, { title: title.trim() });
      setProject(updated);
    } catch (err) {
      if (err.status === 401) {
        handleSessionExpired();
        return;
      }
      setError(err.message);
    } finally {
      savingRef.current = false;
    }
  };

  const handleTogglePublic = async () => {
    if (!id || savingRef.current || sessionExpired) return;
    savingRef.current = true;
    const next = !isPublic;
    setIsPublic(next);
    try {
      const updated = await api.updateProject(id, { isPublic: next });
      setProject(updated);
    } catch (err) {
      if (err.status === 401) {
        handleSessionExpired();
        return;
      }
      setIsPublic(!next);
      setError(err.message);
    } finally {
      savingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-surface-variant flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="logo-continuous-loop">
            <Logo className="w-12 h-12" />
          </div>
          <p className="font-body-md text-body-md">Loading canvas…</p>
        </div>
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
    <div className="h-screen w-screen bg-background text-on-background font-body-md text-body-md overflow-hidden grid grid-rows-[auto_1fr]">
      {/* Top Navigation */}
      <nav className="flex justify-between items-center px-margin-desktop h-16 glass-strong border-b border-outline-variant/30">
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
          <NotificationBell />
          <Link to="/settings" className="p-2 text-on-surface-variant hover:text-primary transition-colors duration-200 rounded-full hover:bg-surface-variant/40">
            <span className="material-symbols-outlined">settings</span>
          </Link>
          <Link to={`/profile/${user?.username}`} className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30 ml-2">
            <Avatar src={user?.avatar} alt="User profile" className="w-full h-full object-cover" />
          </Link>
        </div>
      </nav>

      <div className={`grid h-full transition-all duration-300 ${sidebarCollapsed ? 'grid-cols-[64px_1fr]' : 'grid-cols-[320px_1fr]'}`}>
        {/* Side Navigation */}
        <aside className={`flex flex-col glass-strong border border-outline-variant/30 shadow-lg rounded-xl h-full transition-all duration-300 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
        <div className="flex items-center justify-between mb-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-4 p-2">
              <label className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-outline-variant/20 shadow-sm cursor-pointer relative group">
                {project?.cover_image ? (
                  <img
                    alt="Project cover"
                    className="w-full h-full object-cover"
                    src={`${API_BASE}${project.cover_image}`}
                  />
                ) : (
                  <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px] text-outline">image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-surface-container/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-on-primary">edit</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
              </label>
              <div>
                <h2 className="font-headline-md text-[20px] font-semibold text-on-surface truncate">{title || 'Untitled'}</h2>
                <p className="font-body-md text-[14px] text-on-surface-variant">{project?.genre || 'Untitled Project'}</p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isPublic}
                      onChange={async (e) => {
                        const next = e.target.checked;
                        setIsPublic(next);
                        try {
                          const updated = await api.updateProject(id, {
                            canvasData: serializeCanvas({ nodes, edges }),
                            coverImage: project?.cover_image || null,
                            isPublic: next,
                          });
                          setProject(updated);
                        } catch (err) {
                          console.error('Failed to update visibility', err);
                          setIsPublic(!next);
                        }
                      }}
                    />
                    <div className="w-9 h-5 bg-surface-variant rounded-full peer-checked:bg-indigo-electric transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="font-label-sm text-[12px] text-on-surface-variant">{isPublic ? 'Public' : 'Private'}</span>
                </label>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 transition-all shrink-0"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="material-symbols-outlined text-[20px]">{sidebarCollapsed ? 'chevron_right' : 'chevron_left'}</span>
          </button>
        </div>
        {!sidebarCollapsed && (
          <div className="mb-6 flex flex-col gap-2">
            <select
              value={newNodeType}
              onChange={(e) => setNewNodeType(e.target.value)}
              className="w-full bg-surface-container/20 border border-outline-variant/30 rounded-xl text-on-surface font-body-md px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner text-sm cursor-pointer"
            >
              <option value="Character">Character</option>
              <option value="Location">Location</option>
              <option value="Plot Event">Plot Event</option>
              <option value="Lore">Lore</option>
              <option value="Item">Item</option>
              <option value="Faction">Faction</option>
              <option value="Theme">Theme</option>
            </select>
            <button
              onClick={() => addNode({
                id: `node_${Date.now()}`,
                type: 'custom',
                position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
                data: { label: `New ${newNodeType}`, type: newNodeType, description: '', role: '', affiliation: '' },
              })}
              className="w-full py-2.5 bg-indigo-electric text-on-primary rounded-lg font-label-md text-label-md flex justify-center items-center gap-2 hover:bg-indigo-electric/90 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] border border-indigo-500/50"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Entity
            </button>
          </div>
        )}
        <nav className="flex-1 flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex items-center gap-3 p-3 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'nodes'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined">account_tree</span>
            {!sidebarCollapsed && 'Nodes'}
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-3 p-3 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'timeline'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined">event_note</span>
            {!sidebarCollapsed && 'Timeline'}
          </button>
          <button
            onClick={() => setActiveTab('atlas')}
            className={`flex items-center gap-3 p-3 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'atlas'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined">map</span>
            {!sidebarCollapsed && 'Atlas'}
          </button>
          <button
            onClick={() => setActiveTab('codex')}
            className={`flex items-center gap-3 p-3 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'codex'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined">menu_book</span>
            {!sidebarCollapsed && 'Codex'}
          </button>
          <button
            onClick={() => setActiveTab('graveyard')}
            className={`flex items-center gap-3 p-3 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'graveyard'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined">delete</span>
            {!sidebarCollapsed && 'Graveyard'}
          </button>
        </nav>
        <div className="mt-auto border-t border-outline-variant/30 pt-4 flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('help')}
            className={`flex items-center gap-3 p-2.5 rounded-lg font-label-md text-label-md text-left ${
              activeTab === 'help'
                ? 'text-indigo-300 bg-indigo-900/40 border border-indigo-500/20 shadow-inner shadow-white/5'
                : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
            {!sidebarCollapsed && 'Help'}
          </button>
          <Link to="/settings" className="flex items-center gap-3 p-2.5 rounded-lg text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all font-label-md text-label-md text-left">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            {!sidebarCollapsed && 'Settings'}
          </Link>
          <button className="flex items-center gap-3 p-2.5 rounded-lg text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface transition-all font-label-md text-label-md text-left">
            <span className="material-symbols-outlined text-[20px]">rate_review</span>
            {!sidebarCollapsed && 'Feedback'}
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 relative overflow-hidden h-full min-h-0">
        {activeTab === 'nodes' ? (
          <div className="absolute inset-0 h-full w-full">
            <ReactFlow
              nodes={nodes.filter((n) => !n.data?.trashed)}
              edges={edges.filter((e) => {
                const sourceNode = nodes.find((n) => n.id === e.source);
                const targetNode = nodes.find((n) => n.id === e.target);
                return sourceNode && targetNode && !sourceNode.data?.trashed && !targetNode.data?.trashed;
              })}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              fitView={{ padding: 0.2 }}
              nodeTypes={nodeTypes}
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
              <Background gap={32} size={1} color="rgba(144, 143, 160, 0.25)" />
              <Controls className="hidden" />
              {activeTab === 'nodes' && (
                <FloatingToolbar onAddNode={addNode} onSave={manualSave} saveStatus={saveStatus} nodeType={newNodeType} />
              )}
            </ReactFlow>
          </div>
        ) : (
          <div className="absolute inset-0 z-10 overflow-y-auto">
            {activeTab === 'timeline' && (
              <Timeline
                project={project}
                nodes={nodes}
                updateNodeData={updateNodeData}
                addNode={addNode}
                deleteNode={(nodeId) => {
                  setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...(n.data || {}), trashed: true } } : n));
                  setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
                }}
              />
            )}
            {activeTab === 'atlas' && (
              <Atlas
                project={project}
                nodes={nodes}
                edges={edges}
                updateNodeData={updateNodeData}
                addNode={addNode}
                deleteNode={(nodeId) => {
                  setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...(n.data || {}), trashed: true } } : n));
                  setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
                }}
              />
            )}
            {activeTab === 'codex' && (
              <Codex
                project={project}
                nodes={nodes}
                edges={edges}
                updateNodeData={updateNodeData}
                addNode={addNode}
                deleteNode={(nodeId) => {
                  setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...(n.data || {}), trashed: true } } : n));
                  setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
                }}
              />
            )}
            {activeTab === 'graveyard' && (
              <Graveyard
                project={project}
                nodes={nodes}
                updateNodeData={updateNodeData}
              />
            )}
            {activeTab === 'help' && <Help />}
          </div>
        )}
      </main>
      </div>

      {/* Slide-out Inspector Panel */}
      {inspectorOpen && selectedNode && !selectedEdge && (
        <aside className="fixed right-6 top-20 bottom-6 w-[420px] rounded-xl floating-glass border border-outline-variant/30 z-40 flex flex-col shadow-2xl overflow-hidden translate-x-0 transition-transform duration-300 inset-ring inset-ring-white/5 bg-surface-container/60">
          {/* Header */}
          <div className="p-6 border-b border-outline-variant/30 flex justify-between items-start bg-surface-container/40">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded bg-violet-glow/20 text-violet-glow font-label-sm text-[10px] font-semibold uppercase tracking-widest border border-violet-glow/30">
                  {selectedNode.data.type || 'Entity'}
                </span>
                <span className="px-2 py-0.5 rounded border border-outline-variant/50 text-on-surface-variant font-label-sm text-[10px] font-medium tracking-wide">
                  Active
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1 truncate">
                {selectedNode.data.label || 'Untitled'}
              </h2>
              <p className="font-label-md text-[13px] text-outline font-medium">ID: {selectedNode.id}</p>
            </div>
            <button
              onClick={() => setInspectorOpen(false)}
               className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-surface-variant/20 transition-colors"
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
                  onChange={(e) => updateNodeData(selectedNode.id, 'role', e.target.value)}
                  onBlur={(e) => updateNodeData(selectedNode.id, 'role', e.target.value)}
                  className="w-full bg-surface-container/20 border border-outline-variant/30 rounded-lg text-on-surface font-body-md p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
              </div>
              <div className="group">
                <label className="block font-label-sm text-[12px] font-semibold text-outline mb-2 uppercase tracking-wide group-focus-within:text-indigo-400 transition-colors">Affiliation</label>
                <input
                  type="text"
                  value={selectedNode.data.affiliation || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, 'affiliation', e.target.value)}
                  onBlur={(e) => updateNodeData(selectedNode.id, 'affiliation', e.target.value)}
                  className="w-full bg-surface-container/20 border border-outline-variant/30 rounded-lg text-on-surface font-body-md p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
              </div>
              {(selectedNode.data.type === 'Plot Event') && (
                <div className="group">
                  <label className="block font-label-sm text-[12px] font-semibold text-outline mb-2 uppercase tracking-wide group-focus-within:text-indigo-400 transition-colors">Key Characters & Their Role to the Plot Event</label>
                  <textarea
                    value={selectedNode.data.keyCharacters || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, 'keyCharacters', e.target.value)}
                    onBlur={(e) => updateNodeData(selectedNode.id, 'keyCharacters', e.target.value)}
                    placeholder="e.g. Aldric - Proclaims the ordeal; Seraphine - Secretly sabotages it"
                    rows={3}
                    className="w-full bg-surface-container/20 border border-outline-variant/30 rounded-lg text-on-surface font-body-md p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner resize-none"
                  />
                </div>
              )}
            </div>

            {/* Markdown Editor Area */}
            <div className="border-t border-outline-variant/20 pt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline-md text-[18px] font-semibold text-on-surface">Biography</h3>
              </div>
              <div
                className="bg-surface-container/20 rounded-lg border border-outline-variant/30 p-5 min-h-[220px] shadow-inner font-body-md text-[15px] leading-relaxed text-on-surface focus-within:border-indigo-500/50 transition-colors"
              >
                <textarea
                  value={selectedNode.data.description || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, 'description', e.target.value)}
                  onBlur={(e) => updateNodeData(selectedNode.id, 'description', e.target.value)}
                  placeholder="No description yet."
                  className="w-full h-full bg-transparent resize-none outline-none"
                />
              </div>
            </div>

            {/* Backlinks */}
            <div className="border-t border-outline-variant/20 pt-8 pb-4">
              <h3 className="font-headline-md text-[18px] font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-outline">account_tree</span>
                Connections ({edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length})
              </h3>
              <ul className="flex flex-col gap-2.5">
                {edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 ? (
                  <li className="text-sm text-on-surface-variant">No connections yet. Drag between node handles to connect entities.</li>
                ) : (
                  edges
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((edge) => {
                      const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                      const otherNode = nodes.find((n) => n.id === otherId);
                      const direction = edge.source === selectedNode.id ? 'Outgoing' : 'Incoming';
                      return (
                        <li key={edge.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-variant/10 hover:bg-surface-variant/20 cursor-pointer border border-outline-variant/10 hover:border-outline-variant/30 transition-all shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                              <span className="material-symbols-outlined text-blue-400 text-[18px]">location_on</span>
                            </div>
                            <span className="font-body-md text-[14px] font-medium text-on-surface">
                              {otherNode?.data?.label || 'Untitled'}
                            </span>
                          </div>
                          <span className="font-label-sm text-[11px] text-outline px-2 py-1 bg-surface-container/20 rounded-md">
                            {direction} · {otherNode?.data?.type || 'Entity'}
                          </span>
                        </li>
                      );
                    })
                )}
              </ul>
            </div>
          </div>
        </aside>
      )}

      {/* Edge Inspector */}
      {inspectorOpen && selectedEdge && (
        <aside className="fixed right-6 top-20 bottom-6 w-[420px] rounded-xl floating-glass border border-outline-variant/30 z-40 flex flex-col shadow-2xl overflow-hidden translate-x-0 transition-transform duration-300 inset-ring inset-ring-white/5 bg-surface-container/60">
          <div className="p-6 border-b border-outline-variant/30 flex justify-between items-start bg-surface-container/40">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-label-sm text-[10px] font-semibold uppercase tracking-widest border border-amber-500/30">
                  Relationship
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1 truncate">
                {selectedEdge.label || 'Untitled Connection'}
              </h2>
            </div>
            <button
              onClick={() => setInspectorOpen(false)}
               className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-surface-variant/20 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
            <div className="group">
              <label className="block font-label-sm text-[12px] font-semibold text-outline mb-2 uppercase tracking-wide group-focus-within:text-indigo-400 transition-colors">Relationship</label>
              <input
                type="text"
                value={selectedEdge.label || ''}
                onChange={(e) => {
                  const next = e.target.value;
                  setEdges((eds) => eds.map((edge) => edge.id === selectedEdge.id ? { ...edge, label: next } : edge));
                }}
                onBlur={(e) => {
                  const next = e.target.value;
                  setEdges((eds) => eds.map((edge) => edge.id === selectedEdge.id ? { ...edge, label: next } : edge));
                }}
                className="w-full bg-surface-container/20 border border-outline-variant/30 rounded-lg text-on-surface font-body-md p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
            </div>

            <div className="border-t border-outline-variant/20 pt-8">
              <h3 className="font-headline-md text-[18px] font-semibold text-on-surface mb-4">Connection Details</h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-variant/10 border border-outline-variant/10">
                  <div className="w-8 h-8 rounded-full bg-violet-glow/10 flex items-center justify-center border border-violet-glow/20">
                    <span className="material-symbols-outlined text-violet-glow text-[18px]">arrow_from_bracket</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-[11px] text-outline uppercase tracking-wider">Source</p>
                    <p className="font-body-md text-[14px] text-on-surface">{nodes.find((n) => n.id === selectedEdge.source)?.data?.label || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-variant/10 border border-outline-variant/10">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <span className="material-symbols-outlined text-blue-400 text-[18px]">arrow_to_bracket</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-[11px] text-outline uppercase tracking-wider">Target</p>
                    <p className="font-body-md text-[14px] text-on-surface">{nodes.find((n) => n.id === selectedEdge.target)?.data?.label || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Delete Confirmation Dialog */}
      {pendingDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-container/60 backdrop-blur-sm" onClick={cancelDelete} />
          <div className="relative w-full max-w-md glass-panel rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Confirm Delete</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {pendingDelete.nodes.length > 0 && pendingDelete.edges.length > 0
                  ? `Delete ${pendingDelete.nodes.length} node(s) and ${pendingDelete.edges.length} connection(s)? This cannot be undone.`
                  : pendingDelete.nodes.length > 0
                    ? `Delete ${pendingDelete.nodes.length} node(s)? This will also remove connected edges.`
                    : `Delete ${pendingDelete.edges.length} connection(s)?`}
              </p>
            </div>
            <div className="px-6 py-4 bg-surface-container/20 flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface font-label-md text-label-md transition-colors"
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

      {sessionExpired && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-container/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md glass-panel rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Session Expired</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Your session has expired or is unauthorized. Please sign in again to continue editing.
              </p>
            </div>
            <div className="px-6 py-4 bg-surface-container/20 flex justify-end gap-3">
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-indigo-electric text-on-primary hover:bg-indigo-electric/90 font-label-md text-label-md transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
