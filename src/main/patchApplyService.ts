import { app } from 'electron';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getDoniHomePath } from './doniHome';
import type {
  ApplyPatchResponse,
  PatchApplyFileResult,
  PatchFileChange,
  PatchPlan,
  PatchRollbackFileResult,
  RollbackPatchResponse,
} from '../shared/types';

interface BackupMetadataFile {
  relativePath: string;
  originalContent: string;
  targetAbsolutePath: string;
}

interface BackupMetadata {
  backupId: string;
  projectPath: string;
  createdAt: string;
  files: BackupMetadataFile[];
}

function getBackupsRoot(): string {
  if (!app || typeof app.getPath !== 'function') {
    return path.join(os.tmpdir(), 'doni-patch-backups');
  }
  return path.join(getDoniHomePath(), 'patch-backups');
}

function createBackupId(): string {
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 10)}`;
}

function validateBackupId(backupId: string): void {
  if (!/^[a-zA-Z0-9_.-]+$/.test(backupId)) {
    throw new Error('Invalid backup id.');
  }
}

function isInsidePath(parentPath: string, childPath: string): boolean {
  const resolvedParent = path.resolve(parentPath);
  const resolvedChild = path.resolve(childPath);
  const comparableParent = process.platform === 'win32' ? resolvedParent.toLowerCase() : resolvedParent;
  const comparableChild = process.platform === 'win32' ? resolvedChild.toLowerCase() : resolvedChild;
  const parentWithSeparator = comparableParent.endsWith(path.sep) ? comparableParent : `${comparableParent}${path.sep}`;
  return comparableChild === comparableParent || comparableChild.startsWith(parentWithSeparator);
}

function resolveInsideProject(projectRoot: string, relativePath: string): string {
  if (!relativePath.trim()) {
    throw new Error('Patch contains an empty file path.');
  }
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Absolute paths are not allowed in patch: ${relativePath}`);
  }

  const normalized = path.normalize(relativePath);
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    throw new Error(`Patch file is outside the project: ${relativePath}`);
  }

  const absolutePath = path.resolve(projectRoot, normalized);
  if (!isInsidePath(projectRoot, absolutePath)) {
    throw new Error(`Patch file is outside the project: ${relativePath}`);
  }

  return absolutePath;
}

async function validateProjectRoot(folderPath: string): Promise<{ projectRoot: string; projectRootRealPath: string }> {
  const projectRoot = path.resolve(folderPath);
  let stat;
  try {
    stat = await fs.stat(projectRoot);
  } catch {
    throw new Error('Project folder does not exist.');
  }
  if (!stat.isDirectory()) {
    throw new Error('Project folder path is not a directory.');
  }
  return {
    projectRoot,
    projectRootRealPath: await fs.realpath(projectRoot),
  };
}

async function validatePatchFiles(projectRoot: string, projectRootRealPath: string, patchPlan: PatchPlan): Promise<BackupMetadataFile[]> {
  if (!patchPlan.files.length) {
    throw new Error('Patch plan has no file changes to apply.');
  }

  const metadataFiles: BackupMetadataFile[] = [];
  const failed: PatchApplyFileResult[] = [];

  for (const file of patchPlan.files) {
    if (file.changeType !== 'modify') {
      failed.push({ relativePath: file.relativePath, status: 'failed', message: 'Only modify changes are supported.' });
      continue;
    }

    let targetAbsolutePath: string;
    try {
      targetAbsolutePath = resolveInsideProject(projectRoot, file.relativePath);
      const stat = await fs.stat(targetAbsolutePath);
      if (!stat.isFile()) {
        failed.push({ relativePath: file.relativePath, status: 'failed', message: 'Target path is not a file.' });
        continue;
      }
      const realTargetAbsolutePath = await fs.realpath(targetAbsolutePath);
      if (!isInsidePath(projectRootRealPath, realTargetAbsolutePath)) {
        failed.push({ relativePath: file.relativePath, status: 'failed', message: 'Patch file is outside the project.' });
        continue;
      }
      const currentContent = await fs.readFile(realTargetAbsolutePath, 'utf8');
      if (currentContent !== file.oldContent) {
        failed.push({ relativePath: file.relativePath, status: 'failed', message: 'File changed since patch was generated.' });
        continue;
      }
      metadataFiles.push({
        relativePath: file.relativePath,
        originalContent: currentContent,
        targetAbsolutePath: realTargetAbsolutePath,
      });
    } catch (error) {
      failed.push({ relativePath: file.relativePath, status: 'failed', message: error instanceof Error ? error.message : 'Unable to validate file.' });
    }
  }

  if (failed.length) {
    const changedFile = failed.find((file) => file.message === 'File changed since patch was generated.');
    throw new Error(changedFile?.message ?? failed[0]?.message ?? 'Patch validation failed.');
  }

  return metadataFiles;
}

async function writeBackup(metadata: BackupMetadata): Promise<void> {
  const backupDir = path.join(getBackupsRoot(), metadata.backupId);
  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(path.join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
}

async function rollbackMetadata(metadata: BackupMetadata): Promise<PatchRollbackFileResult[]> {
  const projectRoot = path.resolve(metadata.projectPath);
  const projectRootRealPath = await fs.realpath(projectRoot);
  const results: PatchRollbackFileResult[] = [];

  for (const file of metadata.files) {
    try {
      const targetAbsolutePath = path.resolve(file.targetAbsolutePath);
      if (!isInsidePath(projectRootRealPath, targetAbsolutePath)) {
        throw new Error('Backup target is outside the original project.');
      }
      await fs.writeFile(targetAbsolutePath, file.originalContent, 'utf8');
      results.push({ relativePath: file.relativePath, status: 'restored' });
    } catch (error) {
      results.push({ relativePath: file.relativePath, status: 'failed', message: error instanceof Error ? error.message : 'Rollback failed.' });
    }
  }

  return results;
}

export async function applyPatchPlan(folderPath: string, patchPlan: PatchPlan): Promise<ApplyPatchResponse> {
  const { projectRoot, projectRootRealPath } = await validateProjectRoot(folderPath);
  const backupFiles = await validatePatchFiles(projectRoot, projectRootRealPath, patchPlan);
  const backupId = createBackupId();
  const appliedAt = new Date().toISOString();
  const metadata: BackupMetadata = {
    backupId,
    projectPath: projectRoot,
    createdAt: appliedAt,
    files: backupFiles,
  };

  try {
    await writeBackup(metadata);
  } catch {
    throw new Error('Unable to create patch backup. No files were changed.');
  }

  const appliedFiles: PatchApplyFileResult[] = [];
  const appliedChanges: PatchFileChange[] = [];

  for (const file of patchPlan.files) {
    const backupFile = backupFiles.find((item) => item.relativePath === file.relativePath);
    if (!backupFile) {
      appliedFiles.push({ relativePath: file.relativePath, status: 'skipped', message: 'File was not validated for apply.' });
      continue;
    }
    try {
      await fs.writeFile(backupFile.targetAbsolutePath, file.newContent, 'utf8');
      appliedChanges.push(file);
      appliedFiles.push({ relativePath: file.relativePath, status: 'applied' });
    } catch (error) {
      appliedFiles.push({ relativePath: file.relativePath, status: 'failed', message: error instanceof Error ? error.message : 'Disk write failed.' });
      const rollbackFiles = metadata.files.filter((backupFile) => appliedChanges.some((change) => change.relativePath === backupFile.relativePath));
      await rollbackMetadata({ ...metadata, files: rollbackFiles });
      throw new Error(`Failed to write ${file.relativePath}. Applied files were rolled back.`);
    }
  }

  return {
    success: appliedFiles.every((file) => file.status === 'applied'),
    appliedAt,
    backupId,
    appliedFiles,
  };
}

export async function rollbackPatch(backupId: string): Promise<RollbackPatchResponse> {
  validateBackupId(backupId);
  const metadataPath = path.join(getBackupsRoot(), backupId, 'metadata.json');
  let metadata: BackupMetadata;
  try {
    metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8')) as BackupMetadata;
  } catch {
    throw new Error('Patch backup was not found.');
  }

  const restoredFiles = await rollbackMetadata(metadata);
  return {
    success: restoredFiles.every((file) => file.status === 'restored'),
    restoredFiles,
  };
}
