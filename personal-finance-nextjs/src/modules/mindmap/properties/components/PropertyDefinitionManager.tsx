'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/modules/mindmap/components/ui/Button';
import { Dialog } from '@/modules/mindmap/components/ui/Dialog';
import { Input } from '@/modules/mindmap/components/ui/Input';
import { extractErrorMessage } from '@/modules/mindmap/lib/api';
import {
  PropertyDefinition,
  PropertyRole,
  PropertyType,
  PropertyUnit,
  ROLE_LABELS,
  ROLE_TYPE,
  SelectOption,
  UNIT_LABELS,
} from '../api';
import {
  useCreateProperty,
  useDeleteProperty,
  useProperties,
  useUpdateProperty,
} from '../hooks';
import { SelectOptionsEditor } from './SelectOptionsEditor';

const TYPE_LABELS: Record<PropertyType, string> = {
  text: 'Văn bản',
  number: 'Số',
  boolean: 'Có / Không',
  date: 'Ngày',
  select: 'Lựa chọn',
};

const selectClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500';
const inlineSelectClass =
  'rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-600 outline-none focus:border-violet-500';

/** Các role hợp với kiểu dữ liệu (priority/difficulty → select, time/cost → number). */
function rolesFor(type: PropertyType): PropertyRole[] {
  return (Object.keys(ROLE_TYPE) as PropertyRole[]).filter(
    (r) => ROLE_TYPE[r] === type,
  );
}

function DefinitionRow({
  mindmapId,
  def,
  takenRoles,
}: {
  mindmapId: number;
  def: PropertyDefinition;
  takenRoles: Set<PropertyRole>;
}) {
  const update = useUpdateProperty(mindmapId);
  const remove = useDeleteProperty(mindmapId);
  const [editingOptions, setEditingOptions] = useState<SelectOption[] | null>(
    null,
  );
  const roles = rolesFor(def.type);

  return (
    <li className="space-y-2 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{def.name}</p>
          <p className="truncate text-xs text-gray-400">
            {TYPE_LABELS[def.type]}
            {def.type === 'select' &&
              ` · ${(def.options ?? [])
                .map((o) =>
                  o.weight !== undefined ? `${o.label} (${o.weight})` : o.label,
                )
                .join(', ')}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {def.type === 'number' && (
            <select
              value={def.unit ?? ''}
              title="Đơn vị"
              onChange={(e) =>
                update.mutate({
                  propId: def.id,
                  unit: (e.target.value || null) as PropertyUnit | null,
                })
              }
              className={inlineSelectClass}
            >
              <option value="">Không đơn vị</option>
              {Object.entries(UNIT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
          {roles.length > 0 && (
            <select
              value={def.role ?? ''}
              title="Dùng trong kế hoạch như"
              onChange={(e) =>
                update.mutate({
                  propId: def.id,
                  role: (e.target.value || null) as PropertyRole | null,
                })
              }
              className={inlineSelectClass}
            >
              <option value="">Không dùng trong kế hoạch</option>
              {roles.map((r) => (
                <option
                  key={r}
                  value={r}
                  disabled={r !== def.role && takenRoles.has(r)}
                >
                  Kế hoạch: {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          )}
          {def.type === 'select' && (
            <button
              onClick={() =>
                setEditingOptions(editingOptions ? null : (def.options ?? []))
              }
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Sửa lựa chọn"
            >
              <Pencil size={13} />
            </button>
          )}
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
            title="Xóa"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {editingOptions && (
        <div className="space-y-2 rounded-lg bg-gray-50 p-2.5">
          <SelectOptionsEditor
            options={editingOptions}
            onChange={setEditingOptions}
            showWeight={def.role !== null}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditingOptions(null)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={
                update.isPending ||
                editingOptions.filter((o) => o.label.trim()).length === 0
              }
              onClick={() =>
                update.mutate(
                  {
                    propId: def.id,
                    options: editingOptions.filter((o) => o.label.trim()),
                  },
                  { onSuccess: () => setEditingOptions(null) },
                )
              }
            >
              Lưu
            </Button>
          </div>
        </div>
      )}

      {update.isError && (
        <p className="text-xs text-red-600">
          {extractErrorMessage(update.error)}
        </p>
      )}
    </li>
  );
}

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

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('select');
  const [role, setRole] = useState<PropertyRole | ''>('');
  const [unit, setUnit] = useState<PropertyUnit | ''>('');
  const [options, setOptions] = useState<SelectOption[]>([]);

  const takenRoles = new Set(
    (definitions ?? []).flatMap((d) => (d.role ? [d.role] : [])),
  );
  const availableRoles = rolesFor(type).filter((r) => !takenRoles.has(r));

  const reset = () => {
    setAdding(false);
    setName('');
    setType('select');
    setRole('');
    setUnit('');
    setOptions([]);
  };

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
        role: role || null,
        unit: type === 'number' ? unit || null : null,
      },
      { onSuccess: reset },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title="Thuộc tính" wide>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Thuộc tính áp dụng cho mọi lĩnh vực và hành động. Ưu tiên, Độ khó,
          Thời gian, Chi phí đã có sẵn; có thể thêm thuộc tính riêng (VD: Làm
          hằng ngày). Thuộc tính gán vai trò <b>Kế hoạch</b> được dùng khi chấm
          điểm hành động.
        </p>

        {definitions && definitions.length > 0 ? (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {definitions.map((def) => (
              <DefinitionRow
                key={def.id}
                mindmapId={mindmapId}
                def={def}
                takenRoles={takenRoles}
              />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Kiểu dữ liệu
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as PropertyType);
                    setRole('');
                    setUnit('');
                  }}
                  className={selectClass}
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Dùng trong kế hoạch như
                </label>
                <select
                  value={role}
                  disabled={availableRoles.length === 0}
                  onChange={(e) => setRole(e.target.value as PropertyRole | '')}
                  className={selectClass}
                >
                  <option value="">Không</option>
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {type === 'number' && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Đơn vị
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as PropertyUnit | '')}
                  className={selectClass}
                >
                  <option value="">Không</option>
                  {Object.entries(UNIT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {type === 'select' && (
              <SelectOptionsEditor
                options={options}
                onChange={setOptions}
                showWeight={role !== ''}
              />
            )}
            {create.isError && (
              <p className="text-sm text-red-600">
                {extractErrorMessage(create.error)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={reset}>
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
