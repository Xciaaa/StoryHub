import { useState, useMemo, useRef, useEffect } from 'react';

const STATUSES = ['Finalized', 'In Progress', 'Draft'];

export default function Timeline({ project, nodes, updateNodeData, addNode, deleteNode }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const editCardRef = useRef(null);

  const events = useMemo(() => {
    if (!nodes?.length) return [];
    return nodes
      .filter((n) => n.data?.type === 'Plot Event')
      .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));
  }, [nodes]);

  const startEdit = (event, field, value) => {
    setEditingId(event.id);
    setDraft((prev) => {
      const current = prev[event.id] || { ...(event.data || {}) };
      return { ...prev, [event.id]: { ...current, [field]: value || '' } };
    });
  };

  const commit = (event) => {
    if (!editingId || editingId !== event.id) return;
    const next = draft[event.id] || {};
    Object.entries(next).forEach(([field, value]) => {
      updateNodeData(event.id, field, value);
    });
    setEditingId(null);
    setDraft((prev) => {
      const next = { ...prev };
      delete next[event.id];
      return next;
    });
  };

  const commitPending = () => {
    if (!editingId) return;
    const event = events.find((e) => e.id === editingId);
    if (event) commit(event);
  };

  const handleAdd = () => {
    commitPending();
    const newEvent = {
      id: `node_${Date.now()}`,
      type: 'custom',
      position: { x: 200, y: events.length * 180 + 100 },
      data: {
        label: 'New Event',
        type: 'Plot Event',
        description: '',
        year: `Year ${1000 + events.length}`,
        status: 'Draft',
      },
    };
    addNode(newEvent);
    setEditingId(newEvent.id);
    setDraft((prev) => ({ ...prev, [newEvent.id]: { ...newEvent.data } }));
  };

  const handleDelete = (event) => {
    setDeleteConfirmId(event.id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    deleteNode(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const moveEvent = (index, direction) => {
    commitPending();
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= events.length) return;
    const current = events[index];
    const target = events[newIndex];
    const currentY = current.position?.y || 0;
    const targetY = target.position?.y || 0;
    updateNodeData(current.id, 'position', { ...current.position, y: targetY });
    updateNodeData(target.id, 'position', { ...target.position, y: currentY });
  };

  const getStatusColor = (status) => {
    if (status === 'Finalized') return 'emerald';
    if (status === 'In Progress') return 'amber';
    return 'outline';
  };

  useEffect(() => {
    if (!editingId) return;
    function handleClickOutside(e) {
      if (editCardRef.current && !editCardRef.current.contains(e.target)) {
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;
        const event = events.find((ev) => ev.id === editingId);
        if (event) commit(event);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingId, events, commit]);

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar">
      <div className="max-w-[1000px] mx-auto py-12 px-4 sm:px-8">
        {events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-on-surface-variant mb-4">No plot events yet. Create your first timeline event below.</p>
            <button
              onClick={handleAdd}
              className="px-4 py-2 rounded-lg bg-indigo-electric text-white hover:bg-indigo-electric/90 font-label-md text-label-md transition-colors"
            >
              Add First Event
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Central Line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-outline-variant/80 transform sm:-translate-x-1/2 z-0" />

            {events.map((event, idx) => {
              const data = event.data || {};
              const isLeft = idx % 2 === 0;
              const statusColor = getStatusColor(data.status);
              const isFinalized = statusColor === 'emerald';
              const isInProgress = statusColor === 'amber';
              const currentDraft = draft[event.id] || data;
              const isEditing = editingId === event.id;

              return (
                <div key={event.id} className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center w-full mb-16 group">
                  {/* Left Content */}
                  <div className={`hidden sm:block w-1/2 ${isLeft ? 'pr-12 text-right' : 'pl-12 text-left order-2'}`}>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          autoFocus
                          value={currentDraft.year || ''}
                          onChange={(e) => startEdit(event, 'year', e.target.value)}
                          
                          onKeyDown={(e) => e.key === 'Enter' && commit(event)}
                          placeholder="Year / Date"
                          className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                        />
                        <input
                          value={currentDraft.label || ''}
                          onChange={(e) => startEdit(event, 'label', e.target.value)}
                          
                          onKeyDown={(e) => e.key === 'Enter' && commit(event)}
                          placeholder="Event title"
                          className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                        />
                        <textarea
                          value={currentDraft.description || ''}
                          onChange={(e) => startEdit(event, 'description', e.target.value)}
                          
                          placeholder="Description"
                          rows={3}
                          className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="font-label-sm text-label-sm text-indigo-electric font-semibold mb-1 uppercase tracking-wider">
                          {data.year || 'Undated'}
                        </div>
                        <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                          {data.label || 'Untitled Event'}
                        </h3>
                        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3">
                          {data.description || 'No description provided.'}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Center Dot */}
                  <div className={`absolute left-4 sm:left-1/2 w-4 h-4 rounded-full transform -translate-x-1/2 z-20 ${
                    isFinalized ? 'bg-emerald-500 border-4 border-slate-900 shadow-[0_0_10px_rgba(79,70,229,0.8)]' :
                    isInProgress ? 'bg-surface-container-high border-2 border-indigo-electric' :
                    'bg-surface-container-low border-2 border-outline-variant'
                  }`} />

                  {/* Right Content / Mobile Content */}
                  <div className={`w-full sm:w-1/2 ${isLeft ? 'pl-12 sm:pl-12' : 'pr-12 sm:pr-12 sm:pl-0 order-1'}`}>
                    <div className={`sm:hidden mb-4 ${!isLeft ? 'order-1' : ''}`}>
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            autoFocus
                            value={currentDraft.year || ''}
                            onChange={(e) => startEdit(event, 'year', e.target.value)}
                            
                            onKeyDown={(e) => e.key === 'Enter' && commit(event)}
                            placeholder="Year / Date"
                            className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                          />
                          <input
                            value={currentDraft.label || ''}
                            onChange={(e) => startEdit(event, 'label', e.target.value)}
                            
                            onKeyDown={(e) => e.key === 'Enter' && commit(event)}
                            placeholder="Event title"
                            className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                          />
                          <textarea
                            value={currentDraft.description || ''}
                            onChange={(e) => startEdit(event, 'description', e.target.value)}
                            
                            placeholder="Description"
                            rows={3}
                            className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="font-label-sm text-label-sm text-indigo-electric font-semibold mb-1 uppercase tracking-wider">
                            {data.year || 'Undated'}
                          </div>
                          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                            {data.label || 'Untitled Event'}
                          </h3>
                        </>
                      )}
                    </div>

                    <div ref={editCardRef} className={`glass-panel p-6 rounded-xl border border-outline-variant/20 node-hover-effect transition-all duration-300 relative overflow-hidden ${
                      !isFinalized ? 'border-dashed opacity-80 hover:opacity-100' : ''
                    }`}>
                      {isFinalized && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />}
                      {isInProgress && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50" />}

                      <div className="flex justify-between items-start mb-4">
                        {isEditing ? (
                          <select
                            value={currentDraft.status || 'Draft'}
                            onChange={(e) => startEdit(event, 'status', e.target.value)}
                            
                            className="px-2 py-1 rounded font-label-sm text-[10px] font-semibold uppercase tracking-widest border bg-black/40 text-on-surface outline-none"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded font-label-sm text-[10px] uppercase tracking-widest border ${
                            isFinalized ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            isInProgress ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-surface-variant/50 text-on-surface-variant border-outline-variant/30'
                          }`}>
                            {isFinalized && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                            {isInProgress && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                            {!isFinalized && !isInProgress && <span className="material-symbols-outlined text-[12px]">edit_note</span>}
                            {data.status || 'Draft'}
                          </span>
                        )}

                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={() => commit(event)} className="text-emerald-400 hover:text-emerald-300 text-sm">Save</button>
                              <button onClick={() => { setEditingId(null); setDraft((prev) => { const next = { ...prev }; delete next[event.id]; return next; }); }} className="text-outline hover:text-on-surface text-sm">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(event, 'label', data.label)} className="text-outline hover:text-on-surface text-sm">Edit</button>
                              <button onClick={() => handleDelete(event)} className="text-outline hover:text-red-400 text-sm">Delete</button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className={`sm:hidden ${!isLeft ? 'order-1' : ''}`}>
                        {!isEditing && (
                          <>
                            <div className="font-label-sm text-label-sm text-indigo-electric font-semibold mb-1 uppercase tracking-wider">
                              {data.year || 'Undated'}
                            </div>
                            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                              {data.label || 'Untitled Event'}
                            </h3>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <p className={`font-body-md text-body-md ${isFinalized || isInProgress ? 'text-on-surface-variant' : 'text-on-surface-variant/70'} line-clamp-3`}>
                          {data.description || 'No description provided.'}
                        </p>
                      )}
                    </div>

                    {/* Reorder buttons */}
                    <div className="flex justify-between mt-2 sm:hidden">
                      <button onClick={() => moveEvent(idx, -1)} disabled={idx === 0} className="text-xs text-outline hover:text-on-surface disabled:opacity-30">↑ Up</button>
                      <button onClick={() => moveEvent(idx, 1)} disabled={idx === events.length - 1} className="text-xs text-outline hover:text-on-surface disabled:opacity-30">↓ Down</button>
                    </div>
                  </div>

                  {/* Desktop reorder */}
                  <div className="hidden sm:flex absolute -left-16 top-1/2 -translate-y-1/2 flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveEvent(idx, -1)} disabled={idx === 0} className="text-outline hover:text-on-surface disabled:opacity-30">
                      <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                    </button>
                    <button onClick={() => moveEvent(idx, 1)} disabled={idx === events.length - 1} className="text-outline hover:text-on-surface disabled:opacity-30">
                      <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add Node Button */}
            <div className="relative z-10 flex justify-center w-full mt-8">
              <div className="absolute left-4 sm:left-1/2 transform sm:-translate-x-1/2">
                <button
                  onClick={handleAdd}
                  className="w-10 h-10 rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-indigo-electric hover:border-indigo-electric hover:bg-indigo-electric/10 transition-all flex items-center justify-center group z-20"
                >
                  <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const event = events.find((e) => e.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelDelete} />
            <div className="relative w-full max-w-md glass-panel rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden">
              <div className="p-6">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Confirm Delete</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Delete "{event?.data?.label || 'this event'}"? This cannot be undone.
                </p>
              </div>
              <div className="px-6 py-4 bg-black/20 flex justify-end gap-3">
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
        );
      })()}
    </div>
  );
}
