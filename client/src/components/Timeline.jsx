import { useMemo } from 'react';

export default function Timeline({ project }) {
  const events = useMemo(() => {
    if (!project?.canvas_data?.nodes) return [];
    return project.canvas_data.nodes
      .filter((n) => n.data?.type === 'Plot Event' || n.data?.label)
      .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0))
      .slice(0, 20);
  }, [project]);

  return (
    <div className="p-6 space-y-4">
      <h3 className="font-headline-md text-headline-md text-on-surface">Timeline</h3>
      {events.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No plot events yet. Add nodes on the canvas to build your timeline.</p>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-px bg-outline-variant/40" />
          <ul className="flex flex-col gap-4">
            {events.map((event, idx) => (
              <li key={event.id} className="relative">
                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-indigo-electric shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
                <div className="glass-panel rounded-lg p-3">
                  <p className="font-label-md text-label-md text-on-surface">{event.data?.label || 'Untitled Event'}</p>
                  {event.data?.description && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">{event.data.description}</p>
                  )}
                  <p className="font-label-sm text-label-sm text-outline mt-2">Beat #{idx + 1}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
