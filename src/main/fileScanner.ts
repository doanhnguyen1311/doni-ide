import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectFile, ScanProjectResult } from '../shared/types';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
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

export async function scanProject(folderPath: string): Promise<ScanProjectResult> {
  const files: ProjectFile[] = [];
  let limitReached = false;

  async function walk(currentPath: string): Promise<void> {
    if (limitReached) {
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

      const stat = await fs.stat(absolutePath);
      if (stat.size > MAX_FILE_SIZE_BYTES) {
        continue;
      }

      files.push({
        relativePath: path.relative(folderPath, absolutePath),
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
  };
}