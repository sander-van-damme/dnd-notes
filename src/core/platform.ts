import { record } from './diagnostics';

type Reason = 'startup' | 'load' | 'export' | 'download' | 'model-ready';

interface StorageWithDetails extends StorageEstimate {
  usageDetails?: Record<string, number>;
}
interface BrowserPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}
interface BrowserNavigator extends Navigator {
  deviceMemory?: number;
}
function displayMode(): 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser' {
  for (const value of ['standalone', 'fullscreen', 'minimal-ui'] as const) {
    if (window.matchMedia?.('(display-mode: ' + value + ')').matches)
      return value;
  }
  return 'browser';
}

export async function platformSnapshot(reason: Reason) {
  const pwa = {
    display: displayMode(),
    controlled: !!navigator.serviceWorker?.controller,
    active: false,
    waiting: false,
    installing: false,
    scopeMatchesOrigin: false,
    cacheNames: [] as string[],
  };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    pwa.active = !!registration?.active;
    pwa.waiting = !!registration?.waiting;
    pwa.installing = !!registration?.installing;
    pwa.scopeMatchesOrigin =
      !!registration && new URL(registration.scope).origin === location.origin;
  } catch {
    // Service worker may be unavailable; never block normal operation.
  }
  try {
    pwa.cacheNames = (await caches.keys()).filter((key) =>
      key.startsWith('dnd-shell-') || key.startsWith('dnd-models-'),
    );
  } catch {
    // Browser caches may be inaccessible.
  }
  record('pwa_state', {
    reason,
    display: pwa.display,
    controlled: pwa.controlled,
    active: pwa.active,
    waiting: pwa.waiting,
    installing: pwa.installing,
  });

  const storage = {
    supported: !!navigator.storage,
    persistenceSupported: !!navigator.storage?.persist,
    persisted: null as boolean | null,
    quota: null as number | null,
    usage: null as number | null,
    usageDetails: null as Record<string, number> | null,
  };
  try {
    storage.persisted = (await navigator.storage?.persisted?.()) ?? null;
  } catch {
    // Permission state can be unavailable even when quota is readable.
  }
  try {
    const estimate = (await navigator.storage?.estimate?.()) as
      | StorageWithDetails
      | undefined;
    storage.quota = estimate?.quota ?? null;
    storage.usage = estimate?.usage ?? null;
    storage.usageDetails = estimate?.usageDetails ?? null;
  } catch {
    // Retain unknowns, not invented zeros.
  }
  record('storage_state', {
    reason,
    ...(storage.persisted !== null && { persisted: storage.persisted }),
    ...(storage.quota !== null && { quota: storage.quota }),
    ...(storage.usage !== null && { usage: storage.usage }),
  });

  const heap = (performance as BrowserPerformance).memory;
  const memory = {
    deviceMemoryGB: (navigator as BrowserNavigator).deviceMemory ?? null,
    jsHeapUsedBytes: heap?.usedJSHeapSize ?? null,
    jsHeapLimitBytes: heap?.jsHeapSizeLimit ?? null,
    userAgentMemorySupported:
      typeof (
        performance as Performance & {
          measureUserAgentSpecificMemory?: () => Promise<unknown>;
        }
      ).measureUserAgentSpecificMemory === 'function',
  };
  if (memory.jsHeapUsedBytes !== null)
    record('memory_state', {
      source: 'performance-memory',
      bytes: memory.jsHeapUsedBytes,
      jsHeapLimit: memory.jsHeapLimitBytes ?? 0,
    });
  return { pwa, storage, memory };
}

export async function requestPersistentStorage() {
  const storage = navigator.storage;
  if (!storage?.persist) {
    record('storage_persist', { result: 'unsupported' });
    return;
  }
  try {
    if (await storage.persisted?.()) {
      record('storage_persist', { result: 'already-granted' });
      return;
    }
    const granted = await storage.persist();
    record('storage_persist', { result: granted ? 'granted' : 'denied' });
  } catch {
    record('storage_persist', { result: 'error' });
  }
}
