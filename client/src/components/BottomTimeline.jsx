import { useMemo, useState } from 'react';

export default function BottomTimeline({ nodes, edges, onSelectNode, collapsed, onToggle }) {
  const events = useMemo(() => {
    if (!nodes?.length) return [];
    return nodes
      .filter((n) => n.data?.type === 'Plot Event' && !n.data?.trashed)
      .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0))
      .slice(0, 10);
  }, [nodes]);

  if (events.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 transition-all duration-300">
      {collapsed ? (
        <button
          onClick={onToggle}
          className="h-12 px-3 bg-surface-container/90 backdrop-blur-md border border-outline-variant/30 rounded-t-xl flex items-center gap-2 hover:bg-surface-variant/60 transition-colors ml-4"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Timeline</span>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">expand_less</span>
        </button>
      ) : (
        <div className="h-16 bg-surface-container/90 backdrop-blur-md border-t border-outline-variant/30 flex items-center px-4 gap-2 overflow-x-auto">
          <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider mr-2 shrink-0">Timeline</span>
          {events.map((evt, idx) => (
            <button
              key={evt.id}
              onClick={() => onSelectNode?.(evt.id)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-surface-variant/40 border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/60 transition-colors font-label-sm text-[11px] flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              {evt.data?.label || `Event ${idx + 1}`}
            </button>
          ))}
          <button
            onClick={onToggle}
            className="shrink-0 ml-auto p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 transition-colors"
            title="Collapse timeline"
          >
            <span className="material-symbols-outlined text-[18px]">expand_more</span>
          </button>
        </div>
      )}
    </div>
  );
}
