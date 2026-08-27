import { useState, useMemo } from 'react';

const CATEGORIES = ['Character', 'Location', 'Plot Event', 'Lore', 'Item', 'Faction', 'Theme'];

export default function Graveyard({ project, nodes, updateNodeData }) {
  const [filter, setFilter] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  const trashed = useMemo(() => {
    if (!nodes?.length) return [];
    return nodes.filter((n) => n.data?.trashed);
  }, [nodes]);

  const filteredTrashed = useMemo(() => {
    if (!filter.trim()) return trashed;
    const q = filter.toLowerCase();
    return trashed.filter((n) => (n.data?.label || '').toLowerCase().includes(q) || (n.data?.description || '').toLowerCase().includes(q));
  }, [trashed, filter]);

  const handleRestore = (node) => {
    updateNodeData(node.id, 'trashed', false);
    setRestoringId(null);
  };

  const handlePermanentDelete = (node) => {
    if (confirm(`Permanently delete "${node.data?.label || 'this item'}"? This cannot be undone.`)) {
      // This will be handled by parent via a callback, for now we just mark it
      updateNodeData(node.id, 'trashed', true);
    }
  };

  const getCategoryIcon = (type) => {
    const icons = {
      Character: 'person',
      Location: 'place',
      'Plot Event': 'event_note',
      Lore: 'auto_stories',
      Item: 'widgets',
      Faction: 'groups',
      Theme: 'palette',
    };
    return icons[type] || 'article';
  };

  const getCategoryColor = (type) => {
    const colors = {
      Character: 'text-violet-glow',
      Location: 'text-blue-400',
      'Plot Event': 'text-emerald-400',
      Lore: 'text-teal-400',
      Item: 'text-amber-400',
      Faction: 'text-red-400',
      Theme: 'text-indigo-electric',
    };
    return colors[type] || 'text-outline';
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Graveyard</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Discarded ideas and deleted entries</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search graveyard..."
            className="bg-black/20 border border-outline-variant/30 rounded-lg text-on-surface font-body-md px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner w-64"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredTrashed.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-[48px] text-outline mb-2">delete_forever</span>
            <p className="text-sm text-on-surface-variant">
              {trashed.length === 0 ? 'Nothing here yet. Deleted items will rest here.' : 'No items match your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTrashed.map((item) => {
              const data = item.data || {};
              const isRestoring = restoringId === item.id;

              return (
                <div
                  key={item.id}
                  className="glass-panel rounded-xl border border-outline-variant/30 p-5 opacity-75 hover:opacity-100 transition-all"
                >
                  {isRestoring ? (
                    <div className="space-y-3">
                      <p className="font-body-md text-body-md text-on-surface mb-2">
                        Restore "{data.label || 'Untitled'}" back to your project?
                      </p>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => handleRestore(item)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-sm font-label-md transition-colors"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => setRestoringId(null)}
                          className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30 text-sm font-label-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className={`material-symbols-outlined text-[20px] ${getCategoryColor(data.type)}`}>{getCategoryIcon(data.type)}</span>
                          <h3 className="font-headline-md text-headline-md text-on-surface truncate line-through">{data.label || 'Untitled'}</h3>
                        </div>
                        <span className="px-2 py-0.5 rounded font-label-sm text-[10px] uppercase tracking-wider border border-outline-variant/30 text-outline bg-surface-variant/50">
                          Trashed
                        </span>
                      </div>
                      {data.description && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-3">{data.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                        <span className="font-label-sm text-label-sm text-outline">{data.type || 'Entry'}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setRestoringId(item.id)}
                            className="text-outline hover:text-emerald-400 p-1.5 rounded-md hover:bg-white/5 transition-colors"
                            title="Restore"
                          >
                            <span className="material-symbols-outlined text-[16px]">restore</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(item)}
                            className="text-outline hover:text-red-400 p-1.5 rounded-md hover:bg-white/5 transition-colors"
                            title="Delete permanently"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
