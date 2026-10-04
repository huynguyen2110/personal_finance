'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { Dialog } from '@/modules/mindmap/components/ui/Dialog';
import { Input } from '@/modules/mindmap/components/ui/Input';
import { extractErrorMessage } from '@/modules/mindmap/lib/api';
import { PropertyType, SelectOption } from '../api';
import {
  useCreateProperty,
  useDeleteProperty,
  useProperties,
} from '../hooks';
import { SelectOptionsEditor } from './SelectOptionsEditor';

const TYPE_LABELS: Record<PropertyType, string> = {
  text: 'Văn bản',
  number: 'Số',
  boolean: 'Có / Không',
  date: 'Ngày',
  select: 'Lựa chọn',
};

export function PropertyDefinitionManager({
  mindmapId,
  open,
  onClose,
}: {
  mindmapId: number;
  open: boolean;
  onClose: () => void;
}) {
  const { data: definitions } = useProperties(mindmapId);
  const create = useCreateProperty(mindmapId);
  const remove = useDeleteProperty(mindmapId);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('select');
  const [options, setOptions] = useState<SelectOption[]>([]);

  const submit = () => {
    if (!name.trim()) return;
    create.mutate(
      {
        name: name.trim(),
        type,
        options:
          type === 'select'
            ? options.filter((o) => o.label.trim())
            : undefined,
      },
      {
        onSuccess: () => {
          setAdding(false);
          setName('');
          setType('select');
          setOptions([]);
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title="Thuộc tính của mindmap" wide>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Thuộc tính áp dụng cho mọi node trong mindmap này — giống database
          của Notion (VD: Độ khó, Thời gian hoàn thành, Làm hàng ngày…).
        </p>

        {definitions && definitions.length > 0 ? (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {definitions.map((def) => (
              <li
                key={def.id}
                className="flex items-center justify-between px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{def.name}</p>
                  <p className="text-xs text-gray-400">
                    {TYPE_LABELS[def.type]}
                    {def.type === 'select' &&
                      ` · ${(def.options ?? []).map((o) => o.label).join(', ')}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Xóa thuộc tính "${def.name}"? Giá trị đã gán trên các node sẽ mất.`,
                      )
                    ) {
                      remove.mutate(def.id);
                    }
                  }}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400">
            Chưa có thuộc tính nào
          </p>
        )}

        {adding ? (
          <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3">
            <Input
              label="Tên thuộc tính"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Độ khó"
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Kiểu dữ liệu
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PropertyType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {type === 'select' && (
              <SelectOptionsEditor options={options} onChange={setOptions} />
            )}
            {create.isError && (
              <p className="text-sm text-red-600">
                {extractErrorMessage(create.error)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={
                  create.isPending ||
                  !name.trim() ||
                  (type === 'select' &&
                    options.filter((o) => o.label.trim()).length === 0)
                }
              >
                Thêm
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus size={15} /> Thêm thuộc tính
          </Button>
        )}
      </div>
    </Dialog>
  );
}
