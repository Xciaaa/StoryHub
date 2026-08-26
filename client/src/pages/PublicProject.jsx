import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
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
      <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center gap-4 text-sm">
        <p className="text-red-400">{error || 'This project is private or does not exist.'}</p>
        <Link to="/community" className="text-neutral-400 underline">
          Back to Community
        </Link>
      </div>
    );
  }

  const canvas = project.canvas_data || { nodes: [], edges: [] };

  return (
    <div className="h-screen w-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <header className="border-b border-neutral-900 px-4 py-2 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-medium">{project.title}</h1>
          {project.description && (
            <p className="text-xs text-neutral-500">{project.description}</p>
          )}
        </div>
        <Link to="/community" className="text-xs text-neutral-500 hover:text-neutral-300">
          ← Community
        </Link>
      </header>

      <div className="flex-1">
        <ReactFlow
          nodes={canvas.nodes}
          edges={canvas.edges}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap pannable={false} zoomable={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
