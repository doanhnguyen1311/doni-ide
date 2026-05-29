import type { ElectronApi, UpdaterApi } from '../shared/types';

declare global {
  interface Window {
    doni: ElectronApi;
    electron: {
      updater: UpdaterApi;
    };
  }
}

export {};
