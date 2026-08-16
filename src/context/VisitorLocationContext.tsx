import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** Indoor position from scanning an exhibit QR in a room. Not a tour stop. */
export type VisitorLocation = {
  roomId: number;
  roomName?: string | null;
  roomCode?: string | null;
  floorNumber?: number | null;
  exhibitId?: number | null;
};

type VisitorLocationContextValue = {
  location: VisitorLocation | null;
  setLocation: (next: VisitorLocation | null) => void;
  setLocationFromScan: (next: {
    roomId?: number | null;
    roomName?: string | null;
    roomCode?: string | null;
    floorNumber?: number | null;
    exhibitId?: number | null;
  }) => void;
  clearLocation: () => void;
};

const VisitorLocationContext = createContext<VisitorLocationContextValue | null>(
  null,
);

export function VisitorLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<VisitorLocation | null>(null);

  const setLocationFromScan = useCallback(
    (next: {
      roomId?: number | null;
      roomName?: string | null;
      roomCode?: string | null;
      floorNumber?: number | null;
      exhibitId?: number | null;
    }) => {
      const roomId = Number(next.roomId);
      if (!Number.isFinite(roomId) || roomId <= 0) return;
      setLocation({
        roomId,
        roomName: next.roomName ?? null,
        roomCode: next.roomCode ?? null,
        floorNumber: next.floorNumber ?? null,
        exhibitId:
          next.exhibitId != null && next.exhibitId > 0 ? next.exhibitId : null,
      });
    },
    [],
  );

  const clearLocation = useCallback(() => setLocation(null), []);

  const value = useMemo(
    () => ({ location, setLocation, setLocationFromScan, clearLocation }),
    [location, setLocationFromScan, clearLocation],
  );

  return (
    <VisitorLocationContext.Provider value={value}>
      {children}
    </VisitorLocationContext.Provider>
  );
}

export function useVisitorLocation() {
  const ctx = useContext(VisitorLocationContext);
  if (!ctx) {
    throw new Error('useVisitorLocation must be used within VisitorLocationProvider');
  }
  return ctx;
}
