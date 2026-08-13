import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TourRouteStopDto } from '../services/apiService';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigationRoute } from '../hooks/useNavigationRoute';
import { C } from '../theme/colors';
import {
  arrowIconName,
  buildRouteStepGuide,
  roomLabel,
  type CardinalDirection,
  type RouteStepGuide,
} from '../utils/routeNavigation';
import type { RoomDto } from '../services/apiService';

type Props = {
  stops: TourRouteStopDto[];
  /** Index of current stop (you are here). Next = stopIndex + 1. */
  stopIndex: number;
  rooms: RoomDto[];
  accentColor: string;
  routeName?: string | null;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
};

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

/** Quick direction pads — highlight the active move direction. */
function DirectionPads({
  active,
  accentColor,
}: {
  active: CardinalDirection[];
  accentColor: string;
}) {
  const dirs: CardinalDirection[] = ['up', 'left', 'right', 'down'];
  return (
    <View style={s.padGrid}>
      {dirs.map((d) => {
        const on = active.includes(d);
        return (
          <View
            key={d}
            style={[
              s.pad,
              d === 'up' && s.padUp,
              d === 'down' && s.padDown,
              d === 'left' && s.padLeft,
              d === 'right' && s.padRight,
              on && { borderColor: accentColor, backgroundColor: accentColor + '22' },
            ]}
          >
            <MaterialCommunityIcons
              name={arrowIconName(d)}
              size={18}
              color={on ? accentColor : C.textMuted}
            />
          </View>
        );
      })}
    </View>
  );
}

export function RouteNavigationOverlay({
  stops,
  stopIndex,
  rooms,
  accentColor,
  routeName,
  onPrev,
  onNext,
  onExit,
}: Props) {
  const { t, lang } = useLanguage();
  const safeIndex = Math.max(0, Math.min(stopIndex, Math.max(0, stops.length - 1)));
  const current = stops[safeIndex];
  const next = stops[safeIndex + 1];
  const isLast = safeIndex >= stops.length - 1;

  const { instructionText: beInstruction } = useNavigationRoute(
    current?.roomId,
    next?.roomId,
  );

  let guide: RouteStepGuide | null = null;
  if (current && next) {
    guide = buildRouteStepGuide(current, next, rooms, lang);
  }

  const instructionDisplay = beInstruction || guide?.instructionVi || null;

  return (
    <View style={[s.wrap, { borderColor: accentColor + '55' }]}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>{t('route.title')}</Text>
          <Text style={[s.title, { color: accentColor }]} numberOfLines={1}>
            {routeName || t('content.tour')}
          </Text>
        </View>
        <TouchableOpacity onPress={onExit} hitSlop={10} style={s.exitBtn}>
          <MaterialCommunityIcons name="close" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={s.progress}>
        {t('route.step')} {safeIndex + 1}/{stops.length}
        {current ? ` · ${roomLabel(current, lang)}` : ''}
      </Text>

      <View style={s.markers}>
        <View style={s.markerCol}>
          <Text style={s.markerEmoji}>📍</Text>
          <Text style={s.markerLabel}>{t('route.youAreHere')}</Text>
          <Text style={[s.markerRoom, { color: C.success }]} numberOfLines={2}>
            {current ? roomLabel(current, lang) : '—'}
          </Text>
          {current?.exhibitName ? (
            <Text style={s.markerExhibit} numberOfLines={1}>
              {current.exhibitName}
            </Text>
          ) : null}
        </View>

        <View style={s.arrowMid}>
          {guide ? (
            <PulsingArrow direction={guide.direction} color={accentColor} size={32} />
          ) : (
            <MaterialCommunityIcons name="flag-checkered" size={28} color={accentColor} />
          )}
        </View>

        <View style={s.markerCol}>
          <Text style={s.markerEmoji}>{isLast ? '🏁' : '🎯'}</Text>
          <Text style={s.markerLabel}>
            {isLast ? t('route.lastStop') : t('route.nextExhibit')}
          </Text>
          <Text style={[s.markerRoom, { color: accentColor }]} numberOfLines={2}>
            {next
              ? roomLabel(next, lang)
              : current
                ? roomLabel(current, lang)
                : '—'}
          </Text>
          {(next ?? current)?.exhibitName ? (
            <Text style={s.markerExhibit} numberOfLines={1}>
              {(next ?? current)?.exhibitName}
            </Text>
          ) : null}
        </View>
      </View>

      {instructionDisplay ? (
        <>
          <Text style={s.instruction}>{instructionDisplay}</Text>
          {guide ? (
            <DirectionPads active={guide.directions} accentColor={accentColor} />
          ) : null}
        </>
      ) : (
        <Text style={s.instruction}>{t('route.finished')}</Text>
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
          <Text
            style={[
              s.navBtnText,
              safeIndex <= 0 && { color: C.textMuted },
            ]}
          >
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

/** Compact arrows drawn between two room tiles on the floor-plan canvas. */
export function FloorPlanDirectionArrows({
  direction,
  accentColor,
}: {
  direction: CardinalDirection;
  accentColor: string;
}) {
  return (
    <View style={s.canvasArrow} pointerEvents="none">
      <PulsingArrow direction={direction} color={accentColor} size={26} />
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
  padGrid: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    position: 'relative',
  },
  pad: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padUp: { top: 0, left: 42 },
  padDown: { bottom: 0, left: 42 },
  padLeft: { top: 42, left: 0 },
  padRight: { top: 42, right: 0 },
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
  canvasArrow: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    zIndex: 5,
    backgroundColor: 'rgba(12,15,28,0.72)',
    borderRadius: 20,
    padding: 6,
  },
});
