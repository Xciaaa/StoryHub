import { useState, useMemo, useEffect, useRef } from 'react';
import { API_BASE } from '../lib/api';
import SearchInput from './SearchInput';

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
        role: '',
        affiliation: '',
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
              className="px-4 py-2 rounded-lg bg-indigo-electric text-on-primary hover:bg-indigo-electric/90 font-label-md text-label-md transition-colors flex items-center gap-2 shadow-lg shadow-indigo-electric/20"
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
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search the codex..."
                type="codex"
                className="w-full"
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
                        <button onClick={(e) => { e.stopPropagation(); startEdit(entry, 'label', data.label); }} className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-surface-variant/10 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(entry); }} className="text-on-surface-variant hover:text-red-400 p-1.5 rounded-md hover:bg-surface-variant/10 transition-colors">
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
                            className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none"
                          />
                          <div className="space-y-2">
                            <label className="block font-label-sm text-[12px] font-semibold text-outline mb-2 uppercase tracking-wide">Image</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const formData = new FormData();
                                formData.append('image', file);
                                try {
                                  const result = await api.uploadImage(formData);
                                  if (result?.url) startEdit(entry, 'image', result.url);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="block text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-electric/20 file:text-indigo-electric hover:file:bg-indigo-electric/30"
                            />
                            {draft[entry.id]?.image && (
                              <img src={`${API_BASE}${draft[entry.id].image}`} alt="Preview" className="mt-2 h-24 w-auto rounded-lg border border-outline-variant/30 object-cover" />
                            )}
                          </div>
                          <select
                            value={draft[entry.id]?.status || 'Draft'}
                            onChange={(e) => startEdit(entry, 'status', e.target.value)}
                            onBlur={() => commit(entry)}
                            className="w-full bg-surface-container/40 border border-outline-variant/50 rounded-xl px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all cursor-pointer"
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
                          className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                        />
                        <textarea
                          value={draft[entry.id]?.notes || ''}
                          onChange={(e) => startEdit(entry, 'notes', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && commit(entry)}
                          placeholder="Detailed notes..."
                          rows={4}
                          className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                        />
                        {data.type === 'Character' && (
                          <>
                            <input value={draft[entry.id]?.role || ''} onChange={(e) => startEdit(entry, 'role', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Role / Title" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <input value={draft[entry.id]?.age || ''} onChange={(e) => startEdit(entry, 'age', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Age" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <input value={draft[entry.id]?.affiliation || ''} onChange={(e) => startEdit(entry, 'affiliation', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Affiliation" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <textarea value={draft[entry.id]?.keyItems || ''} onChange={(e) => startEdit(entry, 'keyItems', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Key Items (one per line)" rows={2} className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none" />
                          </>
                        )}
                        {data.type === 'Faction' && (
                          <>
                            <input value={draft[entry.id]?.leader || ''} onChange={(e) => startEdit(entry, 'leader', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Leader" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <input value={draft[entry.id]?.size || ''} onChange={(e) => startEdit(entry, 'size', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Size" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <input value={draft[entry.id]?.influence || ''} onChange={(e) => startEdit(entry, 'influence', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Influence" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <textarea value={draft[entry.id]?.keyFigures || ''} onChange={(e) => startEdit(entry, 'keyFigures', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Key Figures (one per line)" rows={3} className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none" />
                          </>
                        )}
                        {data.type === 'Location' && (
                          <>
                            <input value={draft[entry.id]?.title || ''} onChange={(e) => startEdit(entry, 'title', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Title (e.g. Biggest city)" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <input value={draft[entry.id]?.ruler || ''} onChange={(e) => startEdit(entry, 'ruler', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Ruler" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <select value={draft[entry.id]?.status || 'Active'} onChange={(e) => startEdit(entry, 'status', e.target.value)} onBlur={() => commit(entry)} className="w-full bg-surface-container/40 border border-outline-variant/50 rounded-xl px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all cursor-pointer">
                              {['Active', 'Disbanded', 'Hidden', 'Weakened'].map((s) => (<option key={s} value={s}>{s}</option>))}
                            </select>
                          </>
                        )}
                        {data.type === 'Plot Event' && (
                          <>
                            <input value={draft[entry.id]?.title || ''} onChange={(e) => startEdit(entry, 'title', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Title" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <input value={draft[entry.id]?.timing || ''} onChange={(e) => startEdit(entry, 'timing', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Timing" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <input value={draft[entry.id]?.spark || ''} onChange={(e) => startEdit(entry, 'spark', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Spark / Cause" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <textarea value={draft[entry.id]?.keyCharacters || ''} onChange={(e) => startEdit(entry, 'keyCharacters', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Key Characters (one per line)" rows={3} className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none" />
                          </>
                        )}
                        {data.type === 'Item' && (
                          <>
                            <input value={draft[entry.id]?.itemType || ''} onChange={(e) => startEdit(entry, 'itemType', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Item Type" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <input value={draft[entry.id]?.rarity || ''} onChange={(e) => startEdit(entry, 'rarity', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Rarity" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <input value={draft[entry.id]?.owner || ''} onChange={(e) => startEdit(entry, 'owner', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Owner" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <textarea value={draft[entry.id]?.abilities || ''} onChange={(e) => startEdit(entry, 'abilities', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Abilities" rows={2} className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none" />
                          </>
                        )}
                        {data.type === 'Lore' && (
                          <>
                            <input value={draft[entry.id]?.category || ''} onChange={(e) => startEdit(entry, 'category', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Category" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <select value={draft[entry.id]?.status || 'Known'} onChange={(e) => startEdit(entry, 'status', e.target.value)} onBlur={() => commit(entry)} className="w-full bg-surface-container/40 border border-outline-variant/50 rounded-xl px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all cursor-pointer">
                              {['Known', 'Lost', 'Secret', 'Legendary'].map((s) => (<option key={s} value={s}>{s}</option>))}
                            </select>
                          </>
                        )}
                        {data.type === 'Theme' && (
                          <>
                            <input value={draft[entry.id]?.theme || ''} onChange={(e) => startEdit(entry, 'theme', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Theme" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                            <input value={draft[entry.id]?.opposingForce || ''} onChange={(e) => startEdit(entry, 'opposingForce', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(entry)} placeholder="Opposing Force" className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none" />
                          </>
                        )}
                        {data.type === 'Faction' && (
                          <textarea
                            value={draft[entry.id]?.keyFigures || ''}
                            onChange={(e) => startEdit(entry, 'keyFigures', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && commit(entry)}
                            placeholder="Key Figures (one per line)"
                            rows={3}
                            className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                          />
                        )}
                        {data.type === 'Plot Event' && (
                          <textarea
                            value={draft[entry.id]?.keyCharacters || ''}
                            onChange={(e) => startEdit(entry, 'keyCharacters', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && commit(entry)}
                            placeholder="Key Characters & Their Role to the Plot Event&#10;e.g. Aldric - Proclaims the ordeal"
                            rows={3}
                            className="w-full bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none resize-none"
                          />
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => commit(entry)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-on-primary hover:bg-emerald-500 text-sm font-label-md transition-colors">Save</button>
                          <button onClick={() => { setEditingId(null); setDraft((prev) => { const next = { ...prev }; delete next[entry.id]; return next; }); }} className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30 text-sm font-label-md transition-colors">Cancel</button>
                        </div>
                      </div>
                      ) : (
                        <>
                          <h3 className="font-headline-md text-headline-md text-on-surface mb-2 group-hover:text-primary transition-colors">{data.label || 'Untitled'}</h3>
                           {data.image && (
                              <img src={`${API_BASE}${data.image}`} alt={data.label || 'Entry'} className="mb-4 h-32 w-full object-cover rounded-lg border border-outline-variant/20" />
                            )}
                           {data.type === 'Character' && data.role && (
                             <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 italic">{data.role}{data.age ? `, ${data.age}` : ''}{data.affiliation ? ` — ${data.affiliation}` : ''}</p>
                           )}
                           {data.type === 'Faction' && data.leader && (
                             <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 italic">Led by {data.leader}{data.size ? ` • ${data.size} members` : ''}</p>
                           )}
                           {data.type === 'Location' && data.title && (
                             <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 italic">{data.title}{data.ruler ? ` • Ruled by ${data.ruler}` : ''}</p>
                           )}
                           {data.type === 'Plot Event' && data.timing && (
                             <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 italic">{data.timing}</p>
                           )}
                           {data.type === 'Item' && data.itemType && (
                             <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 italic">{data.itemType}{data.rarity ? ` • ${data.rarity}` : ''}</p>
                           )}
                           {data.type === 'Lore' && data.category && (
                             <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 italic">{data.category}</p>
                           )}
                           {data.type === 'Theme' && data.theme && (
                             <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 italic">{data.theme}</p>
                           )}
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
                                   <span key={i} className="px-2 py-1 rounded bg-surface-variant/10 border border-outline-variant/10 text-[13px] text-on-surface-variant">
                                     {figure}
                                   </span>
                                 ))}
                               </div>
                             </div>
                           )}
                           {(data.role || data.affiliation) && (
                             <div className="flex flex-wrap gap-2 mb-4">
                               {data.role && (
                                 <span className="px-2 py-0.5 rounded bg-violet-glow/10 border border-violet-glow/20 text-[11px] text-violet-glow font-label-sm">
                                   {data.role}
                                 </span>
                               )}
                               {data.affiliation && (
                                 <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400 font-label-sm">
                                   {data.affiliation}
                                 </span>
                               )}
                             </div>
                           )}
                           {data.type === 'Plot Event' && data.keyCharacters && (
                             <div className="mb-4">
                               <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Key Characters & Their Role</h4>
                               <p className="font-body-md text-[13px] leading-relaxed text-on-surface-variant whitespace-pre-wrap">
                                 {data.keyCharacters}
                               </p>
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
            <div className="absolute inset-0 bg-surface-container/60 backdrop-blur-sm" />
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
                  <button onClick={() => setSelectedEntry(null)} className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-md hover:bg-surface-variant/10 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                {data.image && (
                  <img src={`${API_BASE}${data.image}`} alt={data.label || 'Entry'} className="w-full h-48 object-cover rounded-lg border border-outline-variant/20 mb-4" />
                )}
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
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-surface-variant/10 border border-outline-variant/10 text-[14px] text-on-surface">
                          {figure}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.type === 'Plot Event' && data.keyCharacters && (
                  <div className="border-t border-outline-variant/20 pt-4 mb-4">
                    <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Key Characters & Their Role</h4>
                    <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">{data.keyCharacters}</p>
                  </div>
                )}
                {(data.role || data.affiliation) && (
                  <div className="border-t border-outline-variant/20 pt-4 mb-4">
                    <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Role & Affiliation</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.role && (
                        <span className="px-3 py-1.5 rounded-lg bg-violet-glow/10 border border-violet-glow/20 text-[14px] text-violet-glow font-label-sm">
                          {data.role}
                        </span>
                      )}
                      {data.affiliation && (
                        <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[14px] text-blue-400 font-label-sm">
                          {data.affiliation}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {(data.type === 'Character' && (data.role || data.age || data.status || data.affiliation || data.keyItems)) ||
                 (data.type === 'Faction' && (data.leader || data.size || data.influence || data.status)) ||
                 (data.type === 'Location' && (data.title || data.ruler || data.status)) ||
                 (data.type === 'Plot Event' && (data.title || data.timing || data.spark || data.keyCharacters)) ||
                 (data.type === 'Item' && (data.itemType || data.rarity || data.owner || data.abilities)) ||
                 (data.type === 'Lore' && (data.category || data.status)) ||
                 (data.type === 'Theme' && (data.theme || data.opposingForce)) ? (
                  <div className="border-t border-outline-variant/20 pt-4 mb-4">
                    <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-3">Attributes</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {data.type === 'Character' && (
                        <>
                          {data.role && <div><span className="font-label-sm text-[11px] text-outline uppercase">Role</span><p className="font-body-sm text-body-sm text-on-surface">{data.role}</p></div>}
                          {data.age && <div><span className="font-label-sm text-[11px] text-outline uppercase">Age</span><p className="font-body-sm text-body-sm text-on-surface">{data.age}</p></div>}
                          {data.affiliation && <div><span className="font-label-sm text-[11px] text-outline uppercase">Affiliation</span><p className="font-body-sm text-body-sm text-on-surface">{data.affiliation}</p></div>}
                          {data.status && <div><span className="font-label-sm text-[11px] text-outline uppercase">Status</span><p className="font-body-sm text-body-sm text-on-surface">{data.status}</p></div>}
                          {data.keyItems && <div className="col-span-2"><span className="font-label-sm text-[11px] text-outline uppercase">Key Items</span><p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap">{data.keyItems}</p></div>}
                        </>
                      )}
                      {data.type === 'Faction' && (
                        <>
                          {data.leader && <div><span className="font-label-sm text-[11px] text-outline uppercase">Leader</span><p className="font-body-sm text-body-sm text-on-surface">{data.leader}</p></div>}
                          {data.size && <div><span className="font-label-sm text-[11px] text-outline uppercase">Size</span><p className="font-body-sm text-body-sm text-on-surface">{data.size}</p></div>}
                          {data.influence && <div><span className="font-label-sm text-[11px] text-outline uppercase">Influence</span><p className="font-body-sm text-body-sm text-on-surface">{data.influence}</p></div>}
                          {data.status && <div><span className="font-label-sm text-[11px] text-outline uppercase">Status</span><p className="font-body-sm text-body-sm text-on-surface">{data.status}</p></div>}
                        </>
                      )}
                      {data.type === 'Location' && (
                        <>
                          {data.title && <div><span className="font-label-sm text-[11px] text-outline uppercase">Title</span><p className="font-body-sm text-body-sm text-on-surface">{data.title}</p></div>}
                          {data.ruler && <div><span className="font-label-sm text-[11px] text-outline uppercase">Ruler</span><p className="font-body-sm text-body-sm text-on-surface">{data.ruler}</p></div>}
                          {data.status && <div><span className="font-label-sm text-[11px] text-outline uppercase">Status</span><p className="font-body-sm text-body-sm text-on-surface">{data.status}</p></div>}
                        </>
                      )}
                      {data.type === 'Plot Event' && (
                        <>
                          {data.title && <div><span className="font-label-sm text-[11px] text-outline uppercase">Title</span><p className="font-body-sm text-body-sm text-on-surface">{data.title}</p></div>}
                          {data.timing && <div><span className="font-label-sm text-[11px] text-outline uppercase">Timing</span><p className="font-body-sm text-body-sm text-on-surface">{data.timing}</p></div>}
                          {data.spark && <div><span className="font-label-sm text-[11px] text-outline uppercase">Spark</span><p className="font-body-sm text-body-sm text-on-surface">{data.spark}</p></div>}
                          {data.keyCharacters && <div className="col-span-2"><span className="font-label-sm text-[11px] text-outline uppercase">Key Characters</span><p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap">{data.keyCharacters}</p></div>}
                        </>
                      )}
                      {data.type === 'Item' && (
                        <>
                          {data.itemType && <div><span className="font-label-sm text-[11px] text-outline uppercase">Type</span><p className="font-body-sm text-body-sm text-on-surface">{data.itemType}</p></div>}
                          {data.rarity && <div><span className="font-label-sm text-[11px] text-outline uppercase">Rarity</span><p className="font-body-sm text-body-sm text-on-surface">{data.rarity}</p></div>}
                          {data.owner && <div><span className="font-label-sm text-[11px] text-outline uppercase">Owner</span><p className="font-body-sm text-body-sm text-on-surface">{data.owner}</p></div>}
                          {data.abilities && <div className="col-span-2"><span className="font-label-sm text-[11px] text-outline uppercase">Abilities</span><p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap">{data.abilities}</p></div>}
                        </>
                      )}
                      {data.type === 'Lore' && (
                        <>
                          {data.category && <div><span className="font-label-sm text-[11px] text-outline uppercase">Category</span><p className="font-body-sm text-body-sm text-on-surface">{data.category}</p></div>}
                          {data.status && <div><span className="font-label-sm text-[11px] text-outline uppercase">Status</span><p className="font-body-sm text-body-sm text-on-surface">{data.status}</p></div>}
                        </>
                      )}
                      {data.type === 'Theme' && (
                        <>
                          {data.theme && <div><span className="font-label-sm text-[11px] text-outline uppercase">Theme</span><p className="font-body-sm text-body-sm text-on-surface">{data.theme}</p></div>}
                          {data.opposingForce && <div><span className="font-label-sm text-[11px] text-outline uppercase">Opposing Force</span><p className="font-body-sm text-body-sm text-on-surface">{data.opposingForce}</p></div>}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
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
                          <div key={edge.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-variant/10 border border-outline-variant/10">
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined text-[16px] ${getCategoryColor(other.data?.type)}`}>{getCategoryIcon(other.data?.type)}</span>
                              <span className="font-body-md text-[14px] text-on-surface">{other.data?.label || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-label-sm text-[11px] text-outline px-2 py-1 bg-surface-container/20 rounded-md">{edge.label || 'Connected'}</span>
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
            <div className="absolute inset-0 bg-surface-container/60 backdrop-blur-sm" onClick={cancelDelete} />
            <div className="relative w-full max-w-md glass-panel rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden">
              <div className="p-6">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Confirm Delete</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Delete "{entry?.data?.label || 'this entry'}"? This cannot be undone.
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
