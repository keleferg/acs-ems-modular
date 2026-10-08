export type Evidence = {
  id: string; revision_id: string; requirement_id: string; object_path: string;
  file_name: string; mime_type: string; caption: string; created_at: string; blob?: Blob;
};
const DB_NAME = "dpe-qualification-local-evidence-v1";
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("evidence", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function operation<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction("evidence", mode);
    const request = run(transaction.objectStore("evidence"));
    transaction.oncomplete = () => { db.close(); resolve(request.result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
  });
}
export const localEvidence = {
  list: () => operation("readonly", (store) => store.getAll()) as Promise<Evidence[]>,
  put: (evidence: Evidence) => operation("readwrite", (store) => store.put(evidence)),
  remove: (id: string) => operation("readwrite", (store) => store.delete(id)),
  clear: () => operation("readwrite", (store) => store.clear()),
};
