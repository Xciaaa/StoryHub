import { useState, useMemo, useEffect, useRef } from 'react';
import SearchInput from './SearchInput';

const LOCATION_TYPES = ['City', 'Wilderness', 'Dungeon', 'Village', 'Ruins', 'Realm'];

export default function Atlas({ project, nodes, edges, updateNodeData, addNode, deleteNode }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [filter, setFilter] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const editCardRef = useRef(null);

  const locations = useMemo(() => {
    if (!nodes?.length) return [];
    return nodes.filter((n) => n.data?.type === 'Location' && !n.data?.trashed);
  }, [nodes]);

  const locationEdges = useMemo(() => {
    if (!edges?.length || !locations.length) return [];
    const ids = new Set(locations.map((l) => l.id));
    return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [edges, locations]);

  const filteredLocations = useMemo(() => {
    if (!filter.trim()) return locations;
    const q = filter.toLowerCase();
    return locations.filter((l) => (l.data?.label || '').toLowerCase().includes(q) || (l.data?.region || '').toLowerCase().includes(q));
  }, [locations, filter]);

  const getMapBounds = () => {
    if (!filteredLocations.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    filteredLocations.forEach((loc) => {
      const x = loc.position?.x ?? 0;
      const y = loc.position?.y ?? 0;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    const pad = 120;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  };

  const bounds = getMapBounds();
  const toPercent = (val, min, max) => ((val - min) / (max - min || 1)) * 100;

  const startEdit = (loc, field, value) => {
    setEditingId(loc.id);
    setDraft((prev) => {
      const current = prev[loc.id] || { ...(loc.data || {}) };
      return { ...prev, [loc.id]: { ...current, [field]: value || '' } };
    });
  };

  const commit = (loc) => {
    if (!editingId || editingId !== loc.id) return;
    const next = draft[loc.id] || {};
    Object.entries(next).forEach(([field, value]) => {
      updateNodeData(loc.id, field, value);
    });
    setEditingId(null);
    setDraft((prev) => {
      const next = { ...prev };
      delete next[loc.id];
      return next;
    });
  };

  const commitPending = () => {
    if (!editingId) return;
    const loc = locations.find((l) => l.id === editingId);
    if (loc) commit(loc);
  };

  const handleAdd = () => {
    commitPending();
    const id = `node_${Date.now()}`;
    const newLoc = {
      id,
      type: 'custom',
      position: { x: bounds.minX + 100, y: bounds.minY + 100 },
      data: {
        label: 'New Location',
        type: 'Location',
        description: '',
        region: '',
        locationType: 'City',
      },
    };
    addNode(newLoc);
    setEditingId(id);
    setDraft((prev) => ({ ...prev, [id]: { ...newLoc.data } }));
  };

  const handleDelete = (loc) => {
    setDeleteConfirmId(loc.id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const loc = locations.find((l) => l.id === deleteConfirmId);
    if (loc) {
      updateNodeData(loc.id, 'trashed', true);
      if (editingId === loc.id) {
        setEditingId(null);
        setDraft((prev) => {
          const next = { ...prev };
          delete next[loc.id];
          return next;
        });
      }
      if (selectedLocation === loc.id) setSelectedLocation(null);
    }
    setDeleteConfirmId(null);
  };

  const commitLocationEdit = (loc) => {
    const next = editDraft[loc.id] || {};
    Object.entries(next).forEach(([field, value]) => {
      updateNodeData(loc.id, field, value);
    });
    setEditingLocationId(null);
    setEditDraft((prev) => {
      const next = { ...prev };
      delete next[loc.id];
      return next;
    });
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  useEffect(() => {
    if (!editingId) return;
    function handleClickOutside(e) {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;
      if (editCardRef.current && !editCardRef.current.contains(e.target)) {
        const loc = locations.find((l) => l.id === editingId);
        if (loc) commit(loc);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingId, locations, commit]);

  const getLocationNode = (id) => locations.find((l) => l.id === id);

  const getTypeColor = (type) => {
    const colors = {
      City: 'bg-indigo-electric',
      Wilderness: 'bg-emerald-500',
      Dungeon: 'bg-red-500',
      Village: 'bg-amber-500',
      Ruins: 'bg-gray-400',
      Realm: 'bg-violet-glow',
    };
    if (!type) return 'bg-indigo-electric';
    const first = type.split(',')[0].trim();
    return colors[first] || 'bg-indigo-electric';
  };

  const parseTypes = (type) => {
    if (!type) return ['Location'];
    return type.split(',').map((t) => t.trim()).filter(Boolean);
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">World Atlas</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Spatial overview of mapped locations</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput
            value={filter}
            onChange={setFilter}
            placeholder="Search locations..."
            type="locations"
            className="w-64"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg bg-indigo-electric text-on-primary hover:bg-indigo-electric/90 font-label-md text-label-md transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Location
          </button>
        </div>
      </div>

      {/* Map + Side Panel */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Map */}
        <div className="flex-1 relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container/40">
          {filteredLocations.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-[36px] text-outline mb-2">map</span>
                <p className="text-sm text-on-surface-variant">No locations match your search.</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                {locationEdges.map((edge) => {
                  const source = getLocationNode(edge.source);
                  const target = getLocationNode(edge.target);
                  if (!source || !target) return null;
                  const x1 = toPercent(source.position?.x ?? 0, bounds.minX, bounds.maxX);
                  const y1 = toPercent(source.position?.y ?? 0, bounds.minY, bounds.maxY);
                  const x2 = toPercent(target.position?.x ?? 0, bounds.minX, bounds.maxX);
                  const y2 = toPercent(target.position?.y ?? 0, bounds.minY, bounds.maxY);
                  return (
                    <line
                      key={edge.id}
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke="rgba(144, 143, 160, 0.4)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  );
                })}
              </svg>

              {filteredLocations.map((loc) => {
                const x = toPercent(loc.position?.x ?? 0, bounds.minX, bounds.maxX);
                const y = toPercent(loc.position?.y ?? 0, bounds.minY, bounds.maxY);
                const data = loc.data || {};
                const isEditing = editingId === loc.id;

                return (
                  <div
                    key={loc.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${x}%`, top: `${y}%`, zIndex: 10 }}
                    onDoubleClick={() => {
                      setEditingId(loc.id);
                      setDraft((prev) => ({ ...prev, [loc.id]: { ...(loc.data || {}) } }));
                    }}
                  >
                    {isEditing ? (
                      <div ref={editCardRef} className="absolute left-6 top-0 w-80 glass-panel rounded-xl border border-outline-variant/30 shadow-2xl p-4 z-50">
                        <div className="space-y-2">
                          <input
                            autoFocus
                            value={draft[loc.id]?.label || ''}
                            onChange={(e) => startEdit(loc, 'label', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && commit(loc)}
                            placeholder="Location name"
                            className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                          />
                          <input
                            value={draft[loc.id]?.locationType || ''}
                            onChange={(e) => startEdit(loc, 'locationType', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && commit(loc)}
                            placeholder="Location type (e.g. City, Capital)"
                            className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                          />
                          <input
                            value={draft[loc.id]?.region || ''}
                            onChange={(e) => startEdit(loc, 'region', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && commit(loc)}
                            placeholder="Region"
                            className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                          />
                          <textarea
                            value={draft[loc.id]?.description || ''}
                            onChange={(e) => startEdit(loc, 'description', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && commit(loc)}
                            placeholder="Description"
                            rows={3}
                            className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                          <button onClick={() => commit(loc)} className="text-emerald-400 hover:text-emerald-300 text-sm">Save</button>
                          <button onClick={() => { setEditingId(null); setDraft((prev) => { const next = { ...prev }; delete next[loc.id]; return next; }); }} className="text-outline hover:text-on-surface text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group cursor-pointer" onClick={() => setSelectedLocation(loc.id)}>
                        <div className="absolute left-1/2 -translate-x-1/2 -top-7 glass-panel rounded px-2 py-0.5 border border-outline-variant/30 shadow-lg whitespace-nowrap">
                          <span className="font-label-sm text-label-sm text-on-surface">{data.label || 'Untitled'}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 border-zinc-950 shadow-[0_0_10px_rgba(79,70,229,0.6)] ${getTypeColor(data.locationType)}`} />
                        <div className="absolute left-10 top-0 glass-panel rounded-lg p-2 border border-outline-variant/30 shadow-xl w-44 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <p className="font-label-md text-label-md text-on-surface truncate">{data.label || 'Untitled'}</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{data.description || 'No description'}</p>
                          <p className="font-label-sm text-label-sm text-outline mt-1">{data.region || 'Unknown region'}</p>
                          {data.locationType && (
                            <p className="font-label-sm text-label-sm text-outline mt-1">{parseTypes(data.locationType).join(', ')}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar - Location List */}
        <div className="w-80 flex flex-col gap-4">
          <div className="glass-panel rounded-xl border border-outline-variant/30 p-4">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Locations</h3>
            <div className="flex flex-col gap-2 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
              {filteredLocations.length === 0 ? (
                <p className="text-xs text-on-surface-variant">No locations found.</p>
              ) : (
                filteredLocations.map((loc) => {
                  const data = loc.data || {};
                  const isSelected = selectedLocation === loc.id;
                  return (
                      <div
                        key={loc.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected ? 'border-indigo-electric/50 bg-indigo-electric/10' : 'border-outline-variant/20 hover:border-outline-variant/40'
                        }`}
                        onClick={() => setSelectedLocation(loc.id)}
                      >
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-label-md text-label-md text-on-surface truncate flex-1">{data.label || 'Untitled Location'}</h4>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-2">
                        {data.description || 'No description provided.'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {parseTypes(data.locationType).map((t) => (
                          <span key={t} className="px-2 py-0.5 bg-surface-container rounded font-label-sm text-label-sm text-on-surface-variant">
                            {t}
                          </span>
                        ))}
                        {data.region && (
                          <span className="px-2 py-0.5 bg-surface-container rounded font-label-sm text-label-sm text-on-surface-variant">
                            {data.region}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-outline-variant/30 p-4">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Connections</h3>
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar">
              {locationEdges.length === 0 ? (
                <p className="text-xs text-on-surface-variant">No connections between locations yet.</p>
              ) : (
                locationEdges.map((edge) => {
                  const source = getLocationNode(edge.source);
                  const target = getLocationNode(edge.target);
                  if (!source || !target) return null;
                  return (
                    <div key={edge.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-variant/10 border border-outline-variant/10">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-indigo-electric">travel_explore</span>
                        <span className="text-xs text-on-surface">{source.data?.label || 'Unknown'}</span>
                      </div>
                      <span className="text-[10px] text-outline uppercase tracking-wider">{edge.label || 'Connected'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-on-surface">{target.data?.label || 'Unknown'}</span>
                        <span className="material-symbols-outlined text-[14px] text-indigo-electric">travel_explore</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Detail Modal */}
      {selectedLocation && (() => {
        const loc = locations.find((l) => l.id === selectedLocation);
        if (!loc) return null;
        const data = loc.data || {};
        const relatedEdges = locationEdges.filter((e) => e.source === loc.id || e.target === loc.id);
        const isEditing = editingLocationId === loc.id;
        const currentDraft = isEditing ? editDraft[loc.id] : data;

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => { setSelectedLocation(null); setEditingLocationId(null); }}>
            <div className="absolute inset-0 bg-surface-container/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg glass-panel rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      autoFocus
                      value={currentDraft.label || ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, [loc.id]: { ...(prev[loc.id] || data), label: e.target.value } }))}
                      onKeyDown={(e) => e.key === 'Enter' && commitLocationEdit(loc)}
                      placeholder="Location name"
                      className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                    />
                    <input
                      value={currentDraft.locationType || ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, [loc.id]: { ...(prev[loc.id] || data), locationType: e.target.value } }))}
                      onKeyDown={(e) => e.key === 'Enter' && commitLocationEdit(loc)}
                      placeholder="Location type (e.g. City, Capital)"
                      className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                    />
                    <input
                      value={currentDraft.region || ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, [loc.id]: { ...(prev[loc.id] || data), region: e.target.value } }))}
                      onKeyDown={(e) => e.key === 'Enter' && commitLocationEdit(loc)}
                      placeholder="Region"
                      className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                    />
                    <textarea
                      value={currentDraft.description || ''}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, [loc.id]: { ...(prev[loc.id] || data), description: e.target.value } }))}
                      onKeyDown={(e) => e.key === 'Enter' && commitLocationEdit(loc)}
                      placeholder="Description"
                      rows={3}
                      className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => commitLocationEdit(loc)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-on-primary hover:bg-emerald-500 text-sm font-label-md transition-colors">Save</button>
                      <button onClick={() => { setEditingLocationId(null); setEditDraft((prev) => { const next = { ...prev }; delete next[loc.id]; return next; }); }} className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30 text-sm font-label-md transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-headline-md text-headline-md text-on-surface mb-1">{data.label || 'Untitled Location'}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {parseTypes(data.locationType).map((t) => (
                            <span key={t} className="px-2 py-0.5 bg-surface-container rounded font-label-sm text-label-sm text-on-surface-variant">{t}</span>
                          ))}
                          {data.region && (
                            <span className="px-2 py-0.5 bg-surface-container rounded font-label-sm text-label-sm text-on-surface-variant">{data.region}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingLocationId(loc.id);
                            setEditDraft((prev) => ({ ...prev, [loc.id]: { ...(loc.data || {}) } }));
                          }}
                          className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-surface-variant/10 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLocation(null);
                            setDeleteConfirmId(loc.id);
                          }}
                          className="text-on-surface-variant hover:text-red-400 p-1.5 rounded-md hover:bg-surface-variant/10 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <button onClick={() => setSelectedLocation(null)} className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-surface-variant/10 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-outline-variant/20 pt-4">
                      <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Description</h4>
                      <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                        {data.description || 'No description provided.'}
                      </p>
                    </div>
                    {relatedEdges.length > 0 && (
                      <div className="border-t border-outline-variant/20 pt-4 mt-4">
                        <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Connected To</h4>
                        <div className="flex flex-col gap-2">
                          {relatedEdges.map((edge) => {
                            const otherId = edge.source === loc.id ? edge.target : edge.source;
                            const other = getLocationNode(otherId);
                            if (!other) return null;
                            return (
                              <div key={edge.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-variant/10 border border-outline-variant/10">
                                <span className="font-body-md text-[14px] text-on-surface">{other.data?.label || 'Unknown'}</span>
                                <span className="font-label-sm text-[11px] text-outline px-2 py-1 bg-surface-container/20 rounded-md">{edge.label || 'Connected'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const loc = locations.find((l) => l.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-surface-container/60 backdrop-blur-sm" onClick={cancelDelete} />
            <div className="relative w-full max-w-md glass-panel rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden">
              <div className="p-6">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Confirm Delete</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Delete "{loc?.data?.label || 'this location'}"? This cannot be undone.
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
        );
      })()}
    </div>
  );
}
