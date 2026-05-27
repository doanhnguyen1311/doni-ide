import { Sidebar } from './components/Sidebar';
import { ProjectFilesPanel } from './components/ProjectFilesPanel';
import { PromptWorkspace } from './features/PromptWorkspace';
import { useProjectStore } from './stores/projectStore';

export function App(): JSX.Element {
  const selectedFolder = useProjectStore((state) => state.selectedFolder);
  const scannedFiles = useProjectStore((state) => state.scannedFiles);

  return (
    <div className="relative h-screen overflow-hidden bg-ink text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,138,61,0.18),transparent_32%),radial-gradient(circle_at_70%_20%,rgba(76,224,179,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
      <div className="relative flex h-full">
        <Sidebar selectedFolder={selectedFolder} fileCount={scannedFiles.length} />
        <PromptWorkspace />
        <ProjectFilesPanel files={scannedFiles} />
      </div>
    </div>
  );
}