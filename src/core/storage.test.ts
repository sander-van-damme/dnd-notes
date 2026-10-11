import 'fake-indexeddb/auto';
import { beforeEach, expect, it } from 'vitest';
import { commit, openDatabase, readState } from './storage';
import { initialState } from './state';
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase('dnd-notulist');
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});
it('herstelt een transactioneel opgeslagen snapshot inclusief journal', async () => {
  const db = await openDatabase();
  const state = await commit(db, initialState(), {
    type: 'campaign',
    id: 'c',
    name: 'Onze wereld',
  });
  expect(await readState(db)).toEqual(state);
  expect(state.journal[0].seq).toBe(1);
  db.close();
});
it('weigert een write uit een verouderd tabblad', async () => {
  const db = await openDatabase();
  await commit(db, initialState(), {
    type: 'campaign',
    id: 'c',
    name: 'Eerste tab',
  });
  await expect(
    commit(db, initialState(), { type: 'campaign', id: 'd', name: 'Oude tab' }),
  ).rejects.toThrow('ander tabblad');
  expect((await readState(db)).campaigns.map((c) => c.name)).toEqual([
    'Eerste tab',
  ]);
  db.close();
});
