import { useSyncExternalStore } from 'react';

let revision = 0;
const listeners = new Set<() => void>();

// Dashboard consumers can subscribe to this hook and refetch after stock changes.
export function notifyInventoryChanged() {
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function useInventoryRevision() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => revision,
  );
}
