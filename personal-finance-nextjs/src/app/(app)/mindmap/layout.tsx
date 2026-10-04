import '@xyflow/react/dist/style.css';
import '@/modules/mindmap/mindmap.css';
import MainLayout from '@/components/layout/MainLayout';

export default function MindmapLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout moduleId="mindmap">{children}</MainLayout>;
}
