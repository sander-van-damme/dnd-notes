import { initialState, reduce, type Action } from './state';
import type { AppState } from './types';
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
export async function openDatabase() {
  const r = indexedDB.open('dnd-notulist', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('state');
  return request(r);
}
export async function readState(db: IDBDatabase): Promise<AppState> {
  const stored = (await request(
    db.transaction('state').objectStore('state').get('current'),
  )) as AppState | undefined;
  if (stored && stored.schema !== 1)
    throw Error(
      'Deze gegevensversie wordt nog niet ondersteund. Exporteer via de vorige appversie.',
    );
  return stored ?? initialState();
}
// A transaction compares versions and commits the snapshot plus journal atomically.
// The only persistence API accepts typed domain actions, never audio or inference payloads.
export function commit(
  db: IDBDatabase,
  current: AppState,
  action: Action,
): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite'),
      store = tx.objectStore('state');
    let next = current;
    let conflict = false;
    const r = store.get('current');
    r.onsuccess = () => {
      if ((r.result?.version ?? 0) !== current.version) {
        conflict = true;
        tx.abort();
        return;
      }
      next = reduce(current, action);
      store.put(next, 'current');
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = tx.onerror = () =>
      reject(
        conflict
          ? Error(
              'Een ander tabblad heeft deze sessies gewijzigd. Herlaad om verder te gaan; kopieer eventuele onopgeslagen tekst eerst.',
            )
          : (tx.error ??
              Error('Lokale opslag mislukt. Exporteer je notities.')),
      );
  });
}
