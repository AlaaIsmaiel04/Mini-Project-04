import { useEffect, useReducer } from 'react';
export function useRefreshOnFocus() {
  const [revision, refresh] = useReducer((value: number) => value + 1, 0);
  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  return [revision, refresh] as const;
}
