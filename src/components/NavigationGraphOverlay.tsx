import { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import type {
  NavigationEdgeDto,
  NavigationInstructionDto,
  NavigationWaypointDto,
  RoomDto,
} from '../services/apiService';

function isRoomWaypoint(wp: Pick<NavigationWaypointDto, 'waypointType'>): boolean {
  const type = String(wp.waypointType ?? '').toUpperCase();
  return type === 'DOOR' || type === 'ROOM';
}

/** This floor’s photo only — never mix other floors (mapId=0 used to leak). */
export function waypointOnMap(
  wp: NavigationWaypointDto,
  mapId: number,
  floorNumber?: number | null,
): boolean {
  const wpMap = Number(wp.mapId) || 0;
  if (wpMap > 0) return wpMap === mapId;
  if (floorNumber != null && floorNumber > 0) {
    const wpFloor = Number(wp.floorNumber) || 0;
    if (wpFloor > 0) return wpFloor === floorNumber;
  }
  return false;
}

export function waypointColor(
  wp: Pick<NavigationWaypointDto, 'waypointType'>,
): string {
  if (isRoomWaypoint(wp)) return '#16A34A';
  switch (String(wp.waypointType ?? '').toUpperCase()) {
    case 'STAIR':
      return '#EA580C';
    case 'ELEVATOR':
      return '#7C3AED';
    case 'LOBBY':
      return '#DB2777';
    case 'HALLWAY':
    default:
      return '#2563EB';
  }
}

function roomLabel(
  wp: NavigationWaypointDto,
  rooms: RoomDto[],
): string | null {
  if (!isRoomWaypoint(wp)) return null;
  if (wp.roomId == null || wp.roomId === 0) {
    return wp.name?.trim() || wp.code?.trim() || null;
  }
  const room = rooms.find((r) => r.id === wp.roomId);
  if (room) {
    return room.roomCode
      ? `${room.roomName} (${room.roomCode})`
      : room.roomName;
  }
  return wp.name?.trim() || `Room #${wp.roomId}`;
}

function barStyle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: number,
  color: string,
  opacity = 1,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 1) return null;
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return {
    position: 'absolute' as const,
    left: (x1 + x2) / 2 - length / 2,
    top: (y1 + y2) / 2 - stroke / 2,
    width: length,
    height: stroke,
    borderRadius: stroke / 2,
    backgroundColor: color,
    opacity,
    transform: [{ rotate: `${deg}deg` }],
  };
}

type Segment = { from: NavigationWaypointDto; to: NavigationWaypointDto };

type Props = {
  mapId: number;
  floorNumber?: number | null;
  waypoints: NavigationWaypointDto[];
  edges: NavigationEdgeDto[];
  rooms: RoomDto[];
  pathWaypoints?: NavigationWaypointDto[];
  instructions?: NavigationInstructionDto[];
  hereRoomId?: number | null;
  destRoomId?: number | null;
  /** Only the computed route — no full grey graph. */
  pathOnly?: boolean;
  onSelectRoom?: (room: RoomDto) => void;
};

/**
 * CMS graph on a floor photo — percent coords, View dots + rotated bars.
 * Parent should size this to the contained photo.
 */
export function NavigationGraphOverlay({
  mapId,
  floorNumber = null,
  waypoints,
  edges,
  rooms,
  pathWaypoints = [],
  instructions = [],
  hereRoomId = null,
  destRoomId = null,
  pathOnly = false,
  onSelectRoom,
}: Props) {
  const [box, setBox] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width === box.w && height === box.h) return;
    setBox({ w: width, h: height });
  };

  const onThisFloor = (wp: NavigationWaypointDto) =>
    waypointOnMap(wp, mapId, floorNumber);

  const floorWaypoints = useMemo(
    () => waypoints.filter((wp) => onThisFloor(wp)),
    [waypoints, mapId, floorNumber],
  );

  const pathOnFloor = useMemo(
    () => pathWaypoints.filter((wp) => onThisFloor(wp)),
    [pathWaypoints, mapId, floorNumber],
  );

  const pathIds = useMemo(
    () => new Set(pathOnFloor.map((wp) => String(wp.id))),
    [pathOnFloor],
  );

  const visibleWaypoints = useMemo(() => {
    if (!pathOnly) return floorWaypoints;
    return floorWaypoints.filter((wp) => {
      if (pathIds.has(String(wp.id))) return true;
      if (hereRoomId != null && wp.roomId === hereRoomId) return true;
      if (destRoomId != null && wp.roomId === destRoomId) return true;
      return false;
    });
  }, [pathOnly, floorWaypoints, pathIds, hereRoomId, destRoomId]);

  const floorIds = useMemo(
    () => new Set(visibleWaypoints.map((wp) => String(wp.id))),
    [visibleWaypoints],
  );

  const byId = useMemo(() => {
    const map = new Map<string, NavigationWaypointDto>();
    for (const wp of floorWaypoints) map.set(String(wp.id), wp);
    for (const wp of pathOnFloor) map.set(String(wp.id), wp);
    return map;
  }, [floorWaypoints, pathOnFloor]);

  const floorEdges = useMemo(() => {
    if (pathOnly) return [];
    const ids = new Set(floorWaypoints.map((wp) => String(wp.id)));
    return edges.filter(
      (edge) =>
        ids.has(String(edge.fromWaypointId)) &&
        ids.has(String(edge.toWaypointId)),
    );
  }, [pathOnly, edges, floorWaypoints]);

  const pathSegments: Segment[] = useMemo(() => {
    const segments: Segment[] = [];
    for (let i = 1; i < pathWaypoints.length; i += 1) {
      const from = pathWaypoints[i - 1];
      const to = pathWaypoints[i];
      if (onThisFloor(from) && onThisFloor(to)) {
        segments.push({ from, to });
      }
    }
    return segments;
  }, [pathWaypoints, mapId, floorNumber]);

  const stepByWaypoint = useMemo(() => {
    const map = new Map<string, NavigationInstructionDto>();
    for (const step of instructions) {
      const id = String(step.waypointId ?? '');
      if (!id || !floorIds.has(id) || map.has(id)) continue;
      map.set(id, step);
    }
    return map;
  }, [instructions, floorIds]);

  const dotSize = box.w > 0 ? Math.round(Math.min(14, Math.max(8, box.w * 0.028))) : 10;
  const edgeW = box.w > 0 ? Math.max(1.5, box.w * 0.004) : 2;
  const pathGlow = edgeW + 3;
  const pathCore = Math.max(2, edgeW);

  const toPx = (wp: NavigationWaypointDto) => ({
    x: (wp.locationX / 100) * box.w,
    y: (wp.locationY / 100) * box.h,
  });

  if (pathOnly && pathSegments.length === 0 && visibleWaypoints.length === 0) {
    return null;
  }
  if (!pathOnly && floorWaypoints.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onLayout}>
      {box.w > 0 &&
        floorEdges.map((edge) => {
          const w1 = byId.get(String(edge.fromWaypointId));
          const w2 = byId.get(String(edge.toWaypointId));
          if (!w1 || !w2) return null;
          const a = toPx(w1);
          const b = toPx(w2);
          const style = barStyle(a.x, a.y, b.x, b.y, edgeW, '#94A3B8', 0.85);
          if (!style) return null;
          return <View key={`e-${edge.id}`} pointerEvents="none" style={style} />;
        })}

      {box.w > 0 &&
        pathSegments.map(({ from, to }, idx) => {
          const a = toPx(from);
          const b = toPx(to);
          const glow = barStyle(a.x, a.y, b.x, b.y, pathGlow, '#F59E0B', 0.35);
          const core = barStyle(a.x, a.y, b.x, b.y, pathCore, '#D97706', 1);
          return (
            <View key={`p-${from.id}-${to.id}-${idx}`} pointerEvents="none">
              {glow ? <View style={glow} /> : null}
              {core ? <View style={core} /> : null}
            </View>
          );
        })}

      {visibleWaypoints.map((wp) => {
        const room = isRoomWaypoint(wp)
          ? rooms.find((r) => r.id === wp.roomId)
          : undefined;
        const here = hereRoomId != null && wp.roomId === hereRoomId;
        const dest = destRoomId != null && wp.roomId === destRoomId;
        const label = here || dest ? roomLabel(wp, rooms) : null;
        const step = pathOnly ? stepByWaypoint.get(String(wp.id)) : undefined;
        const color = waypointColor(wp);

        const inner = (
          <View style={s.dotCol} pointerEvents="none">
            {label ? (
              <Text
                style={[s.label, here || dest ? s.labelStrong : null]}
                numberOfLines={1}
              >
                {label}
              </Text>
            ) : null}
            <View
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: here || dest ? 2 : 0,
                borderColor: '#FBBF24',
              }}
            >
              <Text style={[s.dotGlyph, { fontSize: Math.max(7, dotSize - 4) }]}>
                {here ? 'A' : dest ? 'B' : isRoomWaypoint(wp) ? 'P' : (wp.waypointType || 'H')[0]}
              </Text>
            </View>
            {step && (here || dest) ? (
              <View style={s.stepBadge}>
                <Text style={s.stepText}>{step.stepIndex}</Text>
              </View>
            ) : null}
          </View>
        );

        const pos = {
          left: `${wp.locationX}%` as const,
          top: `${wp.locationY}%` as const,
          zIndex: here || dest ? 20 : 10,
        };

        if (room && onSelectRoom && !pathOnly) {
          return (
            <TouchableOpacity
              key={wp.id}
              activeOpacity={0.85}
              onPress={() => onSelectRoom(room)}
              style={[s.anchor, pos]}
              hitSlop={8}
            >
              {inner}
            </TouchableOpacity>
          );
        }

        return (
          <View key={wp.id} pointerEvents="none" style={[s.anchor, pos]}>
            {inner}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  anchor: {
    position: 'absolute',
    width: 1,
    height: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCol: {
    alignItems: 'center',
    marginLeft: -0.5,
    marginTop: -0.5,
  },
  label: {
    maxWidth: 88,
    marginBottom: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    fontSize: 8,
    fontWeight: '700',
    color: '#065F46',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  labelStrong: {
    color: '#fff',
    backgroundColor: '#047857',
  },
  dotGlyph: {
    color: '#fff',
    fontWeight: '800',
  },
  stepBadge: {
    marginTop: 2,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 7,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
  },
});
