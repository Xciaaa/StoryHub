import { useState, useMemo, useEffect, useRef } from 'react';

const CATEGORIES = ['Character', 'Location', 'Plot Event', 'Lore', 'Item', 'Faction', 'Theme'];
const STATUSES = ['Draft', 'In Progress', 'Finalized'];

export default function Codex({ project, nodes, edges, updateNodeData, addNode, deleteNode }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const editCardRef = useRef(null);

  const entries = useMemo(() => {
    if (!nodes?.length) return [];
    return nodes.filter((n) => n.data?.type && CATEGORIES.includes(n.data.type) && !n.data?.trashed);
  }, [nodes]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (category !== 'All') {
      result = result.filter((e) => e.data?.type === category);
    }
    if (status !== 'All') {
      result = result.filter((e) => e.data?.status === status);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => (e.data?.label || '').toLowerCase().includes(q) || (e.data?.description || '').toLowerCase().includes(q) || (e.data?.notes || '').toLowerCase().includes(q) || (e.data?.keyFigures || '').toLowerCase().includes(q));
    }
    return result.sort((a, b) => (a.data?.label || '').localeCompare(b.data?.label || ''));
  }, [entries, category, status, search]);

  const startEdit = (entry, field, value) => {
    setEditingId(entry.id);
    setDraft((prev) => {
      const current = prev[entry.id] || { ...(entry.data || {}) };
      return { ...prev, [entry.id]: { ...current, [field]: value || '' } };
    });
  };

  const commit = (entry) => {
    if (!editingId || editingId !== entry.id) return;
    const next = draft[entry.id] || {};
    Object.entries(next).forEach(([field, value]) => {
      updateNodeData(entry.id, field, value);
    });
    setEditingId(null);
    setDraft((prev) => {
      const next = { ...prev };
      delete next[entry.id];
      return next;
    });
  };

  const commitPending = () => {
    if (!editingId) return;
    const entry = entries.find((e) => e.id === editingId);
    if (entry) commit(entry);
  };

  const handleAdd = (type) => {
    commitPending();
    const id = `node_${Date.now()}`;
    const newEntry = {
      id,
      type: 'custom',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
      data: {
        label: `New ${type}`,
        type,
        description: '',
        status: 'Draft',
        notes: '',
        keyFigures: type === 'Faction' ? '' : undefined,
      },
    };
    addNode(newEntry);
    setEditingId(id);
    setDraft((prev) => ({ ...prev, [id]: { ...newEntry.data } }));
    setIsAdding(false);
  };

  const handleDelete = (entry) => {
    setDeleteConfirmId(entry.id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    updateNodeData(deleteConfirmId, 'trashed', true);
    if (editingId === deleteConfirmId) {
      setEditingId(null);
      setDraft((prev) => {
        const next = { ...prev };
        delete next[deleteConfirmId];
        return next;
      });
    }
    if (selectedEntry?.id === deleteConfirmId) setSelectedEntry(null);
    setDeleteConfirmId(null);
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
        const entry = entries.find((en) => en.id === editingId);
        if (entry) commit(entry);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingId, entries, commit]);

  const getStatusColor = (status) => {
    if (status === 'Finalized') return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
    if (status === 'In Progress') return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
    return 'text-outline border-outline-variant/30 bg-surface-variant/50';
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
      Lore: 'text-emerald-400',
      Item: 'text-amber-400',
      Faction: 'text-red-400',
      Theme: 'text-indigo-electric',
    };
    return colors[type] || 'text-outline';
  };

  const getCategoryBg = (type) => {
    const bgs = {
      Character: 'from-violet-glow/10',
      Location: 'from-blue-500/10',
      Lore: 'from-emerald-500/10',
      Item: 'from-amber-500/10',
      Faction: 'from-red-500/10',
      Theme: 'from-indigo-electric/10',
    };
    return bgs[type] || 'from-indigo-electric/10';
  };

  const getRelatedEdges = (entryId) => {
    if (!edges?.length) return [];
    return edges.filter((e) => e.source === entryId || e.target === entryId);
  };

  const getRelatedNode = (id) => nodes.find((n) => n.id === id);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header & Search Area */}
      <div className="mb-6">
        <div className="glass-panel rounded-xl p-4 lg:p-6 mb-8 max-w-[1200px] mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">The Codex</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">A comprehensive repository of all world elements, lore entries, and systematic knowledge for your universe.</p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 rounded-lg bg-indigo-electric text-white hover:bg-indigo-electric/90 font-label-md text-label-md transition-colors flex items-center gap-2 shadow-lg shadow-indigo-electric/20"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Entry
            </button>
          </div>

          {/* Add Entry Dropdown */}
          {isAdding && (
            <div className="mb-4 p-4 glass-panel rounded-xl border border-outline-variant/30">
              <h3 className="font-label-md text-label-md text-on-surface mb-3">Choose Entry Type</h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleAdd(cat)}
                    className="px-3 py-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface font-label-sm text-label-sm transition-colors flex items-center gap-2"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${getCategoryColor(cat)}`}>{getCategoryIcon(cat)}</span>
                    {cat}
                  </button>
                ))}
              </div>
              <button onClick={() => setIsAdding(false)} className="mt-3 text-outline hover:text-on-surface text-sm">
                Cancel
              </button>
            </div>
          )}

          {/* Search and Filter Tags */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the codex..."
                className="w-full bg-black/20 border-0 border-b-2 border-outline-variant/40 text-on-surface font-body-md px-4 py-3 pl-12 rounded-t-lg focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-on-surface-variant/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Sidebar - Filters */}
        <div className="w-64 flex flex-col gap-4 hidden md:flex">
          <div className="glass-panel rounded-xl border border-outline-variant/30 p-4">
            <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-3">Categories</h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setCategory('All')}
                className={`text-left px-3 py-2 rounded-lg font-label-sm text-label-sm transition-colors ${
                  category === 'All' ? 'bg-indigo-electric/10 text-indigo-electric' : 'text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface'
                }`}
              >
                All Entries
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-left px-3 py-2 rounded-lg font-label-sm text-label-sm transition-colors flex items-center gap-2 ${
                    category === cat ? 'bg-indigo-electric/10 text-indigo-electric' : 'text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${getCategoryColor(cat)}`}>{getCategoryIcon(cat)}</span>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-outline-variant/30 p-4">
            <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-3">Status</h3>
            <div className="flex flex-col gap-1">
              {['All', ...STATUSES].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`text-left px-3 py-2 rounded-lg font-label-sm text-label-sm transition-colors ${
                    status === s ? 'bg-indigo-electric/10 text-indigo-electric' : 'text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-outline-variant/30 p-4">
            <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Statistics</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-on-surface-variant">
                <span>Total Entries</span>
                <span className="text-on-surface font-medium">{entries.length}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Characters</span>
                <span className="text-on-surface font-medium">{entries.filter((e) => e.data?.type === 'Character').length}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Locations</span>
                <span className="text-on-surface font-medium">{entries.filter((e) => e.data?.type === 'Location').length}</span>
              </div>
            </div>
          </div>
        </div>

      {/* Right Area - Bento Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-[48px] text-outline mb-2">menu_book</span>
            <p className="text-sm text-on-surface-variant">No entries found. Create your first codex entry to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEntries.map((entry) => {
              const data = entry.data || {};
              const isEditing = editingId === entry.id;
              const isLarge = data.type === 'Faction' || data.type === 'Location';
              const relatedEdges = getRelatedEdges(entry.id);
              const relatedCount = relatedEdges.length;

              return (
                <div
                  key={entry.id}
                  className={`glass-card rounded-xl relative group overflow-hidden cursor-pointer ${isLarge ? 'md:col-span-2 xl:col-span-2 min-h-[280px]' : 'min-h-[220px]'}`}
                  onClick={isEditing ? undefined : () => setSelectedEntry(entry)}
                >
                  {/* Background Image for Location */}
                  {data.type === 'Location' && (
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500 bg-cover bg-center" style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuATd8HsjZ3wjVZGRpUHiFVE9D0epu0X8xrUprw_U2mW1NUZSJ_xmrNnUiGIn1MjDWi5j9zn9To0N9J0XS_0Q1NSv2mtZeQjvou-5bM5oYOydKKpFOvZeGi47_KlkCZrIpm6na-wOPuCseLhUm1m9qQ9vsLNXyRXaAlFHa7XHyGALreSPKf-H4K15QPgZ5yfpp7JsJy48uQD4zdVkkyARaqoQ40EEF1Em06llX2gGxnXn9MnWtHug982UA')` }} />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryBg(data.type)} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  {data.type === 'Location' && <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />}
                  <div className="relative z-10 flex flex-col h-full p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant/20">
                          <span className={`material-symbols-outlined ${getCategoryColor(data.type)}`}>{getCategoryIcon(data.type)}</span>
                        </div>
                        <span className={`font-label-sm text-label-sm tracking-widest uppercase ${getCategoryColor(data.type)}`}>
                          {data.type || 'Entry'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(entry, 'label', data.label); }} className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-white/5 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(entry); }} className="text-on-surface-variant hover:text-red-400 p-1.5 rounded-md hover:bg-white/5 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div ref={editCardRef} className="space-y-3">
                        <input
                          autoFocus
                          value={draft[entry.id]?.label || ''}
                          onChange={(e) => startEdit(entry, 'label', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && commit(entry)}
                          placeholder="Entry title"
                          className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                        />
                        <select
                          value={draft[entry.id]?.status || 'Draft'}
                          onChange={(e) => startEdit(entry, 'status', e.target.value)}
                          onBlur={() => commit(entry)}
                          className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <textarea
                          value={draft[entry.id]?.description || ''}
                          onChange={(e) => startEdit(entry, 'description', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && commit(entry)}
                          placeholder="Summary"
                          rows={2}
                          className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                        />
                        <textarea
                          value={draft[entry.id]?.notes || ''}
                          onChange={(e) => startEdit(entry, 'notes', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && commit(entry)}
                          placeholder="Detailed notes..."
                          rows={4}
                          className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                        />
                        {data.type === 'Faction' && (
                          <textarea
                            value={draft[entry.id]?.keyFigures || ''}
                            onChange={(e) => startEdit(entry, 'keyFigures', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && commit(entry)}
                            placeholder="Key Figures (one per line)"
                            rows={3}
                            className="w-full bg-black/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                          />
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => commit(entry)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-sm font-label-md transition-colors">Save</button>
                          <button onClick={() => { setEditingId(null); setDraft((prev) => { const next = { ...prev }; delete next[entry.id]; return next; }); }} className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30 text-sm font-label-md transition-colors">Cancel</button>
                        </div>
                      </div>
                      ) : (
                        <>
                          <h3 className="font-headline-md text-headline-md text-on-surface mb-2 group-hover:text-primary transition-colors">{data.label || 'Untitled'}</h3>
                          {data.description && (
                            <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 mb-4 flex-grow">{data.description}</p>
                          )}
                          {data.notes && (
                            <p className="font-body-md text-body-md text-on-surface-variant/70 line-clamp-3 mb-4 whitespace-pre-wrap flex-grow">{data.notes}</p>
                          )}
                          {data.type === 'Faction' && data.keyFigures && (
                            <div className="mb-4">
                              <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Key Figures</h4>
                              <div className="flex flex-wrap gap-2">
                                {data.keyFigures.split('\n').filter(Boolean).map((figure, i) => (
                                  <span key={i} className="px-2 py-1 rounded bg-white/5 border border-outline-variant/10 text-[13px] text-on-surface-variant">
                                    {figure}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10 mt-auto">
                          <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] uppercase tracking-wider border ${getStatusColor(data.status)}`}>
                            {data.status || 'Draft'}
                          </span>
                          <div className="flex items-center gap-2">
                            {relatedCount > 0 && (
                              <span className="flex items-center gap-1 font-label-sm text-label-sm text-outline">
                                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                                {relatedCount}
                              </span>
                            )}
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (() => {
        const data = selectedEntry.data || {};
        const relatedEdges = getRelatedEdges(selectedEntry.id);
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg glass-panel rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-1">{data.label || 'Untitled'}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] uppercase tracking-wider border ${getStatusColor(data.status)}`}>
                        {data.status || 'Draft'}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] uppercase tracking-wider border ${getCategoryColor(data.type)} border-current`}>
                        {data.type || 'Entry'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedEntry(null)} className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-white/5 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                {data.description && (
                  <div className="border-t border-outline-variant/20 pt-4 mb-4">
                    <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Summary</h4>
                    <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">{data.description}</p>
                  </div>
                )}
                {data.notes && (
                  <div className="border-t border-outline-variant/20 pt-4 mb-4">
                    <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Notes</h4>
                    <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">{data.notes}</p>
                  </div>
                )}
                {data.type === 'Faction' && data.keyFigures && (
                  <div className="border-t border-outline-variant/20 pt-4 mb-4">
                    <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Key Figures</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.keyFigures.split('\n').filter(Boolean).map((figure, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-outline-variant/10 text-[14px] text-on-surface">
                          {figure}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {relatedEdges.length > 0 && (
                  <div className="border-t border-outline-variant/20 pt-4">
                    <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Relationships</h4>
                    <div className="flex flex-col gap-2">
                      {relatedEdges.map((edge) => {
                        const otherId = edge.source === selectedEntry.id ? edge.target : edge.source;
                        const other = getRelatedNode(otherId);
                        if (!other) return null;
                        const direction = edge.source === selectedEntry.id ? 'Outgoing' : 'Incoming';
                        return (
                          <div key={edge.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-outline-variant/10">
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined text-[16px] ${getCategoryColor(other.data?.type)}`}>{getCategoryIcon(other.data?.type)}</span>
                              <span className="font-body-md text-[14px] text-on-surface">{other.data?.label || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-label-sm text-[11px] text-outline px-2 py-1 bg-black/20 rounded-md">{edge.label || 'Connected'}</span>
                              <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">{direction}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const entry = entries.find((e) => e.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelDelete} />
            <div className="relative w-full max-w-md glass-panel rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden">
              <div className="p-6">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Confirm Delete</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Delete "{entry?.data?.label || 'this entry'}"? This cannot be undone.
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
