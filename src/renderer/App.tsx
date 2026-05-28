import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { ProjectFilesPanel } from './components/ProjectFilesPanel';
import { PromptWorkspace } from './features/PromptWorkspace';
import { useProjectStore } from './stores/projectStore';

type AppView = 'workspace' | 'settings';

const clampPanelWidth = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function App(): JSX.Element {
  const [activeView, setActiveView] = useState<AppView>('workspace');
  const [leftWidth, setLeftWidth] = useState(272);
  const [rightWidth, setRightWidth] = useState(304);
  const selectedFolder = useProjectStore((state) => state.selectedFolder);
  const scannedFiles = useProjectStore((state) => state.scannedFiles);
  const projectSummary = useProjectStore((state) => state.projectSummary);

  const startLeftResize = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = leftWidth;
    const onMove = (moveEvent: PointerEvent): void => {
      setLeftWidth(clampPanelWidth(startWidth + moveEvent.clientX - startX, 220, 360));
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startRightResize = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = rightWidth;
    const onMove = (moveEvent: PointerEvent): void => {
      setRightWidth(clampPanelWidth(startWidth - (moveEvent.clientX - startX), 260, 420));
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="relative h-screen overflow-hidden bg-ink text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
      <div className="app-titlebar fixed inset-x-0 top-0 z-30 h-9 border-b border-white/10 bg-ink/95" />
      <div className="relative flex h-full pt-9">
        <Sidebar
          width={leftWidth}
          selectedFolder={selectedFolder}
          fileCount={scannedFiles.length}
          files={scannedFiles}
          projectSummary={projectSummary}
          activeView={activeView}
          onOpenWorkspace={() => setActiveView('workspace')}
          onOpenSettings={() => setActiveView('settings')}
        />
        <button
          type="button"
          aria-label="Resize left sidebar"
          onPointerDown={startLeftResize}
          className="group relative z-20 hidden w-2 shrink-0 cursor-col-resize border-r border-white/10 bg-panel/50 transition hover:border-skyglass/40 hover:bg-skyglass/10 md:block"
        >
          <span className="absolute left-1/2 top-1/2 grid h-11 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-ink/95 text-[10px] font-black leading-none text-slate-500 shadow-glow transition group-hover:border-skyglass/40 group-hover:text-skyglass">
            ::
          </span>
        </button>
        {activeView === 'settings' ? (
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <section className="mx-auto max-w-4xl">
              <SettingsPanel />
            </section>
          </main>
        ) : (
          <PromptWorkspace />
        )}
        <button
          type="button"
          aria-label="Resize right sidebar"
          onPointerDown={startRightResize}
          className="group relative z-20 hidden w-2 shrink-0 cursor-col-resize border-l border-white/10 bg-panel/50 transition hover:border-skyglass/40 hover:bg-skyglass/10 xl:block"
        >
          <span className="absolute left-1/2 top-1/2 grid h-11 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-ink/95 text-[10px] font-black leading-none text-slate-500 shadow-glow transition group-hover:border-skyglass/40 group-hover:text-skyglass">
            ::
          </span>
        </button>
        <ProjectFilesPanel selectedFolder={selectedFolder} files={scannedFiles} width={rightWidth} />
      </div>
    </div>
  );
}
