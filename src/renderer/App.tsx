import { Sidebar } from './components/Sidebar';
import { ProjectFilesPanel } from './components/ProjectFilesPanel';
import { PromptWorkspace } from './features/PromptWorkspace';
import { useProjectStore } from './stores/projectStore';

export function App(): JSX.Element {
  const selectedFolder = useProjectStore((state) => state.selectedFolder);
  const scannedFiles = useProjectStore((state) => state.scannedFiles);
  const projectSummary = useProjectStore((state) => state.projectSummary);

  return (
    <div className="relative h-screen overflow-hidden bg-ink text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
      <div className="relative flex h-full">
        <Sidebar selectedFolder={selectedFolder} fileCount={scannedFiles.length} files={scannedFiles} projectSummary={projectSummary} />
        <PromptWorkspace />
        <ProjectFilesPanel selectedFolder={selectedFolder} files={scannedFiles} />
      </div>
    </div>
  );
}
