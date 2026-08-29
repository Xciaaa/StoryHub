import { useMemo, useRef, useState, useEffect } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from 'reactflow';

const RELATIONSHIP_COLORS = {
  wears: '#6366f1',
  covets: '#ef4444',
  commands: '#3b82f6',
  rules: '#10b981',
  leads: '#f59e0b',
  seeks: '#8b5cf6',
  plots: '#ec4899',
  sabotages: '#ef4444',
  carries: '#f59e0b',
  proclaims: '#3b82f6',
  answers: '#10b981',
  protects: '#6366f1',
  destroys: '#ef4444',
  funds: '#f59e0b',
  owes: '#ec4899',
  embodies: '#8b5cf6',
  rejects: '#ef4444',
  sacrifices: '#10b981',
  betrays: '#ef4444',
  loves: '#ec4899',
  hates: '#ef4444',
  fears: '#f59e0b',
  trusts: '#10b981',
  mentors: '#6366f1',
  serves: '#3b82f6',
  default: '#6366f1',
};

function getRelationshipColor(label) {
  if (!label) return RELATIONSHIP_COLORS.default;
  const lower = label.toLowerCase().trim();
  for (const [key, color] of Object.entries(RELATIONSHIP_COLORS)) {
    if (key !== 'default' && lower.includes(key)) {
      return color;
    }
  }
  return RELATIONSHIP_COLORS.default;
}

function getControlPoints(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition) {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = Math.max(50, Math.min(120, dist * 0.35));

  let sourceControlX = sourceX;
  let sourceControlY = sourceY;
  let targetControlX = targetX;
  let targetControlY = targetY;

  if (sourcePosition === 'right') sourceControlX += offset;
  else if (sourcePosition === 'left') sourceControlX -= offset;
  else if (sourcePosition === 'top') sourceControlY -= offset;
  else if (sourcePosition === 'bottom') sourceControlY += offset;

  if (targetPosition === 'right') targetControlX += offset;
  else if (targetPosition === 'left') targetControlX -= offset;
  else if (targetPosition === 'top') targetControlY -= offset;
  else if (targetPosition === 'bottom') targetControlY += offset;

  return { sourceControlX, sourceControlY, targetControlX, targetControlY };
}

function getBezierPoint(t, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0x + 3 * mt2 * t * p1x + 3 * mt * t2 * p2x + t3 * p3x,
    y: mt3 * p0y + 3 * mt2 * t * p1y + 3 * mt * t2 * p2y + t3 * p3y,
  };
}

function getBezierTangent(t, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  const tx = 3 * mt2 * (p1x - p0x) + 6 * mt * t * (p2x - p1x) + 3 * t2 * (p3x - p2x);
  const ty = 3 * mt2 * (p1y - p0y) + 6 * mt * t * (p2y - p1y) + 3 * t2 * (p3y - p2y);

  const len = Math.sqrt(tx * tx + ty * ty) || 1;
  return { x: tx / len, y: ty / len };
}

export default function StoryEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  style,
  selected,
}) {
  const [edgePath] = useMemo(() => {
    return getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]);

  const { sourceControlX, sourceControlY, targetControlX, targetControlY } = useMemo(
    () => getControlPoints(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition]
  );

  const relationshipLabel = label || data?.label || '';
  const relationshipColor = getRelationshipColor(relationshipLabel);
  const customColor = data?.customColor;
  const strokeColor = customColor || relationshipColor;

  const [t, setT] = useState(0.5);
  const isDraggingRef = useRef(false);
  const rafRef = useRef(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, t: 0.5 });

  const point = useMemo(
    () => getBezierPoint(t, sourceX, sourceY, sourceControlX, sourceControlY, targetControlX, targetControlY, targetX, targetY),
    [t, sourceX, sourceY, sourceControlX, sourceControlY, targetControlX, targetControlY, targetX, targetY]
  );

  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, t };

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        const dx = moveEvent.clientX - dragStartRef.current.mouseX;
        const dy = moveEvent.clientY - dragStartRef.current.mouseY;

        const tangent = getBezierTangent(
          dragStartRef.current.t,
          sourceX,
          sourceY,
          sourceControlX,
          sourceControlY,
          targetControlX,
          targetControlY,
          targetX,
          targetY
        );

        const dist = Math.sqrt((targetX - sourceX) ** 2 + (targetY - sourceY) ** 2) || 500;
        const movement = dx * tangent.x + dy * tangent.y;
        const dt = movement / dist;

        const newT = Math.max(0.05, Math.min(0.95, dragStartRef.current.t + dt));
        setT(newT);
        rafRef.current = null;
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: selected ? 3 : 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
            pointerEvents: 'all',
            cursor: isDraggingRef.current ? 'grabbing' : 'grab',
            zIndex: 1000,
          }}
          onMouseDown={handleMouseDown}
          className="react-flow__edge-label"
        >
          <div
            style={{
              backgroundColor: 'rgba(12, 19, 36, 0.85)',
              border: `1px solid ${strokeColor}40`,
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 11,
              color: '#c7c4d7',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {relationshipLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
