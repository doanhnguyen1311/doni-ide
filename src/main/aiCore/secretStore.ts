import { safeStorage } from 'electron';
import { execFile, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import { getDoniHomeFile } from '../doniHome';

const execFileAsync = promisify(execFile);
const FALLBACK_SECRET_FILE = 'secrets.json';
const WINDOWS_CREDENTIAL_SCRIPT = `
$ErrorActionPreference = "Stop"
$Action = $args[0]
$Target = $args[1]
$Secret = $env:DONI_SECRET

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace DoniCredentialVault {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public UInt32 Flags;
    public UInt32 Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize;
    public IntPtr CredentialBlob;
    public UInt32 Persist;
    public UInt32 AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }

  public static class NativeMethods {
    [DllImport("Advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredWrite(ref CREDENTIAL credential, UInt32 flags);

    [DllImport("Advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredRead(string target, UInt32 type, UInt32 reservedFlag, out IntPtr credentialPtr);

    [DllImport("Advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredDelete(string target, UInt32 type, UInt32 flags);

    [DllImport("Advapi32.dll", SetLastError = true)]
    public static extern void CredFree(IntPtr credentialPtr);
  }
}
"@

if ($Action -eq "write") {
  $bytes = [System.Text.Encoding]::Unicode.GetBytes($Secret)
  $blob = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
  try {
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $blob, $bytes.Length)
    $credential = New-Object DoniCredentialVault.CREDENTIAL
    $credential.Flags = 0
    $credential.Type = 1
    $credential.TargetName = $Target
    $credential.CredentialBlobSize = $bytes.Length
    $credential.CredentialBlob = $blob
    $credential.Persist = 2
    $credential.UserName = "Doni"
    if (-not [DoniCredentialVault.NativeMethods]::CredWrite([ref]$credential, 0)) {
      throw "CredWrite failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    }
  } finally {
    [System.Runtime.InteropServices.Marshal]::FreeHGlobal($blob)
  }
  return
}

if ($Action -eq "read") {
  $credentialPtr = [IntPtr]::Zero
  if (-not [DoniCredentialVault.NativeMethods]::CredRead($Target, 1, 0, [ref]$credentialPtr)) {
    exit 44
  }
  try {
    $credential = [System.Runtime.InteropServices.Marshal]::PtrToStructure($credentialPtr, [type][DoniCredentialVault.CREDENTIAL])
    if ($credential.CredentialBlobSize -gt 0) {
      [Console]::Out.Write([System.Runtime.InteropServices.Marshal]::PtrToStringUni($credential.CredentialBlob, [Math]::Floor($credential.CredentialBlobSize / 2)))
    }
  } finally {
    [DoniCredentialVault.NativeMethods]::CredFree($credentialPtr)
  }
  return
}

if ($Action -eq "delete") {
  [void][DoniCredentialVault.NativeMethods]::CredDelete($Target, 1, 0)
  return
}

throw "Unsupported action: $Action"
`;

interface FallbackSecretFile {
  secrets: Record<string, string>;
}

let fallbackSecretsMutation: Promise<void> = Promise.resolve();

function targetName(reference: string): string {
  return `Doni AI:${reference}`;
}

function createFallbackUnavailableError(): Error {
  return new Error('No OS-backed secret storage is available on this system.');
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function isMissingExecutableError(error: unknown): boolean {
  return getErrorCode(error) === 'ENOENT';
}

function createLinuxSecretToolUnavailableError(): Error {
  return new Error('Linux secret storage requires secret-tool, but it is not installed or not available on PATH.');
}

function createLinuxSecretUnavailableError(fallbackError: unknown, platformError: unknown): Error {
  const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
  const platformMessage = platformError instanceof Error ? platformError.message : String(platformError);
  return new Error(`Unable to read the saved secret. Fallback store: ${fallbackMessage}. Linux secret service: ${platformMessage}`);
}

async function runWithInput(command: string, args: string[], input: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString('utf8'));
        return;
      }
      reject(new Error(Buffer.concat(stderr).toString('utf8').trim() || `${command} exited with ${code}`));
    });

    child.stdin.end(input, 'utf8');
  });
}

async function runWindowsCredential(action: 'write' | 'read' | 'delete', reference: string, secret = ''): Promise<string> {
  const encodedCommand = Buffer.from(WINDOWS_CREDENTIAL_SCRIPT, 'utf16le').toString('base64');
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedCommand, action, targetName(reference)],
    {
      env: {
        ...process.env,
        DONI_SECRET: secret,
      },
      timeout: 15000,
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  return stdout;
}

async function writeMacOsKeychain(reference: string, secret: string): Promise<void> {
  await execFileAsync('security', ['add-generic-password', '-a', 'Doni', '-s', targetName(reference), '-w', secret, '-U']);
}

async function readMacOsKeychain(reference: string): Promise<string> {
  const { stdout } = await execFileAsync('security', ['find-generic-password', '-a', 'Doni', '-s', targetName(reference), '-w']);
  return stdout.trimEnd();
}

async function deleteMacOsKeychain(reference: string): Promise<void> {
  await execFileAsync('security', ['delete-generic-password', '-a', 'Doni', '-s', targetName(reference)]).catch(() => undefined);
}

async function writeLinuxSecretService(reference: string, secret: string): Promise<void> {
  try {
    await runWithInput('secret-tool', ['store', '--label', targetName(reference), 'application', 'Doni', 'reference', reference], secret);
  } catch (error) {
    if (isMissingExecutableError(error)) {
      throw createLinuxSecretToolUnavailableError();
    }
    throw error;
  }
}

async function readLinuxSecretService(reference: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('secret-tool', ['lookup', 'application', 'Doni', 'reference', reference]);
    return stdout.trimEnd();
  } catch (error) {
    if (isMissingExecutableError(error)) {
      throw createLinuxSecretToolUnavailableError();
    }
    throw error;
  }
}

async function deleteLinuxSecretService(reference: string): Promise<void> {
  await execFileAsync('secret-tool', ['clear', 'application', 'Doni', 'reference', reference]).catch(() => undefined);
}

async function readFallbackSecrets(): Promise<FallbackSecretFile> {
  try {
    const parsed = JSON.parse(await fs.readFile(await getDoniHomeFile('auth', FALLBACK_SECRET_FILE), 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { secrets: {} };
    }
    const secrets = (parsed as FallbackSecretFile).secrets;
    return {
      secrets: secrets && typeof secrets === 'object' && !Array.isArray(secrets) ? secrets : {},
    };
  } catch {
    return { secrets: {} };
  }
}

async function mutateFallbackSecrets<T>(operation: () => Promise<T>): Promise<T> {
  const result = fallbackSecretsMutation.then(operation, operation);
  fallbackSecretsMutation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function writeFallbackSecrets(file: FallbackSecretFile): Promise<void> {
  const targetPath = await getDoniHomeFile('auth', FALLBACK_SECRET_FILE);
  const tempPath = `${targetPath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(file, null, 2), 'utf8');
  await fs.rename(tempPath, targetPath);
}

async function writeFallbackSecret(reference: string, secret: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw createFallbackUnavailableError();
  }
  await mutateFallbackSecrets(async () => {
    const file = await readFallbackSecrets();
    file.secrets[reference] = safeStorage.encryptString(secret).toString('base64');
    await writeFallbackSecrets(file);
  });
}

async function readFallbackSecret(reference: string): Promise<string> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw createFallbackUnavailableError();
  }
  await fallbackSecretsMutation;
  const file = await readFallbackSecrets();
  const encrypted = file.secrets[reference];
  if (!encrypted) {
    throw new Error('Secret reference was not found.');
  }
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
}

async function deleteFallbackSecret(reference: string): Promise<void> {
  await mutateFallbackSecrets(async () => {
    const file = await readFallbackSecrets();
    if (file.secrets[reference]) {
      delete file.secrets[reference];
      await writeFallbackSecrets(file);
    }
  });
}

export function createSecretReference(prefix = 'secret_ref'): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function writeSecret(reference: string, secret: string): Promise<void> {
  if (!secret) {
    await deleteSecret(reference);
    return;
  }

  let wrotePlatformSecret = false;
  try {
    if (process.platform === 'win32') {
      await runWindowsCredential('write', reference, secret);
      wrotePlatformSecret = true;
    } else if (process.platform === 'darwin') {
      await writeMacOsKeychain(reference, secret);
      wrotePlatformSecret = true;
    } else if (process.platform === 'linux') {
      await writeLinuxSecretService(reference, secret);
      wrotePlatformSecret = true;
    }
  } catch (error) {
    if (process.platform !== 'linux') {
      await writeFallbackSecret(reference, secret);
      return;
    }
    console.warn('[secret-store] platform secret write failed; using fallback store', error instanceof Error ? error.message : String(error));
  }

  try {
    await writeFallbackSecret(reference, secret);
  } catch (error) {
    if (!wrotePlatformSecret) throw error;
    console.warn('[secret-store] fallback secret mirror failed after platform write', error instanceof Error ? error.message : String(error));
  }
}

export async function readSecret(reference: string): Promise<string> {
  if (process.platform === 'linux') {
    let fallbackError: unknown;
    try {
      return await readFallbackSecret(reference);
    } catch (error) {
      fallbackError = error;
    }
    try {
      return await readLinuxSecretService(reference);
    } catch (error) {
      throw createLinuxSecretUnavailableError(fallbackError, error);
    }
  }

  try {
    if (process.platform === 'win32') {
      return await runWindowsCredential('read', reference);
    }
    if (process.platform === 'darwin') {
      return await readMacOsKeychain(reference);
    }
  } catch {
    return await readFallbackSecret(reference);
  }

  return await readFallbackSecret(reference);
}

export async function deleteSecret(reference: string): Promise<void> {
  try {
    if (process.platform === 'win32') {
      await runWindowsCredential('delete', reference);
    } else if (process.platform === 'darwin') {
      await deleteMacOsKeychain(reference);
    } else if (process.platform === 'linux') {
      await deleteLinuxSecretService(reference);
    }
  } finally {
    await deleteFallbackSecret(reference);
  }
}

export async function hasSecret(reference: string): Promise<boolean> {
  try {
    const secret = await readSecret(reference);
    return Boolean(secret);
  } catch {
    return false;
  }
}
