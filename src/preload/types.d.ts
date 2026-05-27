import type { ElectronApi } from '../shared/types';

declare global {
  interface Window {
    doni: ElectronApi;
  }
}

export {};