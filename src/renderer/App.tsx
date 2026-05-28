import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { ProjectFilesPanel } from './components/ProjectFilesPanel';
import { PromptWorkspace } from './features/PromptWorkspace';
import { useProjectStore } from './stores/projectStore';

type AppView = 'workspace' | 'settings';

export function App(): JSX.Element {
  const [activeView, setActiveView] = useState<AppView>('workspace');
  const selectedFolder = useProjectStore((state) => state.selectedFolder);
  const scannedFiles = useProjectStore((state) => state.scannedFiles);
  const projectSummary = useProjectStore((state) => state.projectSummary);

  return (
    <div className="relative h-screen overflow-hidden bg-ink text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
      <div className="app-titlebar fixed inset-x-0 top-0 z-30 h-9 border-b border-white/10 bg-ink/95" />
      <div className="relative flex h-full pt-9">
        <Sidebar
          selectedFolder={selectedFolder}
          fileCount={scannedFiles.length}
          files={scannedFiles}
          projectSummary={projectSummary}
          activeView={activeView}
          onOpenWorkspace={() => setActiveView('workspace')}
          onOpenSettings={() => setActiveView('settings')}
        />
        {activeView === 'settings' ? (
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <section className="mx-auto max-w-4xl">
              <SettingsPanel />
            </section>
          </main>
        ) : (
          <PromptWorkspace />
        )}
        <ProjectFilesPanel selectedFolder={selectedFolder} files={scannedFiles} />
      </div>
    </div>
  );
}
