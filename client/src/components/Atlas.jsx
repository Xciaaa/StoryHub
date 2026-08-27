import { useMemo } from 'react';

export default function Atlas({ project }) {
  const locations = useMemo(() => {
    if (!project?.canvas_data?.nodes) return [];
    return project.canvas_data.nodes.filter((n) => n.data?.type === 'Location');
  }, [project]);

  return (
    <div className="p-6 space-y-4">
      <h3 className="font-headline-md text-headline-md text-on-surface">Atlas</h3>
      {locations.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No locations mapped yet. Add Location nodes on the canvas to build your atlas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="glass-panel rounded-lg p-4 border border-outline-variant/30">
              <p className="font-headline-md text-headline-md text-on-surface truncate">{loc.data?.label || 'Untitled Location'}</p>
              {loc.data?.description && (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">{loc.data.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                {loc.position ? `${Math.round(loc.position.x)}, ${Math.round(loc.position.y)}` : 'Unplaced'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
