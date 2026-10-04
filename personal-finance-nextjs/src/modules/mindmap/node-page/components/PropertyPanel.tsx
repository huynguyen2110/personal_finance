'use client';

import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { PropertyDefinitionManager } from '@/modules/mindmap/properties/components/PropertyDefinitionManager';
import { PropertyValueInput } from '@/modules/mindmap/properties/components/PropertyValueInput';
import { useProperties, useSetNodeValues } from '@/modules/mindmap/properties/hooks';

export function PropertyPanel({
  mindmapId,
  nodeId,
  values,
}: {
  mindmapId: number;
  nodeId: number;
  values: { propertyDefinitionId: number; value: unknown }[];
}) {
  const { data: definitions } = useProperties(mindmapId);
  const setValues = useSetNodeValues(mindmapId, nodeId);
  const [managerOpen, setManagerOpen] = useState(false);

  const valueOf = (defId: number) =>
    values.find((v) => v.propertyDefinitionId === defId)?.value ?? null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Thuộc tính</h3>
        <button
          onClick={() => setManagerOpen(true)}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          <Settings2 size={13} /> Quản lý
        </button>
      </div>

      {!definitions || definitions.length === 0 ? (
        <p className="text-sm text-gray-400">
          Chưa có thuộc tính. Bấm &quot;Quản lý&quot; để tạo (VD: Độ khó, Làm
          hàng ngày…).
        </p>
      ) : (
        <div className="space-y-2.5">
          {definitions.map((def) => (
            <div key={def.id} className="grid grid-cols-[140px_1fr] items-center gap-2">
              <span className="truncate text-sm text-gray-500">{def.name}</span>
              <PropertyValueInput
                definition={def}
                value={valueOf(def.id)}
                onChange={(value) => setValues.mutate({ [def.id]: value })}
              />
            </div>
          ))}
        </div>
      )}

      <PropertyDefinitionManager
        mindmapId={mindmapId}
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
      />
    </div>
  );
}
