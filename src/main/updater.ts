import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { ProgressInfo, UpdateInfo } from 'electron-updater';
import type { UpdaterProgress, UpdaterStatus } from '../shared/types';

const isDev = !app.isPackaged;

let status: UpdaterStatus = {
  phase: 'idle',
  currentVersion: app.getVersion(),
  isDev,
  message: isDev ? 'Auto update chi hoat dong day du tren ban da dong goi installer.' : undefined,
};
let initialized = false;

function friendlyUpdaterError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/latest\.ya?ml|Cannot find latest|404|Not Found/i.test(message)) {
    return 'Chưa tìm thấy metadata update trên kho release. Hãy đảm bảo release đã được public.';
  }
  if (/No published versions|No releases/i.test(message)) {
    return 'Chưa có release phù hợp để kiểm tra update.';
  }
  if (/ERR_INTERNET_DISCONNECTED|ENOTFOUND|ETIMEDOUT|ECONNRESET/i.test(message)) {
    return 'Không thể kết nối đến máy chủ. Hãy kiểm tra kết nối mạng và thử lại.';
  }
  return message || 'Kiểm tra update thất bại.';
}

function updateStatus(next: Partial<UpdaterStatus>): UpdaterStatus {
  status = {
    ...status,
    ...next,
    currentVersion: app.getVersion(),
    isDev,
  };
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('updater:status', status);
  });
  return status;
}

function sendProgress(progress: UpdaterProgress): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('updater:progress', progress);
  });
}

function versionFromInfo(info: UpdateInfo): string {
  return info.version || info.releaseName || 'unknown';
}

async function checkForUpdates(): Promise<UpdaterStatus> {
  if (isDev) {
    return updateStatus({
      phase: 'idle',
      message: 'Auto update chi hoat dong day du tren ban da dong goi installer.',
      checkedAt: new Date().toISOString(),
    });
  }

  updateStatus({ phase: 'checking', message: 'Dang kiem tra ban cap nhat...', error: undefined });
  try {
    const result = await autoUpdater.checkForUpdates();
    if (!result) {
      return updateStatus({
        phase: 'not-available',
        message: 'Ban dang dung phien ban moi nhat.',
        checkedAt: new Date().toISOString(),
      });
    }
    return status;
  } catch (error) {
    return updateStatus({
      phase: 'error',
      error: friendlyUpdaterError(error),
      message: 'Khong the kiem tra update.',
      checkedAt: new Date().toISOString(),
    });
  }
}

async function downloadUpdate(): Promise<UpdaterStatus> {
  if (isDev) {
    return updateStatus({
      phase: 'idle',
      message: 'Auto update chi hoat dong day du tren ban da dong goi installer.',
    });
  }
  if (status.phase !== 'available') {
    return updateStatus({
      ...status,
      error: 'Chua co ban cap nhat san sang de tai. Hay kiem tra update truoc.',
    });
  }

  updateStatus({ phase: 'downloading', message: 'Dang tai ban cap nhat...', error: undefined });
  try {
    await autoUpdater.downloadUpdate();
    return status;
  } catch (error) {
    return updateStatus({
      phase: 'error',
      error: friendlyUpdaterError(error),
      message: 'Tai update that bai.',
    });
  }
}

function installUpdate(): void {
  if (isDev || status.phase !== 'downloaded') {
    return;
  }
  autoUpdater.quitAndInstall(false, true);
}

export function initAutoUpdater(window: BrowserWindow): void {
  if (initialized) {
    window.webContents.send('updater:status', status);
    return;
  }

  initialized = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    updateStatus({ phase: 'checking', message: 'Đang kiểm tra bản cập nhật...', error: undefined });
  });

  autoUpdater.on('update-available', (info) => {
    updateStatus({
      phase: 'available',
      updateVersion: versionFromInfo(info),
      message: `Co ban cap nhat ${versionFromInfo(info)}.`,
      error: undefined,
      checkedAt: new Date().toISOString(),
    });
  });

  autoUpdater.on('update-not-available', () => {
    updateStatus({
      phase: 'not-available',
      updateVersion: undefined,
      message: 'Bạn đang dùng phiên bản mới nhất.',
      error: undefined,
      checkedAt: new Date().toISOString(),
    });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    updateStatus({ phase: 'downloading', message: 'Đang tải bản cập nhật...', error: undefined });
    sendProgress({
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateStatus({
      phase: 'downloaded',
      updateVersion: versionFromInfo(info),
      message: 'Đã tải xong bản cập nhật. Vui lòng mở lại app để cài đặt.',
      error: undefined,
    });
    sendProgress({
      percent: 100,
      transferred: 0,
      total: 0,
      bytesPerSecond: 0,
    });
  });

  autoUpdater.on('error', (error) => {
    updateStatus({
      phase: 'error',
      error: friendlyUpdaterError(error),
      message: 'Update gap loi.',
      checkedAt: new Date().toISOString(),
    });
  });

  ipcMain.handle('updater:status', async (): Promise<UpdaterStatus> => status);
  ipcMain.handle('updater:check', async (): Promise<UpdaterStatus> => checkForUpdates());
  ipcMain.handle('updater:download', async (): Promise<UpdaterStatus> => downloadUpdate());
  ipcMain.handle('updater:install', async (): Promise<void> => installUpdate());

  window.webContents.once('did-finish-load', () => {
    window.webContents.send('updater:status', status);
  });

  void checkForUpdates();
}
