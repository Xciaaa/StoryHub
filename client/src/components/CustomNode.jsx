import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const typeStyles = {
  Character: 'bg-violet-glow/20 text-violet-glow border-violet-glow/30',
  Location: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Plot Event': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  default: 'bg-surface-tint/20 text-surface-tint border-outline-variant/30',
};

function CustomNode({ data, selected }) {
  const safeData = data || {};
  const typeClass = typeStyles[safeData.type] || typeStyles.default;

  return (
    <div
      className={`node-card rounded-xl p-5 cursor-pointer w-[280px] ${
        selected ? 'active' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2.5 py-0.5 rounded font-label-sm text-[10px] font-semibold uppercase tracking-widest border ${typeClass}`}>
          {safeData.type || 'Entity'}
        </span>
        <span className="material-symbols-outlined text-outline text-[18px] hover:text-on-surface transition-colors">
          more_horiz
        </span>
      </div>
      <h3 className="font-headline-md text-[22px] font-semibold text-on-surface mb-2 truncate">
        {safeData.label || 'Untitled'}
      </h3>
      {safeData.description && (
        <p className="font-body-md text-[14px] leading-relaxed text-on-surface-variant line-clamp-3">
          {safeData.description}
        </p>
      )}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-indigo-electric" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-indigo-electric" />
    </div>
  );
}

export default memo(CustomNode);
