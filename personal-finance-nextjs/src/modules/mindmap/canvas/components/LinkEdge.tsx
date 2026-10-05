'use client';

import { BaseEdge, EdgeLabelRenderer, EdgeProps, Position } from '@xyflow/react';
import { memo } from 'react';

/**
 * Cạnh liên kết ngang: cung cong vòng ra phía ngoài của hai nhánh (giống "relationship" của XMind)
 * để không cắt ngang các node cùng cột như đường thẳng dọc. Nhánh bên trái thì cong sang trái.
 */
function LinkEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
}: EdgeProps) {
  const bulge = 60 + Math.min(220, Math.abs(targetY - sourceY) * 0.35);
  const sDir = sourcePosition === Position.Left ? -1 : 1;
  const tDir = targetPosition === Position.Left ? -1 : 1;
  const path = `M ${sourceX},${sourceY} C ${sourceX + sDir * bulge},${sourceY} ${targetX + tDir * bulge},${targetY} ${targetX},${targetY}`;
  // Điểm giữa đường cong bậc 3 (t = 0.5)
  const labelX = (sourceX + targetX) / 2 + 0.375 * (sDir + tDir) * bulge;
  const labelY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={style}
        markerEnd={markerEnd}
        interactionWidth={16}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute max-w-40 truncate rounded bg-white/90 px-1.5 py-px text-[10px] shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              color: style?.stroke as string | undefined,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const LinkEdge = memo(LinkEdgeComponent);
