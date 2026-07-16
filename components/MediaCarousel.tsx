/**
 * Carousel médias type Instagram / X :
 * - Feed : cover + ratio fixe (défaut 4:5)
 * - Adaptive : ratios 0.5–2.5, cover pour limiter les bandes
 * - Vidéo : poster (thumbUrl) + lecture expo-video
 * - Dots multi + lightbox au tap
 * - Placeholder shimmer pendant chargement
 */
import { Image as ExpoImage } from 'expo-image';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pause, Play, Volume2, VolumeX, X, ZoomIn } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image as RNImage,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import type { MediaAsset } from '../lib/media';

/** Ratios extrêmes autorisés (w/h) */
const MIN_ASPECT = 0.5; // portrait très haut
const MAX_ASPECT = 2.5; // paysage très large

export type MediaAspectMode =
  /** Instagram-like feed */
  | '4:5'
  | '1:1'
  | '16:9'
  /** Calcule depuis le média, clamp 0.5–2.5 */
  | 'adaptive';

export type MediaFit = 'cover' | 'contain';

interface Props {
  media: MediaAsset[] | null | undefined;
  /** Mode ratio conteneur — feed = 4:5 cover par défaut */
  aspectMode?: MediaAspectMode;
  /** cover = pas de bandes (défaut) ; contain = bandes possibles */
  contentFit?: MediaFit;
  maxHeight?: number;
  minHeight?: number;
  rounded?: boolean;
  /** Activer lightbox au tap (défaut true) */
  enableLightbox?: boolean;
}

function aspectFromMode(mode: MediaAspectMode): number | null {
  if (mode === '4:5') return 4 / 5;
  if (mode === '1:1') return 1;
  if (mode === '16:9') return 16 / 9;
  return null;
}

function clampAspect(width: number, height: number): number {
  if (!width || !height) return 1;
  const raw = width / height;
  return Math.min(Math.max(raw, MIN_ASPECT), MAX_ASPECT);
}

function useResolvedSize(asset: MediaAsset | undefined) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(() => {
    if (asset?.width && asset?.height) return { w: asset.width, h: asset.height };
    return null;
  });

  useEffect(() => {
    if (!asset) {
      setSize(null);
      return;
    }
    if (asset.width && asset.height) {
      setSize({ w: asset.width, h: asset.height });
      return;
    }
    const probeUrl =
      asset.type === 'image' ? asset.url : asset.thumbUrl || null;
    if (!probeUrl) {
      setSize(null);
      return;
    }
    let cancelled = false;
    RNImage.getSize(
      probeUrl,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setSize({ w, h });
      },
      () => {
        if (!cancelled) setSize(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [asset?.url, asset?.thumbUrl, asset?.width, asset?.height, asset?.type]);

  return size;
}

/** Shimmer / placeholder pendant chargement */
function MediaPlaceholder({
  width,
  height,
  rounded,
  deep,
  borderColor,
}: {
  width: number;
  height: number;
  rounded: boolean;
  deep: string;
  borderColor: string;
}) {
  return (
    <View
      style={{
        width,
        height,
        backgroundColor: deep,
        borderRadius: rounded ? 12 : 0,
        borderWidth: 1,
        borderColor,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: borderColor,
          opacity: 0.35,
        }}
      />
    </View>
  );
}

function CoverImage({
  uri,
  width,
  height,
  rounded,
  borderColor,
  deep,
  blurhash,
  contentFit,
  onPress,
}: {
  uri: string;
  width: number;
  height: number;
  rounded: boolean;
  borderColor: string;
  deep: string;
  blurhash?: string | null;
  contentFit: MediaFit;
  onPress?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Pressable
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress?.();
      }}
      disabled={!onPress}
      accessibilityRole={onPress ? 'imagebutton' : 'image'}
      accessibilityLabel="Voir le média en grand"
      {...({ role: onPress ? 'button' : 'img' } as any)}
      style={{
        width,
        height,
        backgroundColor: deep,
        borderRadius: rounded ? 12 : 0,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor,
      }}
    >
      {!loaded ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <MediaPlaceholder
            width={width}
            height={height}
            rounded={false}
            deep={deep}
            borderColor={borderColor}
          />
        </View>
      ) : null}
      <ExpoImage
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit={contentFit}
        transition={220}
        cachePolicy="memory-disk"
        placeholder={
          blurhash
            ? { blurhash }
            : { blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }
        }
        placeholderContentFit="cover"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
      {onPress ? (
        <View
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(0,0,0,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ZoomIn size={14} color="#F5EDD6" />
        </View>
      ) : null}
    </Pressable>
  );
}

function InlineVideoPlayer({
  url,
  thumbUrl,
  width,
  height,
  rounded,
  borderColor,
  deep,
  contentFit,
  onOpenLightbox,
}: {
  url: string;
  thumbUrl?: string | null;
  width: number;
  height: number;
  rounded: boolean;
  borderColor: string;
  deep: string;
  contentFit: MediaFit;
  onOpenLightbox?: () => void;
}) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.muted = false;
  });
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
    } else {
      setStarted(true);
      player.play();
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    player.muted = next;
  };

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: deep,
        borderRadius: rounded ? 12 : 0,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor,
      }}
    >
      {/* Poster tant que pas démarré */}
      {!started && thumbUrl ? (
        <ExpoImage
          source={{ uri: thumbUrl }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          contentFit={contentFit}
          transition={200}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
      ) : null}

      {started ? (
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit={contentFit === 'cover' ? 'cover' : 'contain'}
          nativeControls={Platform.OS === 'web'}
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: thumbUrl ? 'transparent' : deep }} />
      )}

      {!started || !isPlaying ? (
        <Pressable
          onPress={togglePlay}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: started ? 'transparent' : 'rgba(0,0,0,0.22)',
          }}
          accessibilityLabel={isPlaying ? 'Pause' : 'Lire la vidéo'}
        >
          {!isPlaying ? (
            <View className="w-14 h-14 rounded-full bg-black/55 items-center justify-center">
              <Play size={28} color="#FFBE0B" fill="#FFBE0B" />
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {started ? (
        <View
          style={{ position: 'absolute', right: 8, bottom: 8 }}
          className="flex-row gap-2"
        >
          <Pressable
            onPress={togglePlay}
            className="w-9 h-9 rounded-full bg-black/55 items-center justify-center"
            hitSlop={6}
          >
            {isPlaying ? (
              <Pause size={16} color="#F5EDD6" />
            ) : (
              <Play size={16} color="#FFBE0B" fill="#FFBE0B" />
            )}
          </Pressable>
          <Pressable
            onPress={toggleMute}
            className="w-9 h-9 rounded-full bg-black/55 items-center justify-center"
            hitSlop={6}
          >
            {muted ? (
              <VolumeX size={16} color="#F5EDD6" />
            ) : (
              <Volume2 size={16} color="#F5EDD6" />
            )}
          </Pressable>
        </View>
      ) : null}

      {onOpenLightbox ? (
        <Pressable
          onPress={onOpenLightbox}
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(0,0,0,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          hitSlop={6}
          accessibilityLabel="Agrandir"
        >
          <ZoomIn size={14} color="#F5EDD6" />
        </Pressable>
      ) : null}
    </View>
  );
}

function MediaFrame({
  asset,
  frameWidth,
  frameHeight,
  rounded,
  contentFit,
  onPress,
}: {
  asset: MediaAsset;
  frameWidth: number;
  frameHeight: number;
  rounded: boolean;
  contentFit: MediaFit;
  onPress?: () => void;
}) {
  const { colors } = useThemeFlavor();

  if (asset.type === 'image') {
    return (
      <CoverImage
        uri={asset.url}
        width={frameWidth}
        height={frameHeight}
        rounded={rounded}
        borderColor={colors.border}
        deep={colors.deep}
        blurhash={asset.blurhash}
        contentFit={contentFit}
        onPress={onPress}
      />
    );
  }

  return (
    <InlineVideoPlayer
      url={asset.url}
      thumbUrl={asset.thumbUrl}
      width={frameWidth}
      height={frameHeight}
      rounded={rounded}
      borderColor={colors.border}
      deep={colors.deep}
      contentFit={contentFit}
      onOpenLightbox={onPress}
    />
  );
}

function PageDots({
  count,
  index,
  activeColor,
  idleColor,
}: {
  count: number;
  index: number;
  activeColor: string;
  idleColor: string;
}) {
  if (count <= 1) return null;
  return (
    <View
      className="flex-row items-center justify-center gap-1.5 mt-2"
      accessibilityLabel={`Média ${index + 1} sur ${count}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === index ? 14 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === index ? activeColor : idleColor,
            opacity: i === index ? 1 : 0.45,
          }}
        />
      ))}
    </View>
  );
}

/** Lightbox plein écran — swipe + contain */
function MediaLightbox({
  visible,
  media,
  startIndex,
  onClose,
}: {
  visible: boolean;
  media: MediaAsset[];
  startIndex: number;
  onClose: () => void;
}) {
  const { colors } = useThemeFlavor();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [index, setIndex] = useState(startIndex);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setIndex(startIndex);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: startIndex * screenW, animated: false });
      });
    }
  }, [visible, startIndex, screenW]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / screenW);
    if (i >= 0 && i < media.length) setIndex(i);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' }}>
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 54 : 28,
            right: 16,
            zIndex: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Fermer"
        >
          <X size={20} color="#F5EDD6" />
        </Pressable>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          style={{ flex: 1 }}
        >
          {media.map((m, i) => {
            const boxW = screenW;
            const boxH = screenH * 0.78;
            return (
              <View
                key={`${m.url}-lb-${i}`}
                style={{
                  width: boxW,
                  height: screenH,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {m.type === 'image' ? (
                  <ExpoImage
                    source={{ uri: m.url }}
                    style={{ width: boxW, height: boxH }}
                    contentFit="contain"
                    transition={150}
                  />
                ) : (
                  <LightboxVideo
                    url={m.url}
                    thumbUrl={m.thumbUrl}
                    width={boxW}
                    height={boxH}
                    deep="#0A0A0A"
                  />
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0 }}>
          <PageDots
            count={media.length}
            index={index}
            activeColor={colors.turmeric}
            idleColor="#F5EDD6"
          />
        </View>
      </View>
    </Modal>
  );
}

function LightboxVideo({
  url,
  thumbUrl,
  width,
  height,
  deep,
}: {
  url: string;
  thumbUrl?: string | null;
  width: number;
  height: number;
  deep: string;
}) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.muted = false;
  });
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });
  const [started, setStarted] = useState(false);

  return (
    <View style={{ width, height, backgroundColor: deep, justifyContent: 'center' }}>
      {!started && thumbUrl ? (
        <ExpoImage
          source={{ uri: thumbUrl }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          contentFit="contain"
        />
      ) : null}
      {started ? (
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          nativeControls
        />
      ) : (
        <Pressable
          onPress={() => {
            setStarted(true);
            player.play();
          }}
          style={{
            ...StyleSheetAbsoluteFill,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View className="w-16 h-16 rounded-full bg-black/55 items-center justify-center">
            <Play size={32} color="#FFBE0B" fill="#FFBE0B" />
          </View>
        </Pressable>
      )}
      {started && !isPlaying ? (
        <Pressable
          onPress={() => player.play()}
          style={{
            position: 'absolute',
            alignSelf: 'center',
          }}
        >
          <Play size={32} color="#FFBE0B" fill="#FFBE0B" />
        </Pressable>
      ) : null}
    </View>
  );
}

const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

function useFrameSize(
  assets: MediaAsset[],
  frameWidth: number,
  aspectMode: MediaAspectMode,
  maxHeight: number,
  minHeight: number
) {
  // Premier média guide la hauteur (Instagram : une grille pour le carrousel)
  const lead = assets[0];
  const size = useResolvedSize(lead);
  const fixed = aspectFromMode(aspectMode);

  return useMemo(() => {
    let ratio: number;
    if (fixed != null) {
      ratio = fixed;
    } else if (size) {
      ratio = clampAspect(size.w, size.h);
    } else if (lead?.type === 'video') {
      ratio = 16 / 9;
    } else {
      ratio = 4 / 5;
    }
    const h = frameWidth / ratio;
    return Math.round(Math.min(maxHeight, Math.max(minHeight, h)));
  }, [fixed, size, frameWidth, maxHeight, minHeight, lead?.type]);
}

/**
 * Images + vidéos — feed (cover 4:5) ou adaptive détail.
 */
export default function MediaCarousel({
  media,
  aspectMode = '4:5',
  contentFit = 'cover',
  maxHeight,
  minHeight = 180,
  rounded = true,
  enableLightbox = true,
}: Props) {
  const { colors } = useThemeFlavor();
  const { width: screenW } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const list = media ?? [];
  const singleWidth = Math.max(280, screenW - 64);
  const multiWidth = singleWidth;
  const cap = maxHeight ?? Math.round(screenW * 0.85);
  const frameWidth = list.length === 1 ? singleWidth : multiWidth;

  const frameHeight = useFrameSize(list, frameWidth, aspectMode, cap, minHeight);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / (frameWidth + 8));
      if (i >= 0 && i < list.length) setPage(i);
    },
    [frameWidth, list.length]
  );

  if (!list.length) return null;

  const openLb = enableLightbox
    ? (i: number) => setLightbox(i)
    : undefined;

  return (
    <View>
      {list.length === 1 ? (
        <MediaFrame
          asset={list[0]}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
          rounded={rounded}
          contentFit={contentFit}
          onPress={openLb ? () => openLb(0) : undefined}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          decelerationRate="fast"
          snapToInterval={frameWidth + 8}
          snapToAlignment="start"
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}
        >
          {list.map((m, i) => (
            <MediaFrame
              key={`${m.url}-${i}`}
              asset={m}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              rounded={rounded}
              contentFit={contentFit}
              onPress={openLb ? () => openLb(i) : undefined}
            />
          ))}
        </ScrollView>
      )}

      <PageDots
        count={list.length}
        index={page}
        activeColor={colors.turmeric}
        idleColor={colors.textSecondary}
      />

      {enableLightbox ? (
        <MediaLightbox
          visible={lightbox !== null}
          media={list}
          startIndex={lightbox ?? 0}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </View>
  );
}
