import { useState, useMemo } from 'react';

const TABS = ['Overview', 'Attributes', 'Relationships', 'Timeline'];

export default function InspectorSidebar({ node, edges, allNodes, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isPinned, setIsPinned] = useState(false);

  const data = node?.data || {};
  const nodeEdges = useMemo(
    () => edges.filter((e) => e.source === node.id || e.target === node.id),
    [edges, node.id]
  );

  const relatedNodes = useMemo(() => {
    const map = new Map();
    nodeEdges.forEach((e) => {
      const otherId = e.source === node.id ? e.target : e.source;
      const other = allNodes.find((n) => n.id === otherId);
      if (other) map.set(other.id, { node: other, edge: e });
    });
    return Array.from(map.values());
  }, [nodeEdges, allNodes, node.id]);

  const plotEvents = useMemo(
    () =>
      relatedNodes
        .filter((r) => r.node.data?.type === 'Plot Event')
        .sort((a, b) => (a.node.position?.y || 0) - (b.node.position?.y || 0)),
    [relatedNodes]
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <div className="flex flex-col gap-4">
            <div className="group">
              <label className="block font-label-sm text-[12px] font-semibold text-outline mb-2 uppercase tracking-wide">Biography</label>
              <textarea
                value={data.description || ''}
                onChange={(e) => onUpdate(node.id, 'description', e.target.value)}
                onBlur={(e) => onUpdate(node.id, 'description', e.target.value)}
                placeholder="No description yet."
                rows={8}
                className="w-full bg-surface-container/20 border border-outline-variant/30 rounded-lg text-on-surface font-body-md p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner resize-none"
              />
            </div>
            {(data.keyCharacters || data.role || data.affiliation) && (
              <div className="border-t border-outline-variant/20 pt-4">
                <h4 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Details</h4>
                <div className="flex flex-wrap gap-2 mb-3">
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
                {data.keyCharacters && (
                  <div>
                    <h5 className="font-label-sm text-[11px] text-outline uppercase tracking-wider mb-1">Key Characters</h5>
                    <p className="font-body-md text-[13px] leading-relaxed text-on-surface-variant whitespace-pre-wrap">{data.keyCharacters}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'Attributes':
        return (
          <div className="flex flex-col gap-3">
            {data.type === 'Character' && (
              <>
                <AttributeRow label="Title" value={data.role} onUpdate={(v) => onUpdate(node.id, 'role', v)} />
                <AttributeRow label="Age" value={data.age} onUpdate={(v) => onUpdate(node.id, 'age', v)} type="number" />
                <AttributeRow label="Affiliation" value={data.affiliation} onUpdate={(v) => onUpdate(node.id, 'affiliation', v)} />
                <AttributeSelect label="Status" value={data.status || 'Alive'} onUpdate={(v) => onUpdate(node.id, 'status', v)} options={['Alive', 'Deceased', 'Sick', 'Unknown']} />
                <AttributeRow label="Key Items" value={data.keyItems} onUpdate={(v) => onUpdate(node.id, 'keyItems', v)} />
              </>
            )}

            {data.type === 'Faction' && (
              <>
                <AttributeRow label="Leader" value={data.leader} onUpdate={(v) => onUpdate(node.id, 'leader', v)} />
                <AttributeRow label="Size" value={data.size} onUpdate={(v) => onUpdate(node.id, 'size', v)} />
                <AttributeRow label="Influence" value={data.influence} onUpdate={(v) => onUpdate(node.id, 'influence', v)} />
                <AttributeSelect label="Status" value={data.status || 'Active'} onUpdate={(v) => onUpdate(node.id, 'status', v)} options={['Active', 'Disbanded', 'Hidden', 'Weakened']} />
              </>
            )}

            {data.type === 'Location' && (
              <>
                <AttributeRow label="Title" value={data.title} onUpdate={(v) => onUpdate(node.id, 'title', v)} placeholder="Biggest city, etc." />
                <AttributeRow label="Ruler / King" value={data.ruler} onUpdate={(v) => onUpdate(node.id, 'ruler', v)} />
                <AttributeSelect label="Status" value={data.status || 'Ancient'} onUpdate={(v) => onUpdate(node.id, 'status', v)} options={['Ancient', 'Thriving', 'Ruined', 'Hidden', 'Contested']} />
                <AttributeRow label="Climate" value={data.climate} onUpdate={(v) => onUpdate(node.id, 'climate', v)} placeholder="Temperate, Arid, etc." />
                <AttributeRow label="Population" value={data.population} onUpdate={(v) => onUpdate(node.id, 'population', v)} placeholder="50,000" />
              </>
            )}

            {data.type === 'Plot Event' && (
              <>
                <AttributeRow label="Title" value={data.title} onUpdate={(v) => onUpdate(node.id, 'title', v)} placeholder="Event title" />
                <AttributeRow label="When it happens" value={data.timing} onUpdate={(v) => onUpdate(node.id, 'timing', v)} placeholder="e.g. During the War of False Sun" />
                <AttributeRow label="What sparks it" value={data.spark} onUpdate={(v) => onUpdate(node.id, 'spark', v)} placeholder="The inciting incident" />
                <AttributeRow label="Key Characters" value={data.keyCharacters} onUpdate={(v) => onUpdate(node.id, 'keyCharacters', v)} />
              </>
            )}

            {data.type === 'Item' && (
              <>
                <AttributeRow label="Type" value={data.itemType} onUpdate={(v) => onUpdate(node.id, 'itemType', v)} placeholder="Weapon, Artifact, etc." />
                <AttributeRow label="Rarity" value={data.rarity} onUpdate={(v) => onUpdate(node.id, 'rarity', v)} placeholder="Common, Rare, Legendary" />
                <AttributeRow label="Owner" value={data.owner} onUpdate={(v) => onUpdate(node.id, 'owner', v)} />
                <AttributeRow label="Abilities / Power" value={data.abilities} onUpdate={(v) => onUpdate(node.id, 'abilities', v)} placeholder="Special powers or effects" />
              </>
            )}

            {data.type === 'Lore' && (
              <>
                <AttributeRow label="Category" value={data.category} onUpdate={(v) => onUpdate(node.id, 'category', v)} placeholder="History, Myth, Prophecy" />
                <AttributeSelect label="Status" value={data.status || 'Known'} onUpdate={(v) => onUpdate(node.id, 'status', v)} options={['Known', 'Lost', 'Secret', 'Legendary']} />
              </>
            )}

            {data.type === 'Theme' && (
              <>
                <AttributeRow label="Theme" value={data.theme} onUpdate={(v) => onUpdate(node.id, 'theme', v)} placeholder="Central theme name" />
                <AttributeRow label="Opposing Force" value={data.opposingForce} onUpdate={(v) => onUpdate(node.id, 'opposingForce', v)} />
              </>
            )}

            {!data.type && (
              <p className="text-sm text-on-surface-variant">Select an entity type to see relevant attributes.</p>
            )}
          </div>
        );

      case 'Relationships':
        return (
          <div className="flex flex-col gap-3">
            {relatedNodes.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No connections yet.</p>
            ) : (
              relatedNodes.map(({ node: other, edge }) => {
                const direction = edge.source === node.id ? 'Outgoing' : 'Incoming';
                const relationLabel = edge.label || 'Connected';
                const otherType = other.data?.type || 'Entity';
                const categoryColors = {
                  Character: 'text-violet-glow',
                  Location: 'text-blue-400',
                  'Plot Event': 'text-emerald-400',
                  Lore: 'text-teal-400',
                  Item: 'text-amber-400',
                  Faction: 'text-red-400',
                  Theme: 'text-indigo-electric',
                };
                const color = categoryColors[otherType] || 'text-outline';
                return (
                  <div key={edge.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-variant/10 hover:bg-surface-variant/20 border border-outline-variant/10 hover:border-outline-variant/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/20">
                        <span className={`material-symbols-outlined text-[18px] ${color}`}>account_tree</span>
                      </div>
                      <div>
                        <p className="font-body-md text-[14px] font-medium text-on-surface">{other.data?.label || 'Untitled'}</p>
                        <p className="font-label-sm text-[11px] text-outline">{otherType}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-label-sm text-[11px] text-outline px-2 py-1 bg-surface-container/20 rounded-md">{relationLabel}</span>
                      <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">{direction}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );

      case 'Timeline':
        return (
          <div className="flex flex-col gap-3">
            {plotEvents.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No plot events linked to this entity yet.</p>
            ) : (
              plotEvents.map(({ node: evt }) => (
                <div key={evt.id} className="p-3 rounded-lg bg-surface-variant/10 border border-outline-variant/10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">event_note</span>
                    <p className="font-body-md text-[14px] font-medium text-on-surface">{evt.data?.label || 'Untitled'}</p>
                  </div>
                  {evt.data?.keyCharacters && (
                    <p className="font-body-md text-[12px] text-on-surface-variant line-clamp-2 mt-1">{evt.data.keyCharacters}</p>
                  )}
                </div>
              ))
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <aside className="h-full w-full flex flex-col">
       <div className="p-3 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container/40">
         <div className="flex items-center gap-1.5">
           <span className="px-2 py-0.5 rounded bg-violet-glow/20 text-violet-glow font-label-sm text-[10px] font-semibold uppercase tracking-widest border border-violet-glow/30">
             {data.type || 'Entity'}
           </span>
           <span className="px-2 py-0.5 rounded border border-outline-variant/50 text-on-surface-variant font-label-sm text-[10px] font-medium tracking-wide">
             {data.status || 'Draft'}
           </span>
         </div>
         <div className="flex items-center gap-0.5">
           <button
             onClick={() => setIsPinned(!isPinned)}
             className={`p-1 rounded-md transition-colors ${isPinned ? 'text-indigo-electric bg-indigo-electric/10' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/20'}`}
             title={isPinned ? 'Unpin' : 'Pin inspector'}
           >
             <span className="material-symbols-outlined text-[16px]">{isPinned ? 'push_pin' : 'push_pin'}</span>
           </button>
           <button
             onClick={onClose}
             className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-variant/20 transition-colors"
           >
             <span className="material-symbols-outlined">close</span>
           </button>
         </div>
       </div>

       <div className="px-4 pt-3 border-b border-outline-variant/20">
         <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1 truncate">{data.label || 'Untitled'}</h2>
         <p className="font-label-md text-[12px] text-outline font-medium">ID: {node.id}</p>
       </div>

       <div className="flex border-b border-outline-variant/20 bg-surface-container/20">
         {TABS.map((tab) => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={`flex-1 px-2 py-2.5 font-label-sm text-[10px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
               activeTab === tab
                 ? 'text-indigo-electric border-indigo-electric bg-surface-container/40'
                 : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-variant/10'
             }`}
           >
             {tab}
           </button>
         ))}
       </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">{renderContent()}</div>
    </aside>
  );
}

function AttributeRow({ label, value, onUpdate, type = 'text', placeholder = '' }) {
  return (
    <div className="flex justify-between items-center gap-2 p-3 rounded-lg bg-surface-variant/10 border border-outline-variant/10">
      <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider shrink-0">{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onUpdate(e.target.value)}
        onBlur={(e) => onUpdate(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent text-on-surface font-body-md text-[14px] outline-none text-right w-24"
      />
    </div>
  );
}

function AttributeSelect({ label, value, onUpdate, options }) {
  return (
    <div className="flex justify-between items-center gap-2 p-3 rounded-lg bg-surface-variant/10 border border-outline-variant/10">
      <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider shrink-0">{label}</span>
      <select
        value={value}
        onChange={(e) => onUpdate(e.target.value)}
        onBlur={(e) => onUpdate(e.target.value)}
        className="bg-surface-container/40 text-on-surface font-body-md text-[14px] outline-none cursor-pointer text-right border border-outline-variant/30 rounded px-2 py-1 focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-surface-container text-on-surface">{opt}</option>
        ))}
      </select>
    </div>
  );
}
