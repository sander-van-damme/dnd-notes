import { initialState, reduce, type Action } from './state';
import { commit, openDatabase, readState } from './storage';
import { record } from './diagnostics';
export class Store {
  state = initialState();
  error = '';
  ready = false;
  pending = 0;
  private db?: IDBDatabase;
  private listeners = new Set<() => void>();
  private writes: Promise<void> = Promise.resolve();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.state;
  private emit() {
    this.state = { ...this.state };
    this.listeners.forEach((l) => l());
  }
  async init() {
    try {
      this.db = await openDatabase();
      this.state = await readState(this.db);
      this.ready = true;
      this.emit();
    } catch (e) {
      this.error =
        e instanceof Error ? e.message : 'Lokale opslag is niet beschikbaar.';
      this.emit();
    }
  }
  dispatch(action: Action): Promise<void> {
    if (!this.db || this.error)
      return Promise.reject(Error(this.error || 'Opslag wordt nog geopend.'));
    const previous = this.state;
    this.pending++;
    this.state = reduce(previous, action);
    this.emit();
    this.writes = this.writes
      .then(async () => {
        if (this.error) throw Error(this.error);
        await commit(this.db!, previous, action);
        record('state_commit', { revision: this.state.version });
      })
      .catch((e) => {
        this.error = e instanceof Error ? e.message : 'Opslaan mislukt.';
        this.emit();
        throw e;
      })
      .finally(() => {
        this.pending--;
        this.emit();
      });
    // A failed save blocks later writes but retains the in-memory text for export.
    return this.writes;
  }
}
export const store = new Store();
