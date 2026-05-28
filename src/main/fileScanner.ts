import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectFile, ProjectSummary, ScanProjectResult } from '../shared/types';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.doni',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '.vite',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.scss',
  '.html',
  '.md',
]);

const MAX_FILES = 1200;
const MAX_FILE_SIZE_BYTES = 512 * 1024;

function hasFile(files: ProjectFile[], matcher: RegExp): boolean {
  return files.some((file) => matcher.test(file.relativePath.replace(/\\/g, '/')));
}

function detectProjectSummary(files: ProjectFile[]): ProjectSummary {
  const paths = files.map((file) => file.relativePath.replace(/\\/g, '/'));
  const packageJson = paths.includes('package.json');
  const technologies = new Set<string>();
  const frameworks = new Set<string>();

  if (hasFile(files, /\.(ts|tsx)$/)) technologies.add('TypeScript');
  if (hasFile(files, /\.(js|jsx)$/)) technologies.add('JavaScript');
  if (hasFile(files, /\.tsx$/) || hasFile(files, /src\/main\.tsx$/)) frameworks.add('React');
  if (hasFile(files, /(^|\/)vite\.config\.(ts|js)$/)) frameworks.add('Vite');
  if (hasFile(files, /(^|\/)(main|preload)\/.*\.ts$/) || hasFile(files, /electron/i)) frameworks.add('Electron');
  if (hasFile(files, /(^|\/)(server|app|index)\.(ts|js)$/) && packageJson) frameworks.add('Node.js');
  if (hasFile(files, /(^|\/)(routes|controllers|middleware)\//) || hasFile(files, /express/i)) frameworks.add('Express');
  if (hasFile(files, /(^|\/)prisma\/schema\.prisma$/)) frameworks.add('Prisma');
  if (packageJson) technologies.add('npm package');

  const entryPoints = paths.filter((filePath) =>
    /(^|\/)(src\/renderer\/main\.tsx|src\/main\/main\.ts|src\/preload\/preload\.ts|src\/main\.tsx|src\/main\.ts|src\/index\.(ts|tsx|js|jsx)|vite\.config\.ts|package\.json)$/.test(filePath),
  );
  const importantFiles = paths.filter((filePath) =>
    /(^|\/)(package\.json|vite\.config\.ts|tsconfig\.json|tailwind\.config\.js|src\/renderer\/App\.tsx|src\/main\/main\.ts|src\/shared\/types\.ts)$/.test(filePath),
  );
  const topDirs = Array.from(new Set(paths.map((filePath) => filePath.split('/')[0]).filter(Boolean))).slice(0, 10);

  const runFlow = [
    frameworks.has('Electron') ? 'Electron main process boots the desktop window and owns file/command IPC.' : 'Node/runtime entry owns backend behavior.',
    frameworks.has('React') ? 'React renderer provides the desktop UI.' : 'UI framework was not detected from scanned files.',
    frameworks.has('Vite') ? 'Vite serves/builds the renderer bundle.' : 'Build tool was inferred from package metadata/files.',
    'Project files are scanned, selected context files are sent to AI, generated patches are reviewed before apply.',
  ];

  return {
    technologies: Array.from(technologies),
    frameworks: Array.from(frameworks),
    entryPoints: entryPoints.slice(0, 12),
    importantFiles: importantFiles.slice(0, 16),
    structure: topDirs,
    runFlow,
  };
}

export async function scanProject(folderPath: string): Promise<ScanProjectResult> {
  const files: ProjectFile[] = [];
  let limitReached = false;
  const projectRoot = path.resolve(folderPath);
  const projectRootRealPath = await fs.realpath(projectRoot);

  function isInsideProject(realPath: string): boolean {
    return realPath === projectRootRealPath || realPath.startsWith(`${projectRootRealPath}${path.sep}`);
  }

  async function walk(currentPath: string): Promise<void> {
    if (limitReached) {
      return;
    }

    let currentRealPath;
    try {
      currentRealPath = await fs.realpath(currentPath);
    } catch {
      return;
    }
    if (!isInsideProject(currentRealPath)) {
      return;
    }

    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (limitReached) {
        return;
      }

      const absolutePath = path.join(currentPath, entry.name);

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          await walk(absolutePath);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        continue;
      }

      let stat;
      try {
        stat = await fs.lstat(absolutePath);
      } catch {
        continue;
      }
      if (!stat.isFile()) {
        continue;
      }
      if (stat.size > MAX_FILE_SIZE_BYTES) {
        continue;
      }

      const fileRealPath = await fs.realpath(absolutePath).catch(() => null);
      if (!fileRealPath || !isInsideProject(fileRealPath)) {
        continue;
      }

      files.push({
        relativePath: path.relative(projectRoot, absolutePath),
        absolutePath,
        extension,
        size: stat.size,
      });

      if (files.length >= MAX_FILES) {
        limitReached = true;
      }
    }
  }

  await walk(folderPath);

  return {
    folderPath,
    files,
    limitReached,
    summary: detectProjectSummary(files),
  };
}
