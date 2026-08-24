import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type {
  MuseumMapDto,
  NavigationEdgeDto,
  NavigationInstructionDto,
  NavigationWaypointDto,
  RoomDto,
} from '../services/apiService';
import { C } from '../theme/colors';
import { NavigationGraphOverlay } from './NavigationGraphOverlay';

type Props = {
  map: MuseumMapDto;
  waypoints: NavigationWaypointDto[];
  edges: NavigationEdgeDto[];
  rooms: RoomDto[];
  pathWaypoints?: NavigationWaypointDto[];
  instructions?: NavigationInstructionDto[];
  hereRoomId?: number | null;
  destRoomId?: number | null;
  showPath: boolean;
};

/** Floor photo sized to the image so the full plan is visible. */
export function FloorPathMap({
  map,
  waypoints,
  edges,
  rooms,
  pathWaypoints,
  instructions,
  hereRoomId,
  destRoomId,
  showPath,
}: Props) {
  const uri = map.imageUrl ?? '';
  const [aspect, setAspect] = useState(2.2);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) setAspect(width / height);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <View>
      <View style={styles.frame}>
        <View style={{ width: '100%', aspectRatio: aspect }}>
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              if (width > 0 && height > 0) setAspect(width / height);
            }}
          />
          {showPath ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <NavigationGraphOverlay
                mapId={map.id}
                floorNumber={map.floorNumber ?? null}
                waypoints={waypoints}
                edges={edges}
                rooms={rooms}
                pathWaypoints={pathWaypoints}
                instructions={instructions}
                hereRoomId={hereRoomId}
                destRoomId={destRoomId}
                pathOnly
              />
            </View>
          ) : null}
        </View>
      </View>
      {map.label ? <Text style={styles.caption}>{map.label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  caption: {
    marginTop: 8,
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
  },
});
