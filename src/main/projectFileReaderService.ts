import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectContextFile, ReadProjectFilesResponse } from '../shared/types';

const MAX_FILES = 10;
const MAX_FILE_BYTES = 80 * 1024;
const MAX_TOTAL_BYTES = 300 * 1024;
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.html', '.md', '.yml', '.yaml']);

function validateRelativePath(relativePath: string): string {
  if (!relativePath.trim()) {
    throw new Error('A selected file path is empty.');
  }
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Absolute paths are not allowed: ${relativePath}`);
  }

  const normalized = path.normalize(relativePath);
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    throw new Error(`File is outside the selected project folder: ${relativePath}`);
  }

  return normalized;
}

function isInsideProject(projectRoot: string, absolutePath: string): boolean {
  const relativeFromRoot = path.relative(projectRoot, absolutePath);
  return relativeFromRoot === '' || (!relativeFromRoot.startsWith(`..${path.sep}`) && relativeFromRoot !== '..' && !path.isAbsolute(relativeFromRoot));
}

function resolveInsideProject(projectRoot: string, relativePath: string): { absolutePath: string; normalizedRelativePath: string } {
  const normalizedRelativePath = validateRelativePath(relativePath);
  const absolutePath = path.resolve(projectRoot, normalizedRelativePath);

  if (!isInsideProject(projectRoot, absolutePath)) {
    throw new Error(`File is outside the selected project folder: ${relativePath}`);
  }

  return { absolutePath, normalizedRelativePath };
}

function fileAccessError(error: unknown, relativePath: string, fallback: string): Error {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (code === 'ENOENT' || code === 'ENOTDIR') {
    return new Error(`Context file does not exist: ${relativePath}`);
  }
  if (code === 'EACCES' || code === 'EPERM') {
    return new Error(`Permission denied while reading context file: ${relativePath}`);
  }
  return new Error(fallback);
}

async function readFileSnippet(absolutePath: string, maxBytes: number): Promise<Buffer> {
  const handle = await fs.open(absolutePath, 'r');
  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export async function readProjectFiles(folderPath: string, relativePaths: string[]): Promise<ReadProjectFilesResponse> {
  if (!folderPath.trim()) {
    throw new Error('Open a project folder before loading context files.');
  }
  if (relativePaths.length === 0) {
    return { files: [] };
  }
  if (relativePaths.length > MAX_FILES) {
    throw new Error(`Select at most ${MAX_FILES} context files.`);
  }

  let totalBytes = 0;
  const files: ProjectContextFile[] = [];
  const projectRoot = path.resolve(folderPath);
  const projectRootRealPath = await fs.realpath(projectRoot);

  for (const relativePath of relativePaths) {
    const { absolutePath, normalizedRelativePath } = resolveInsideProject(projectRoot, relativePath);
    const extension = path.extname(normalizedRelativePath).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension)) {
      throw new Error(`Unsupported context file type: ${relativePath}`);
    }

    let stat;
    try {
      stat = await fs.stat(absolutePath);
    } catch (error) {
      throw fileAccessError(error, relativePath, `Unable to inspect context file: ${relativePath}`);
    }
    if (!stat.isFile()) {
      throw new Error(`Context path is not a file: ${relativePath}`);
    }

    let realFilePath;
    try {
      realFilePath = await fs.realpath(absolutePath);
    } catch (error) {
      throw fileAccessError(error, relativePath, `Unable to resolve context file: ${relativePath}`);
    }
    if (!isInsideProject(projectRootRealPath, realFilePath)) {
      throw new Error(`File is outside the selected project folder: ${relativePath}`);
    }

    const remainingBytes = MAX_TOTAL_BYTES - totalBytes;
    if (remainingBytes <= 0) {
      break;
    }

    const readLimit = Math.min(MAX_FILE_BYTES, remainingBytes);
    let contentBuffer;
    try {
      contentBuffer = await readFileSnippet(realFilePath, readLimit);
    } catch (error) {
      throw fileAccessError(error, relativePath, `Unable to read context file: ${relativePath}`);
    }
    const truncated = stat.size > contentBuffer.byteLength;
    totalBytes += contentBuffer.byteLength;

    files.push({
      relativePath: normalizedRelativePath.split(path.sep).join('/'),
      content: contentBuffer.toString('utf8'),
      size: stat.size,
      truncated,
    });
  }

  return { files };
}
