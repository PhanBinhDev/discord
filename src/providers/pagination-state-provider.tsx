import { createContext, useCallback, useRef } from 'react';

export type PaginationState = {
  nextPageKey: number;
  pageKeys: number[];
  queries: Record<
    number,
    {
      args: Record<string, unknown> & {
        paginationOpts: { cursor: string | null; numItems: number };
      };
    }
  >;
};

type PaginationStateContextValue = {
  getState: (key: string) => PaginationState | undefined;
  setState: (key: string, state: PaginationState) => void;
};

export const PaginationStateContext =
  createContext<PaginationStateContextValue | null>(null);

export function PaginationStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const stateMapRef = useRef<Map<string, PaginationState>>(new Map());

  const getState = useCallback((key: string) => {
    return stateMapRef.current.get(key);
  }, []);

  const setState = useCallback((key: string, state: PaginationState) => {
    stateMapRef.current.set(key, state);
  }, []);

  return (
    <PaginationStateContext.Provider value={{ getState, setState }}>
      {children}
    </PaginationStateContext.Provider>
  );
}
