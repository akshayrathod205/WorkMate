import "@testing-library/jest-dom/vitest";

// Node 25 ships an experimental built-in `localStorage` that pre-empts jsdom's,
// but ships it as an empty stub without the Storage API methods. Polyfill a
// real in-memory Storage on both globalThis and window so component code and
// tests see the same backing store.
function makeStorage() {
  let store = new Map();
  return {
    get length() {
      return store.size;
    },
    key(i) {
      return Array.from(store.keys())[i] ?? null;
    },
    getItem(k) {
      return store.has(String(k)) ? store.get(String(k)) : null;
    },
    setItem(k, v) {
      store.set(String(k), String(v));
    },
    removeItem(k) {
      store.delete(String(k));
    },
    clear() {
      store.clear();
    },
  };
}

const localStorageStub = makeStorage();
const sessionStorageStub = makeStorage();

for (const target of [globalThis, globalThis.window].filter(Boolean)) {
  Object.defineProperty(target, "localStorage", {
    configurable: true,
    writable: true,
    value: localStorageStub,
  });
  Object.defineProperty(target, "sessionStorage", {
    configurable: true,
    writable: true,
    value: sessionStorageStub,
  });
}
