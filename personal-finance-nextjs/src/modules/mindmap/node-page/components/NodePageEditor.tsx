'use client';

import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { SaveStatus, useSaveNodePage } from '../hooks';

export function NodePageEditor({
  mindmapId,
  nodeId,
  initialContent,
}: {
  mindmapId: number;
  nodeId: number;
  initialContent: object | null;
}) {
  const { save, status } = useSaveNodePage(mindmapId, nodeId);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder:
          'Viết nội dung chi tiết cho nhánh này… (giống một trang Notion)',
      }),
    ],
    content: initialContent ?? undefined,
    onUpdate: ({ editor }) => save(editor.getJSON()),
  });

  return (
    <div className="relative">
      <SaveIndicator status={status} />
      <EditorContent editor={editor} className="tiptap prose max-w-none" />
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span className="absolute -top-8 right-0 text-xs text-gray-400">
      {status === 'saving' ? 'Đang lưu…' : 'Đã lưu ✓'}
    </span>
  );
}
