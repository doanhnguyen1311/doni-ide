import type { ProviderAuthAdapter } from './providerAuthAdapters';

export const localNoAuthAdapter: ProviderAuthAdapter = {
  method: 'localNoAuth',
  async resolve() {
    return {
      method: 'localNoAuth',
      headers: {},
    };
  },
};
