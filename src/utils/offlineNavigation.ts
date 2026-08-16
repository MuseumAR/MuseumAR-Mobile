import type {
  NavigationGraphDto,
  NavigationInstructionDto,
  NavigationRouteResponseDto,
  NavigationWaypointDto,
  RoomDto,
} from '../services/apiService';

function displayRoomName(rooms: RoomDto[], id: number, en: boolean): string {
  const room = rooms.find((item) => item.id === id);
  if (!room) return en ? `Room ${id}` : `Phòng ${id}`;
  return room.roomName?.trim() || room.roomCode || (en ? `Room ${id}` : `Phòng ${id}`);
}

function pickRoomWaypoint(
  graph: NavigationGraphDto,
  roomId: number,
): NavigationWaypointDto | undefined {
  return graph.waypoints.find((wp) => wp.roomId === roomId);
}

function emptyRoute(
  fromRoomId: number,
  fromRoomName: string,
  toRoomId: number,
  toRoomName: string,
  instruction: string,
  waypointId = '',
): NavigationRouteResponseDto {
  return {
    fromRoomId,
    fromRoomName,
    toRoomId,
    toRoomName,
    totalDistance: 0,
    pathWaypoints: [],
    instructions: [
      {
        stepIndex: 1,
        instruction,
        action: 'ARRIVE',
        distance: 0,
        floorNumber: 1,
        waypointId,
      },
    ],
  };
}

function generateInstructions(
  path: NavigationWaypointDto[],
  fromRoomName: string,
  toRoomName: string,
  en: boolean,
): NavigationInstructionDto[] {
  const instructions: NavigationInstructionDto[] = [];
  if (path.length === 0) return instructions;

  let stepIndex = 1;
  instructions.push({
    stepIndex: stepIndex++,
    instruction: en
      ? `Start from ${fromRoomName}`
      : `Bắt đầu di chuyển từ ${fromRoomName}`,
    action: 'STRAIGHT',
    distance: 0,
    floorNumber: path[0].floorNumber,
    waypointId: path[0].id,
  });

  for (let i = 0; i < path.length - 1; i += 1) {
    const w1 = path[i];
    const w2 = path[i + 1];

    if (w1.floorNumber !== w2.floorNumber) {
      const action = w2.floorNumber > w1.floorNumber ? 'STAIR_UP' : 'STAIR_DOWN';
      const actionText =
        w2.waypointType === 'ELEVATOR'
          ? en
            ? 'Take the elevator'
            : 'Đi thang máy'
          : en
            ? 'Take the stairs'
            : 'Đi cầu thang';
      const floorWord = en ? 'Floor' : 'Tầng';
      const toWord = en ? 'to' : 'lên';
      instructions.push({
        stepIndex: stepIndex++,
        instruction: `${actionText} ${toWord} ${floorWord} ${w2.floorNumber}`,
        action,
        distance: 1,
        floorNumber: w2.floorNumber,
        waypointId: w2.id,
      });
      continue;
    }

    const dx = w2.locationX - w1.locationX;
    const dy = w2.locationY - w1.locationY;
    const distVal = Math.round(Math.sqrt(dx * dx + dy * dy) * 10) / 10;
    let turnText = en ? 'Go straight' : 'Đi thẳng';
    let action = 'STRAIGHT';

    if (i > 0) {
      const w0 = path[i - 1];
      if (w0.floorNumber === w1.floorNumber) {
        const v1x = w1.locationX - w0.locationX;
        const v1y = w1.locationY - w0.locationY;
        const v2x = w2.locationX - w1.locationX;
        const v2y = w2.locationY - w1.locationY;
        const crossProduct = v1x * v2y - v1y * v2x;
        if (crossProduct > 10) {
          turnText = en ? 'Turn right' : 'Rẽ phải';
          action = 'TURN_RIGHT';
        } else if (crossProduct < -10) {
          turnText = en ? 'Turn left' : 'Rẽ trái';
          action = 'TURN_LEFT';
        }
      }
    }

    const via =
      w2.name ??
      (w2.waypointType === 'DOOR'
        ? en
          ? 'the doorway'
          : 'cửa phòng'
        : en
          ? 'the hallway'
          : 'hành lang');
    const through = en ? 'through' : 'qua';
    instructions.push({
      stepIndex: stepIndex++,
      instruction: `${turnText} ${through} ${via}`,
      action,
      distance: distVal,
      floorNumber: w2.floorNumber,
      waypointId: w2.id,
    });
  }

  const last = path[path.length - 1];
  instructions.push({
    stepIndex: stepIndex,
    instruction: en ? `Arrived at ${toRoomName}` : `Đã đến ${toRoomName}`,
    action: 'ARRIVE',
    distance: 0,
    floorNumber: last.floorNumber,
    waypointId: last.id,
  });
  return instructions;
}

/**
 * Room-to-room walk from a cached museum graph — same Dijkstra as WebBE NavigateAsync.
 */
export function routeFromGraph(
  graph: NavigationGraphDto,
  rooms: RoomDto[],
  fromRoomId: number,
  toRoomId: number,
  lang?: string,
): NavigationRouteResponseDto {
  const en = (lang ?? 'vi').toLowerCase().startsWith('en');
  const fromRoomName = displayRoomName(rooms, fromRoomId, en);
  const toRoomName = displayRoomName(rooms, toRoomId, en);
  const startWp = pickRoomWaypoint(graph, fromRoomId);
  const endWp = pickRoomWaypoint(graph, toRoomId);

  if (!startWp || !endWp) {
    return emptyRoute(
      fromRoomId,
      fromRoomName,
      toRoomId,
      toRoomName,
      en
        ? `Navigation waypoints are not set up for ${fromRoomName} or ${toRoomName}.`
        : `Chưa thiết lập nốt chỉ đường cho phòng ${fromRoomName} hoặc ${toRoomName}.`,
    );
  }

  const adj = new Map<string, Array<{ toId: string; dist: number }>>();
  for (const wp of graph.waypoints) adj.set(wp.id, []);
  for (const edge of graph.edges) {
    const dist = edge.distance > 0 ? edge.distance : 1;
    adj.get(edge.fromWaypointId)?.push({ toId: edge.toWaypointId, dist });
    if (edge.isBidirectional !== false) {
      adj.get(edge.toWaypointId)?.push({ toId: edge.fromWaypointId, dist });
    }
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  for (const wp of graph.waypoints) dist.set(wp.id, Number.POSITIVE_INFINITY);
  dist.set(startWp.id, 0);

  const remaining = new Set(graph.waypoints.map((wp) => wp.id));
  while (remaining.size > 0) {
    let currId: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const id of remaining) {
      const d = dist.get(id) ?? Number.POSITIVE_INFINITY;
      if (d < best) {
        best = d;
        currId = id;
      }
    }
    if (currId == null || best === Number.POSITIVE_INFINITY) break;
    remaining.delete(currId);
    if (currId === endWp.id) break;
    for (const neighbor of adj.get(currId) ?? []) {
      const next = best + neighbor.dist;
      if (next < (dist.get(neighbor.toId) ?? Number.POSITIVE_INFINITY)) {
        dist.set(neighbor.toId, next);
        prev.set(neighbor.toId, currId);
      }
    }
  }

  const total = dist.get(endWp.id) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(total)) {
    return emptyRoute(
      fromRoomId,
      fromRoomName,
      toRoomId,
      toRoomName,
      en
        ? `No path found from ${fromRoomName} to ${toRoomName}.`
        : `Không tìm thấy tuyến đường nối từ ${fromRoomName} đến ${toRoomName}.`,
      startWp.id,
    );
  }

  const pathIds: string[] = [];
  let curr = endWp.id;
  while (curr !== startWp.id) {
    pathIds.push(curr);
    const parent = prev.get(curr);
    if (!parent) {
      return emptyRoute(
        fromRoomId,
        fromRoomName,
        toRoomId,
        toRoomName,
        en
          ? `No path found from ${fromRoomName} to ${toRoomName}.`
          : `Không tìm thấy tuyến đường nối từ ${fromRoomName} đến ${toRoomName}.`,
        startWp.id,
      );
    }
    curr = parent;
  }
  pathIds.push(startWp.id);
  pathIds.reverse();

  const byId = new Map(graph.waypoints.map((wp) => [wp.id, wp]));
  const pathWaypoints = pathIds
    .map((id) => byId.get(id))
    .filter((wp): wp is NavigationWaypointDto => Boolean(wp));

  return {
    fromRoomId,
    fromRoomName,
    toRoomId,
    toRoomName,
    totalDistance: Math.round(total * 10) / 10,
    pathWaypoints,
    instructions: generateInstructions(pathWaypoints, fromRoomName, toRoomName, en),
  };
}
