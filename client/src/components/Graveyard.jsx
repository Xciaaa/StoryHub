import { useMemo } from 'react';

export default function Graveyard({ project }) {
  const trashed = useMemo(() => {
    if (!project?.canvas_data?.nodes) return [];
    return project.canvas_data.nodes.filter((n) => n.data?.trashed);
  }, [project]);

  return (
    <div className="p-6 space-y-4">
      <h3 className="font-headline-md text-headline-md text-on-surface">Graveyard</h3>
      {trashed.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Nothing here yet. Discarded ideas will rest here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {trashed.map((item) => (
            <li key={item.id} className="glass-panel rounded-lg p-4 border border-outline-variant/30 opacity-75">
              <p className="font-headline-md text-headline-md text-on-surface line-through">{item.data?.label || 'Untitled'}</p>
              {item.data?.description && (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">{item.data.description}</p>
              )}
              <p className="font-label-sm text-label-sm text-outline mt-2">Discarded</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
