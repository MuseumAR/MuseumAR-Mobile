import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExhibitArAssets } from '../../src/hooks/useExhibitArAssets';
import { useExhibitDetail } from '../../src/hooks/useExhibitDetail';
import { useTrackAction } from '../../src/hooks/useTrackAction';
import { useVisitedExhibits } from '../../src/hooks/useVisitedExhibits';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { C } from '../../src/theme/colors';
import { parseNumericId } from '../../src/utils/parseId';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ARViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLanguage();
  const { exhibit: data, loading: dataLoading } = useExhibitDetail(id);
  const exhibitId = parseNumericId(id);
  const museumId = parseNumericId(data?.museumId);
  const { audioAsset } = useExhibitArAssets(exhibitId);

  // null = no source ('' recreates/releases the native player and causes "already released")
  const audioUrl = (audioAsset?.url ?? data?.audioUrl ?? '').trim();
  const audioSource = audioUrl.length > 0 ? audioUrl : null;
  const player = useAudioPlayer(audioSource, { updateInterval: 250, downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const { recordVisit } = useVisitedExhibits();
  const { track } = useTrackAction();
  const mountTimeRef = useRef(Date.now());
  const audioTrackedRef = useRef(false);

  const [activeTranscript, setActiveTranscript] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const safePlay = useCallback(() => {
    try {
      player.play();
    } catch {
      // Player may have been released after source change / unmount
    }
  }, [player]);

  const safePause = useCallback(() => {
    try {
      player.pause();
    } catch {
      // ignore
    }
  }, [player]);

  const safeSeek = useCallback(
    (time: number) => {
      try {
        player.seekTo(Math.max(0, time));
      } catch {
        // ignore
      }
    },
    [player],
  );

  // Pulse + rotate animation when playing
  useEffect(() => {
    if (status.playing) {
      rotateAnim.setValue(0);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      rotate.start();
      return () => {
        pulse.stop();
        rotate.stop();
      };
    }
    pulseAnim.setValue(1);
  }, [status.playing, pulseAnim, rotateAnim]);

  // Auto-advance transcript based on playback position
  useEffect(() => {
    if (!data || !status.playing) return;
    const totalSegments = data.transcript.length;
    if (totalSegments < 1) return;
    const duration = status.duration ?? data.audioDuration;
    if (!duration || duration <= 0) return;
    const segmentDuration = duration / totalSegments;
    const idx = Math.min(
      Math.floor((status.currentTime ?? 0) / segmentDuration),
      totalSegments - 1,
    );
    setActiveTranscript(idx);
  }, [status.currentTime, status.playing, data, status.duration]);

  // Auto-play only after a real source exists and the player finished loading
  useEffect(() => {
    if (!audioSource || !status.isLoaded) return;
    const timer = setTimeout(() => safePlay(), 400);
    return () => {
      clearTimeout(timer);
      safePause();
    };
  }, [audioSource, status.isLoaded, safePlay, safePause]);

  useEffect(() => {
    if (exhibitId == null) return;
    mountTimeRef.current = Date.now();
    return () => {
      const seconds = Math.round((Date.now() - mountTimeRef.current) / 1000);
      recordVisit(exhibitId, seconds);
    };
  }, [exhibitId, recordVisit]);

  useEffect(() => {
    if (!status.playing || audioTrackedRef.current || exhibitId == null) return;
    audioTrackedRef.current = true;
    track({
      actionType: 'PlayAudio',
      exhibitId,
      museumId,
      languageUsed: lang,
    });
  }, [status.playing, exhibitId, museumId, track, lang]);

  const skip = (secs: number) => {
    safeSeek((status.currentTime ?? 0) + secs);
  };

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          {dataLoading ? (
            <ActivityIndicator color={C.accent} />
          ) : (
            <>
              <Text style={styles.errorText}>Không tìm thấy thuyết minh</Text>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backBtnText}>Quay lại</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const progress = status.duration
    ? Math.min((status.currentTime ?? 0) / status.duration, 1)
    : 0;

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Artifact visual */}
        <View style={[styles.hero, { backgroundColor: data.color + '18' }]}>
          <Animated.View
            style={[styles.emojiRing, { borderColor: data.color + '40', transform: [{ rotate: spin }] }]}
          />
          <Animated.Text style={[styles.emoji, { transform: [{ scale: pulseAnim }] }]}>
            {data.emoji}
          </Animated.Text>
          <View style={styles.heroBadge}>
            <Text style={[styles.heroBadgeText, { color: data.color }]}>{data.category}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.era}>{data.era}</Text>
        </View>

        {/* Highlights */}
        <View style={styles.highlightsRow}>
          {data.highlights.map((h, i) => (
            <View key={i} style={styles.highlightChip}>
              <Text style={styles.highlightText}>{h}</Text>
            </View>
          ))}
        </View>

        {/* Audio player card */}
        <View style={styles.playerCard}>
          <View style={styles.playerHeader}>
            <MaterialCommunityIcons name="volume-high" size={18} color={data.color} />
            <Text style={[styles.playerTitle, { color: data.color }]}>Thuyết minh</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressOuter}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: data.color }]} />
          </View>

          {/* Time */}
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(status.currentTime ?? 0)}</Text>
            <Text style={styles.timeText}>{formatTime(status.duration ?? data.audioDuration)}</Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.skipBtn} onPress={() => skip(-10)}>
              <MaterialCommunityIcons name="rewind-10" size={28} color={C.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: data.color }]}
              onPress={() => (status.playing ? safePause() : safePlay())}
            >
              <MaterialCommunityIcons
                name={status.playing ? 'pause' : 'play'}
                size={32}
                color={C.onAccent}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={() => skip(10)}>
              <MaterialCommunityIcons name="fast-forward-10" size={28} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Transcript */}
        <View style={styles.transcriptSection}>
          <Text style={styles.transcriptHeader}>Nội dung thuyết minh</Text>
          {data.transcript.map((para, i) => (
            <View
              key={i}
              style={[
                styles.transcriptPara,
                i === activeTranscript && status.playing && styles.transcriptParaActive,
              ]}
            >
              {i === activeTranscript && status.playing && (
                <View style={[styles.activeBar, { backgroundColor: data.color }]} />
              )}
              <Text
                style={[
                  styles.transcriptText,
                  i === activeTranscript && status.playing && { color: C.textPrimary, fontWeight: '600' },
                ]}
              >
                {para}
              </Text>
            </View>
          ))}
        </View>

        {/* Detail button */}
        <TouchableOpacity
          style={[styles.detailBtn, { borderColor: data.color }]}
          onPress={() => router.push(`/exhibit/${data.id}`)}
        >
          <MaterialCommunityIcons name="image-frame" size={18} color={data.color} />
          <Text style={[styles.detailBtnText, { color: data.color }]}>Xem chi tiết hiện vật</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { fontSize: 16, color: C.textMuted },
  backBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: '#FFF', fontWeight: '700' },
  hero: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emojiRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  emoji: { fontSize: 80 },
  heroBadge: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: C.bgSurface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  titleSection: { paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 26, fontWeight: '800', color: C.textPrimary },
  era: { fontSize: 14, color: C.textSecondary, marginTop: 4 },
  highlightsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, marginTop: 14 },
  highlightChip: { backgroundColor: C.accentMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  highlightText: { fontSize: 12, color: C.accent, fontWeight: '600' },
  playerCard: {
    margin: 24,
    backgroundColor: C.bgSurface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  playerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  playerTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  progressOuter: { height: 6, backgroundColor: C.bgElevated, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  timeText: { fontSize: 12, color: C.textMuted },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 16 },
  skipBtn: { padding: 8 },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  transcriptSection: { paddingHorizontal: 24 },
  transcriptHeader: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 14 },
  transcriptPara: {
    backgroundColor: C.bgSurface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  transcriptParaActive: { backgroundColor: C.accentMuted, borderColor: C.accent + '50' },
  activeBar: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  transcriptText: { flex: 1, fontSize: 15, color: C.textSecondary, lineHeight: 24 },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 24,
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    backgroundColor: C.bgSurface,
  },
  detailBtnText: { fontSize: 15, fontWeight: '700' },
});
