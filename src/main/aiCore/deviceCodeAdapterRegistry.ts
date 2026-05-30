import type { DeviceCodeAuthAdapter } from './deviceCodeAuthAdapter';
import { githubCopilotDeviceCodeAuthAdapter } from './githubCopilotDeviceCodeAuthAdapter';
import { kiloCodeDeviceCodeAuthAdapter } from './kiloCodeDeviceCodeAuthAdapter';

const deviceCodeAdapters = new Map<string, DeviceCodeAuthAdapter>([
  [githubCopilotDeviceCodeAuthAdapter.providerId, githubCopilotDeviceCodeAuthAdapter],
  [kiloCodeDeviceCodeAuthAdapter.providerId, kiloCodeDeviceCodeAuthAdapter],
]);

export function getDeviceCodeAdapter(providerId: string): DeviceCodeAuthAdapter | undefined {
  return deviceCodeAdapters.get(providerId);
}
