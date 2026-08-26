import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
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
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | offline | error

  const isFirstLoad = useRef(true);

  // --- Load: prefer a local draft over the server copy if one exists ---
  useEffect(() => {
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
        setNodes(canvas.nodes || []);
        setEdges(canvas.edges || []);

        if (draft) setSaveStatus('offline'); // local draft is ahead of server until it syncs
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

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection) => setEdges((eds) => addEdge(connection, eds)), []);

  const addNode = () => {
    const newNode = {
      id: `node_${Date.now()}`,
      position: { x: Math.random() * 400, y: Math.random() * 300 },
      data: { label: 'New node' },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // --- Local-first: every change writes to localStorage immediately ---
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    saveDraft(id, { nodes, edges });
  }, [id, nodes, edges]);

  // --- Debounced sync to backend ---
  useDebouncedEffect(
    () => {
      if (isFirstLoad.current || loading) return;

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
    if (!title.trim() || title === project?.title) return;
    try {
      const updated = await api.updateProject(id, { title: title.trim() });
      setProject(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTogglePublic = async () => {
    const next = !isPublic;
    setIsPublic(next);
    try {
      const updated = await api.updateProject(id, { isPublic: next });
      setProject(updated);
    } catch (err) {
      setIsPublic(!next); // revert on failure
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center text-sm">
        Loading canvas…
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-neutral-950 text-red-400 flex items-center justify-center text-sm">
        {error}
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
    <div className="h-screen w-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <header className="border-b border-neutral-900 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-neutral-500 hover:text-neutral-300 text-sm">
            ← Dashboard
          </Link>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="bg-transparent text-sm font-medium focus:outline-none focus:bg-neutral-900 rounded px-1"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>{statusLabel}</span>
          <button onClick={addNode} className="rounded bg-neutral-800 px-2 py-1 hover:bg-neutral-700">
            + Node
          </button>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={handleTogglePublic} />
            Public
          </label>
        </div>
      </header>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  );
}
