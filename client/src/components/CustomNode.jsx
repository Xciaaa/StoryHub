import { memo, useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';

const TYPES = ['Character', 'Location', 'Plot Event', 'Lore', 'Item', 'Faction', 'Theme'];

const typeStyles = {
  Character: 'bg-violet-glow/20 text-violet-glow border-violet-glow/30',
  Location: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Plot Event': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Lore: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  Item: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Faction: 'bg-red-500/20 text-red-400 border-red-500/30',
  Theme: 'bg-indigo-electric/20 text-indigo-electric border-indigo-electric/30',
  default: 'bg-surface-tint/20 text-surface-tint border-outline-variant/30',
};

function CustomNode({ data, selected }) {
  const safeData = data || {};
  const readOnly = safeData.readOnly;
  const typeClass = typeStyles[safeData.type] || typeStyles.default;

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');

  const startEdit = useCallback((field, value) => {
    setEditing(field);
    setDraft(value || '');
  }, []);

  const commit = useCallback((onChange) => {
    if (!draft.trim()) {
      setEditing(null);
      return;
    }
    onChange(draft.trim());
    setEditing(null);
  }, [draft]);

  return (
    <div
      className={`node-card rounded-xl p-5 cursor-pointer w-[280px] backdrop-blur-md bg-surface-container/80 border ${
        selected ? 'active border-indigo-500/60 shadow-[0_0_20px_rgba(79,70,229,0.25)]' : 'border-outline-variant/40 hover:border-outline-variant/70 hover:shadow-lg'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        {editing === 'type' && !readOnly ? (
          <select
            autoFocus
            className="px-2.5 py-0.5 rounded-lg font-label-sm text-[10px] font-semibold uppercase tracking-widest border bg-surface-container/40 text-on-surface outline-none cursor-pointer focus:border-primary-container transition-all"
            value={draft}
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              safeData.onChange?.('type', next);
              setEditing(null);
            }}
            onBlur={() => setEditing(null)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            onClick={() => !readOnly && startEdit('type', safeData.type)}
            className={`px-2.5 py-0.5 rounded font-label-sm text-[10px] font-semibold uppercase tracking-widest border ${typeClass} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {safeData.type || 'Entity'}
          </button>
        )}

        {editing === 'label' && !readOnly ? (
          <input
            autoFocus
            className="bg-surface-container/40 border border-outline-variant/50 rounded px-2 py-1 text-[14px] text-on-surface outline-none w-[140px]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit((v) => safeData.onChange?.('label', v))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit((v) => safeData.onChange?.('label', v));
              }
            }}
          />
        ) : (
          !readOnly && (
            <button
              type="button"
              onClick={() => safeData.onDelete?.()}
              className="material-symbols-outlined text-outline text-[18px] hover:text-on-surface transition-colors"
            >
              delete
            </button>
          )
        )}
      </div>

      {editing === 'label' && !readOnly ? null : (
        <h3
          role="button"
          onDoubleClick={() => !readOnly && startEdit('label', safeData.label)}
          className="font-headline-md text-[22px] font-semibold text-on-surface mb-2 truncate"
          title={readOnly ? '' : "Double-click to rename"}
        >
          {safeData.label || 'Untitled'}
        </h3>
      )}

      {safeData.description && (
        <div className="mt-2 pt-2 border-t border-outline-variant/20">
          <p className="font-body-md text-[13px] leading-relaxed text-on-surface-variant line-clamp-3">
            {(() => {
              const sentences = safeData.description.match(/[^.!?]+[.!?]+/g) || [safeData.description];
              return sentences.slice(0, 3).join(' ');
            })()}
          </p>
        </div>
      )}
      {(safeData.role || safeData.affiliation) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {safeData.role && (
            <span className="px-2 py-0.5 rounded bg-violet-glow/10 border border-violet-glow/20 text-[11px] text-violet-glow font-label-sm">
              {safeData.role}
            </span>
          )}
          {safeData.affiliation && (
            <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400 font-label-sm">
              {safeData.affiliation}
            </span>
          )}
        </div>
      )}
      {safeData.type === 'Plot Event' && safeData.keyCharacters && (
        <div className="mt-3 pt-2 border-t border-outline-variant/20">
          <p className="font-body-md text-[12px] leading-relaxed text-on-surface-variant whitespace-pre-wrap">
            {safeData.keyCharacters}
          </p>
        </div>
      )}
      <Handle type="target" position={Position.Top} id="target-top" className="w-4 h-4 !bg-indigo-electric !border-2 !border-white/80" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="w-4 h-4 !bg-indigo-electric !border-2 !border-white/80" />
      <Handle type="target" position={Position.Left} id="target-left" className="w-4 h-4 !bg-indigo-electric !border-2 !border-white/80" />
      <Handle type="target" position={Position.Right} id="target-right" className="w-4 h-4 !bg-indigo-electric !border-2 !border-white/80" />
      <Handle type="source" position={Position.Left} id="source-left" className="w-3 h-3 !bg-violet-glow !border-2 !border-white/80" />
      <Handle type="source" position={Position.Right} id="source-right" className="w-3 h-3 !bg-violet-glow !border-2 !border-white/80" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="w-3 h-3 !bg-violet-glow !border-2 !border-white/80" />
    </div>
  );
}

export default memo(CustomNode);
