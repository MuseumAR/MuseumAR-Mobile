import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigationRoute } from '../hooks/useNavigationRoute';
import { useLanguage } from '../i18n/LanguageContext';
import type {
  NavigationInstructionDto,
  NavigationWaypointDto,
  RoomDto,
  TourRouteStopDto,
} from '../services/apiService';
import { C } from '../theme/colors';
import {
  floorsAlongRoute,
  originFloorFromRoute,
  routeHasFloorChange,
  sliceInstructionsForFloorIndex,
  slicePathWaypointsForFloor,
} from '../utils/floorNavPhase';
import {
  actionIconName,
} from '../utils/navigationGraph';
import {
  arrowIconName,
  buildTourHops,
  formatRoomRef,
  roomLabel,
  type CardinalDirection,
} from '../utils/routeNavigation';

function PulsingArrow({
  direction,
  color,
  size = 28,
}: {
  direction: CardinalDirection;
  color: string;
  size?: number;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.35,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.15,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.9,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, scale]);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <MaterialCommunityIcons
        name={arrowIconName(direction)}
        size={size}
        color={color}
      />
    </Animated.View>
  );
}

/** Suggested tour = exhibit→exhibit in one room, room→room when rooms differ. */
export function TourItineraryCard({
  stops,
  stopIndex,
  accentColor,
  routeName,
  onPrev,
  onNext,
  onExit,
}: {
  stops: TourRouteStopDto[];
  stopIndex: number;
  accentColor: string;
  routeName?: string | null;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const { t, lang } = useLanguage();
  const hops = buildTourHops(stops, lang);
  const safeIndex = Math.max(0, Math.min(stopIndex, Math.max(0, stops.length - 1)));
  const current = stops[safeIndex];
  const hop = hops[safeIndex] ?? null;
  const isLast = safeIndex >= stops.length - 1;

  return (
    <View style={[s.wrap, { borderColor: accentColor + '55' }]}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>{t('content.tour')}</Text>
          <Text style={[s.title, { color: accentColor }]} numberOfLines={1}>
            {routeName || t('content.tour')}
          </Text>
        </View>
        <TouchableOpacity onPress={onExit} hitSlop={10} style={s.exitBtn}>
          <MaterialCommunityIcons name="close" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={s.progress}>
        {t('route.itinerary')} {safeIndex + 1}/{stops.length}
      </Text>

      {isLast || !hop ? (
        <View style={s.markers}>
          <View style={s.markerCol}>
            <Text style={s.markerEmoji}>🏁</Text>
            <Text style={s.markerLabel}>{t('route.lastStop')}</Text>
            <Text style={[s.markerRoom, { color: C.success }]} numberOfLines={2}>
              {current?.exhibitName || t('content.exhibit')}
            </Text>
            {current ? (
              <Text style={s.markerExhibit} numberOfLines={1}>
                {roomLabel(current, lang)}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <>
          <Text style={s.hopKind}>
            {hop.kind === 'exhibit' ? t('route.hopSameRoom') : t('route.hopChangeRoom')}
          </Text>
          <View style={s.markers}>
            <View style={s.markerCol}>
              <Text style={s.markerEmoji}>{hop.kind === 'exhibit' ? '👁' : '🚪'}</Text>
              <Text style={s.markerLabel}>
                {hop.kind === 'exhibit' ? t('route.thisExhibit') : t('route.fromRoom')}
              </Text>
              <Text style={[s.markerRoom, { color: C.success }]} numberOfLines={2}>
                {hop.fromLabel}
              </Text>
              {hop.kind === 'exhibit' ? (
                <Text style={s.markerExhibit} numberOfLines={1}>
                  {roomLabel(hop.fromStop, lang)}
                </Text>
              ) : (
                <Text style={s.markerExhibit} numberOfLines={1}>
                  {hop.fromStop.exhibitName}
                </Text>
              )}
            </View>
            <View style={s.arrowMid}>
              <MaterialCommunityIcons name="arrow-right" size={22} color={accentColor} />
            </View>
            <View style={s.markerCol}>
              <Text style={s.markerEmoji}>{hop.kind === 'exhibit' ? '🎯' : '🚪'}</Text>
              <Text style={s.markerLabel}>
                {hop.kind === 'exhibit' ? t('route.nextExhibit') : t('route.toRoom')}
              </Text>
              <Text style={[s.markerRoom, { color: accentColor }]} numberOfLines={2}>
                {hop.toLabel}
              </Text>
              {hop.kind === 'exhibit' ? (
                <Text style={s.markerExhibit} numberOfLines={1}>
                  {roomLabel(hop.toStop, lang)}
                </Text>
              ) : (
                <Text style={s.markerExhibit} numberOfLines={1}>
                  {hop.toStop.exhibitName}
                </Text>
              )}
            </View>
          </View>
        </>
      )}

      <View style={s.navRow}>
        <TouchableOpacity
          style={[s.navBtn, safeIndex <= 0 && s.navBtnDisabled]}
          disabled={safeIndex <= 0}
          onPress={onPrev}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={safeIndex <= 0 ? C.textMuted : C.textPrimary}
          />
          <Text style={[s.navBtnText, safeIndex <= 0 && { color: C.textMuted }]}>
            {t('route.prev')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.navBtnPrimary,
            { backgroundColor: accentColor },
            isLast && s.navBtnDisabled,
          ]}
          disabled={isLast}
          onPress={onNext}
        >
          <Text style={s.navBtnPrimaryText}>
            {isLast ? t('route.done') : t('route.next')}
          </Text>
          {!isLast && (
            <MaterialCommunityIcons name="chevron-right" size={22} color={C.onAccent} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

type GuideRoom = {
  roomId: number | null;
  roomName?: string | null;
  roomCode?: string | null;
};

/** Indoor path = graph only.
 * scan (default): QR locate → pick room; cross-floor uses Continue phases.
 * tour: Next/Prev between itinerary rooms — always show the full room→room path.
 */
export function NavigationGuideCard({
  from,
  to,
  rooms,
  accentColor,
  destHint,
  floorPhasesEnabled = true,
  onViewFloorChange,
  onPhaseInstructionsChange,
  onPhasePathChange,
}: {
  from: GuideRoom | null;
  to: GuideRoom | null;
  rooms: RoomDto[];
  accentColor: string;
  destHint?: string | null;
  /** false = tour itinerary: full path, no stair Continue steps */
  floorPhasesEnabled?: boolean;
  /** Active floor map follows the current Continue floor step (FE-style). */
  onViewFloorChange?: (floorNumber: number | null) => void;
  onPhaseInstructionsChange?: (steps: NavigationInstructionDto[]) => void;
  onPhasePathChange?: (waypoints: NavigationWaypointDto[]) => void;
}) {
  const { t, lang } = useLanguage();
  const fromId = from?.roomId ?? null;
  const toId = to?.roomId ?? null;
  const enabled = fromId != null && toId != null && fromId > 0 && toId > 0;

  const {
    route,
    instructions,
    hasPath,
    sameRoom,
    missingRooms,
    loading,
    error,
  } = useNavigationRoute(fromId, toId, { enabled });

  const fromRoom =
    rooms.find((r) => r.id === fromId) ??
    (from
      ? {
          roomCode: from.roomCode,
          roomName: from.roomName,
          floorNumber: undefined as number | undefined,
        }
      : null);
  const toRoom =
    rooms.find((r) => r.id === toId) ??
    (to
      ? {
          roomCode: to.roomCode,
          roomName: to.roomName,
          floorNumber: undefined as number | undefined,
        }
      : null);

  const pathWaypoints = route?.pathWaypoints ?? [];
  const crossesFloors =
    floorPhasesEnabled &&
    hasPath &&
    routeHasFloorChange(instructions, pathWaypoints);

  const pathFloors = useMemo(
    () => floorsAlongRoute(pathWaypoints, instructions),
    [pathWaypoints, instructions],
  );

  const [floorIndex, setFloorIndex] = useState(0);

  useEffect(() => {
    setFloorIndex(0);
  }, [fromId, toId]);

  useEffect(() => {
    if (pathFloors.length === 0) {
      setFloorIndex(0);
      return;
    }
    setFloorIndex((i) => Math.min(i, pathFloors.length - 1));
  }, [pathFloors.length]);

  const safeFloorIndex =
    pathFloors.length > 0
      ? Math.max(0, Math.min(floorIndex, pathFloors.length - 1))
      : 0;

  const phaseInstructions = useMemo(
    () =>
      crossesFloors
        ? sliceInstructionsForFloorIndex(instructions, safeFloorIndex)
        : instructions,
    [crossesFloors, instructions, safeFloorIndex],
  );

  const currentFloor = pathFloors[safeFloorIndex] ?? null;

  const phasePath = useMemo(
    () =>
      crossesFloors
        ? slicePathWaypointsForFloor(pathWaypoints, currentFloor)
        : pathWaypoints,
    [crossesFloors, pathWaypoints, currentFloor],
  );

  const nextFloor =
    crossesFloors && safeFloorIndex < pathFloors.length - 1
      ? pathFloors[safeFloorIndex + 1] ?? null
      : null;
  const prevFloor =
    crossesFloors && safeFloorIndex > 0
      ? pathFloors[safeFloorIndex - 1] ?? null
      : null;
  const isLastFloor =
    !crossesFloors || safeFloorIndex >= pathFloors.length - 1;

  const originFloor = useMemo(
    () =>
      originFloorFromRoute(
        pathWaypoints,
        instructions,
        fromRoom && 'floorNumber' in fromRoom
          ? (fromRoom as RoomDto).floorNumber
          : null,
      ),
    [pathWaypoints, instructions, fromRoom],
  );

  const destFloor = useMemo(() => {
    if (pathFloors.length > 0) return pathFloors[pathFloors.length - 1];
    return toRoom && 'floorNumber' in toRoom
      ? (toRoom as RoomDto).floorNumber ?? null
      : null;
  }, [pathFloors, toRoom]);

  const viewFloor = useMemo(() => {
    if (!floorPhasesEnabled) {
      // Tour: follow the destination room’s floor when the hop crosses floors.
      return destFloor ?? originFloor;
    }
    if (crossesFloors && currentFloor != null) return currentFloor;
    return originFloor ?? destFloor;
  }, [
    floorPhasesEnabled,
    crossesFloors,
    currentFloor,
    originFloor,
    destFloor,
  ]);

  const onViewFloorChangeRef = useRef(onViewFloorChange);
  onViewFloorChangeRef.current = onViewFloorChange;
  const onPhaseInstructionsChangeRef = useRef(onPhaseInstructionsChange);
  onPhaseInstructionsChangeRef.current = onPhaseInstructionsChange;
  const onPhasePathChangeRef = useRef(onPhasePathChange);
  onPhasePathChangeRef.current = onPhasePathChange;

  useEffect(() => {
    onViewFloorChangeRef.current?.(viewFloor);
  }, [viewFloor]);

  useEffect(() => {
    onPhaseInstructionsChangeRef.current?.(phaseInstructions);
  }, [phaseInstructions]);

  useEffect(() => {
    onPhasePathChangeRef.current?.(phasePath);
  }, [phasePath]);

  const distanceLabel =
    route && route.totalDistance > 0 ? `${route.totalDistance} m` : null;

  let body: ReactNode;
  if (!fromId) {
    body = (
      <Text style={s.instruction}>
        {floorPhasesEnabled ? t('nav.scanToLocate') : t('route.noRoom')}
      </Text>
    );
  } else if (!toId) {
    body = (
      <Text style={s.instruction}>
        {floorPhasesEnabled ? t('nav.pickDestination') : t('route.finished')}
      </Text>
    );
  } else if (loading) {
    body = (
      <View style={s.loadingRow}>
        <ActivityIndicator size="small" color={accentColor} />
        <Text style={s.instructionMuted}>{t('route.loadingPath')}</Text>
      </View>
    );
  } else if (sameRoom) {
    body = <Text style={s.instruction}>{t('route.sameRoom')}</Text>;
  } else if (missingRooms) {
    body = <Text style={s.instruction}>{t('route.noRoom')}</Text>;
  } else if (error) {
    body = <Text style={s.instruction}>{error}</Text>;
  } else if (hasPath && phaseInstructions.length > 0) {
    body = (
      <>
        {distanceLabel ? <Text style={s.distance}>{distanceLabel}</Text> : null}
        {crossesFloors && pathFloors.length > 1 ? (
          <View style={s.floorChipWrap}>
            <Text style={s.phaseHint}>
              {t('nav.floorsAlongPath')
                .replace('{count}', String(pathFloors.length))
                .replace(
                  '{floors}',
                  pathFloors.map((f) => `T${f}`).join(' → '),
                )}
            </Text>
            <View style={s.floorChipRow}>
              {pathFloors.map((floor, idx) => {
                const active = idx === safeFloorIndex;
                return (
                  <TouchableOpacity
                    key={`floor-${floor}-${idx}`}
                    style={[
                      s.floorChip,
                      active && {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                      },
                    ]}
                    onPress={() => setFloorIndex(idx)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        s.floorChipText,
                        active && { color: C.onAccent },
                      ]}
                    >
                      {t('nav.floorChip').replace('{floor}', String(floor))}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
        {crossesFloors ? (
          <Text style={s.phaseHint}>
            {isLastFloor
              ? t('nav.phaseContinueHint')
              : t('nav.phaseOriginHint')}
          </Text>
        ) : null}
        {phaseInstructions.map((step, i) => (
          <View key={`${step.waypointId}-${step.stepIndex}-${i}`} style={s.stepRow}>
            <MaterialCommunityIcons
              name={actionIconName(step.action)}
              size={18}
              color={accentColor}
            />
            <Text style={s.stepText}>{step.instruction}</Text>
          </View>
        ))}
        {crossesFloors && nextFloor != null ? (
          <TouchableOpacity
            style={[s.continueBtn, { backgroundColor: accentColor }]}
            onPress={() => setFloorIndex((i) => i + 1)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="stairs" size={18} color={C.onAccent} />
            <Text style={s.continueBtnText}>
              {t('nav.continueToFloor').replace('{floor}', String(nextFloor))}
            </Text>
          </TouchableOpacity>
        ) : null}
        {crossesFloors && prevFloor != null ? (
          <TouchableOpacity
            style={s.backFloorBtn}
            onPress={() => setFloorIndex((i) => Math.max(0, i - 1))}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color={accentColor} />
            <Text style={[s.backFloorText, { color: accentColor }]}>
              {t('nav.backToOriginFloor').replace('{floor}', String(prevFloor))}
            </Text>
          </TouchableOpacity>
        ) : null}
      </>
    );
  } else if (instructions.length > 0) {
    body = (
      <Text style={s.instruction}>
        {instructions.map((step) => step.instruction).filter(Boolean).join('\n')}
      </Text>
    );
  } else {
    body = <Text style={s.instruction}>{t('route.noPath')}</Text>;
  }

  return (
    <View style={[s.wrap, { borderColor: accentColor + '40' }]}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>{t('route.graphKicker')}</Text>
          <Text style={[s.title, { color: accentColor }]} numberOfLines={1}>
            {t('route.howToGo')}
          </Text>
        </View>
      </View>

      <View style={s.markers}>
        <View style={s.markerCol}>
          <Text style={s.markerEmoji}>📍</Text>
          <Text style={s.markerLabel}>
            {floorPhasesEnabled ? t('route.youAreHere') : t('route.fromRoom')}
          </Text>
          <Text style={[s.markerRoom, { color: C.success }]} numberOfLines={2}>
            {fromId ? formatRoomRef(fromRoom, lang) : t('nav.unknownHere')}
          </Text>
        </View>
        <View style={s.arrowMid}>
          <PulsingArrow direction="arrow-right" color={accentColor} size={32} />
        </View>
        <View style={s.markerCol}>
          <Text style={s.markerEmoji}>🎯</Text>
          <Text style={s.markerLabel}>
            {floorPhasesEnabled ? t('nav.destination') : t('route.toRoom')}
          </Text>
          <Text style={[s.markerRoom, { color: accentColor }]} numberOfLines={2}>
            {toId ? formatRoomRef(toRoom, lang) : '—'}
          </Text>
          {destHint ? (
            <Text style={s.markerExhibit} numberOfLines={1}>
              {destHint}
            </Text>
          ) : null}
        </View>
      </View>

      {body}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  exitBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  progress: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  hopKind: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  markers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markerCol: { flex: 1, gap: 2 },
  markerEmoji: { fontSize: 16 },
  markerLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600' },
  markerRoom: { fontSize: 13, fontWeight: '800' },
  markerExhibit: { fontSize: 11, color: C.textSecondary },
  arrowMid: { width: 40, alignItems: 'center', justifyContent: 'center' },
  instruction: {
    fontSize: 14,
    lineHeight: 20,
    color: C.textPrimary,
    fontWeight: '600',
  },
  instructionMuted: {
    fontSize: 14,
    lineHeight: 20,
    color: C.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distance: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  phaseHint: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '600',
    lineHeight: 18,
  },
  floorChipWrap: { gap: 8 },
  floorChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  floorChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
  },
  floorChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.textPrimary,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: C.textPrimary,
    fontWeight: '600',
  },
  continueBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  continueBtnText: { fontSize: 14, fontWeight: '800', color: C.onAccent },
  backFloorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backFloorText: { fontSize: 13, fontWeight: '700' },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
  },
  navBtnDisabled: { opacity: 0.45 },
  navBtnText: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  navBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
  },
  navBtnPrimaryText: { fontSize: 14, fontWeight: '800', color: C.onAccent },
});
