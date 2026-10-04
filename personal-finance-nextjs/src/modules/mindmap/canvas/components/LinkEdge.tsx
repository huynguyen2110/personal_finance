'use client';

import { BaseEdge, EdgeLabelRenderer, EdgeProps } from '@xyflow/react';
import { memo } from 'react';

/**
 * Cạnh liên kết ngang: cung cong vòng ra bên phải hai nhánh (giống "relationship" của XMind)
 * để không cắt ngang các node cùng cột như đường thẳng dọc.
 */
function LinkEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  label,
}: EdgeProps) {
  const bulge = 60 + Math.min(220, Math.abs(targetY - sourceY) * 0.35);
  const path = `M ${sourceX},${sourceY} C ${sourceX + bulge},${sourceY} ${targetX + bulge},${targetY} ${targetX},${targetY}`;
  // Điểm giữa đường cong bậc 3 (t = 0.5)
  const labelX = (sourceX + targetX) / 2 + 0.75 * bulge;
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
