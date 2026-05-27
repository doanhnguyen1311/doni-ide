import { app } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectMemoryInfo, SessionItem } from '../shared/types';

const MAX_OUTPUT_PREVIEW_BYTES = 20 * 1024;

function sessionsRoot(): string {
  return path.join(app.getPath('userData'), 'sessions');
}

function projectIdFromPath(projectPath: string): string {
  return crypto.createHash('sha256').update(path.resolve(projectPath)).digest('hex').slice(0, 16);
}

function projectDir(projectId: string): string {
  return path.join(sessionsRoot(), projectId);
}

function sessionsPath(projectId: string): string {
  return path.join(projectDir(projectId), 'sessions.json');
}

function projectPath(projectId: string): string {
  return path.join(projectDir(projectId), 'project.json');
}

async function ensureProjectDir(projectId: string): Promise<void> {
  await fs.mkdir(projectDir(projectId), { recursive: true });
}

async function readSessions(projectId: string): Promise<SessionItem[]> {
  const filePath = sessionsPath(projectId);
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
    if (!Array.isArray(parsed)) {
      throw new SyntaxError('sessions.json must contain an array.');
    }
    return parsed as SessionItem[];
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return [];
    if (!(error instanceof SyntaxError)) {
      throw new Error(`Unable to read session history: ${error instanceof Error ? error.message : 'unknown file error'}`);
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.rename(filePath, path.join(projectDir(projectId), `sessions.corrupt.${stamp}.json`)).catch(() => undefined);
    await fs.writeFile(filePath, '[]', 'utf8');
    console.warn(`Session history was corrupt and has been backed up for project ${projectId}.`);
    return [];
  }
}

async function writeSessions(projectId: string, sessions: SessionItem[]): Promise<void> {
  await ensureProjectDir(projectId);
  try {
    await fs.writeFile(sessionsPath(projectId), JSON.stringify(sessions, null, 2), 'utf8');
  } catch (error) {
    throw new Error(`Unable to write session history: ${error instanceof Error ? error.message : 'unknown file error'}`);
  }
}

function defaultTitle(rawRequest: string): string {
  return rawRequest.trim().replace(/\s+/g, ' ').slice(0, 60) || 'Untitled session';
}

function trimVerifyOutput(session: Partial<SessionItem>): Partial<SessionItem> {
  if (!session.verifyCommand || session.verifyCommand.outputPreview.length <= MAX_OUTPUT_PREVIEW_BYTES) return session;
  return {
    ...session,
    verifyCommand: {
      ...session.verifyCommand,
      outputPreview: session.verifyCommand.outputPreview.slice(0, MAX_OUTPUT_PREVIEW_BYTES),
      truncated: true,
    },
  };
}

export async function createOrUpdateProjectMemory(input: {
  projectPath: string;
  fileCount: number;
  extensionsSummary: Record<string, number>;
}): Promise<ProjectMemoryInfo> {
  const resolvedPath = path.resolve(input.projectPath);
  const projectId = projectIdFromPath(resolvedPath);
  await ensureProjectDir(projectId);
  const now = new Date().toISOString();
  let createdAt = now;
  try {
    const previous = JSON.parse(await fs.readFile(projectPath(projectId), 'utf8')) as ProjectMemoryInfo;
    createdAt = previous.createdAt ?? now;
  } catch {
    // New project memory.
  }

  const metadata: ProjectMemoryInfo = {
    projectId,
    projectPath: resolvedPath,
    projectName: path.basename(resolvedPath),
    lastOpenedAt: now,
    createdAt,
    fileCount: input.fileCount,
    extensionsSummary: input.extensionsSummary,
  };
  await fs.writeFile(projectPath(projectId), JSON.stringify(metadata, null, 2), 'utf8');
  await writeSessions(projectId, await readSessions(projectId));
  return metadata;
}

export async function createSession(projectId: string, initialData: Partial<SessionItem>): Promise<SessionItem> {
  const sessions = await readSessions(projectId);
  const now = new Date().toISOString();
  const rawRequest = initialData.rawRequest ?? '';
  const sanitized = trimVerifyOutput(initialData);
  const session: SessionItem = {
    ...sanitized,
    id: crypto.randomUUID(),
    projectId,
    createdAt: now,
    updatedAt: now,
    title: sanitized.title ?? defaultTitle(rawRequest),
    rawRequest,
  };
  sessions.unshift(session);
  await writeSessions(projectId, sessions);
  return session;
}

export async function updateSession(projectId: string, sessionId: string, partialData: Partial<SessionItem>): Promise<SessionItem> {
  const sessions = await readSessions(projectId);
  const index = sessions.findIndex((session) => session.id === sessionId);
  if (index < 0) throw new Error('Session was not found.');
  const sanitized = trimVerifyOutput(partialData);
  const updated: SessionItem = {
    ...sessions[index],
    ...sanitized,
    id: sessions[index].id,
    projectId,
    createdAt: sessions[index].createdAt,
    updatedAt: new Date().toISOString(),
  };
  sessions[index] = updated;
  await writeSessions(projectId, sessions);
  return updated;
}

export async function listSessions(projectId: string): Promise<SessionItem[]> {
  return (await readSessions(projectId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSession(projectId: string, sessionId: string): Promise<SessionItem> {
  const session = (await readSessions(projectId)).find((item) => item.id === sessionId);
  if (!session) throw new Error('Session was not found.');
  return session;
}

export async function deleteSession(projectId: string, sessionId: string): Promise<void> {
  const sessions = await readSessions(projectId);
  const nextSessions = sessions.filter((session) => session.id !== sessionId);
  if (nextSessions.length === sessions.length) throw new Error('Session was not found.');
  await writeSessions(projectId, nextSessions);
}

export async function clearProjectSessions(projectId: string): Promise<void> {
  await writeSessions(projectId, []);
}
