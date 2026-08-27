import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactFlow, { Background, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { api } from '../lib/api';

export default function PublicProject() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-surface-variant flex items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center gap-4 text-sm">
        <p className="text-error">{error || 'This project is private or does not exist.'}</p>
        <Link to="/community" className="text-on-surface-variant hover:text-primary transition-colors">
          Back to Community
        </Link>
      </div>
    );
  }

  const canvas = project.canvas_data || { nodes: [], edges: [] };

  return (
    <div className="h-screen w-screen bg-background text-on-background flex flex-col">
      <header className="glass-strong px-4 py-2 flex items-center justify-between shrink-0 z-10">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">{project.title}</h1>
          {project.description && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">{project.description}</p>
          )}
        </div>
        <Link to="/community" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
          ← Community
        </Link>
      </header>

      <div className="flex-1">
        <ReactFlow
          nodes={canvas.nodes.map((n) => ({ ...n, style: { background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(144, 143, 160, 0.2)', borderRadius: '0.25rem', fontFamily: 'var(--font-family-body)', color: 'var(--color-on-background)' } }))}
          edges={canvas.edges.map((e) => ({
            ...e,
            style: { stroke: 'url(#edgeGradient)', strokeWidth: 1.5 },
            type: 'smoothstep',
          }))}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          defaultEdgeOptions={{
            style: { stroke: 'url(#edgeGradient)', strokeWidth: 1.5 },
            type: 'smoothstep',
          }}
        >
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <Background variant="dots" gap={32} size={1} color="rgba(144, 143, 160, 0.3)" />
          <MiniMap
            pannable={false}
            zoomable={false}
            className="glass-strong rounded-lg"
            nodeColor={() => 'rgba(99, 102, 241, 0.5)'}
            maskColor="rgba(12, 19, 36, 0.8)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
