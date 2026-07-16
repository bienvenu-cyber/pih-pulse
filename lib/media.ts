/**
 * Média PIH Pulse — pick, compression qualité maîtrisée, upload Supabase Storage.
 * Images : resize + JPEG compress. Vidéos : qualité picker + durée max + thumbnail.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type MediaKind = 'image' | 'video';

export interface MediaAsset {
  type: MediaKind;
  url: string;
  /** Miniature (image = même url ou thumb ; vidéo = frame JPEG uploadée) */
  thumbUrl?: string | null;
  width?: number;
  height?: number;
  mime?: string;
  /** Placeholder optionnel (blurhash) si généré un jour */
  blurhash?: string | null;
}

export interface LocalMedia {
  type: MediaKind;
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
}

const MAX_IMAGE_EDGE = 1280;
const AVATAR_EDGE = 512;
const IMAGE_QUALITY = 0.78;
const AVATAR_QUALITY = 0.82;
const MAX_VIDEO_DURATION_SEC = 60;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // 40 Mo

async function ensureMediaPermissions(needCamera = false): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!lib.granted) return false;
  if (needCamera) {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) return false;
  }
  return true;
}

/** Sélection image galerie (1) */
export async function pickImage(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
}): Promise<LocalMedia | null> {
  const ok = await ensureMediaPermissions(false);
  if (!ok) throw new Error('Permission galerie refusée.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect ?? [1, 1],
    quality: 1,
    exif: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return {
    type: 'image',
    uri: a.uri,
    width: a.width,
    height: a.height,
    mimeType: a.mimeType ?? 'image/jpeg',
    fileName: a.fileName ?? undefined,
    fileSize: a.fileSize ?? undefined,
  };
}

/** Sélection image ou vidéo pour posts */
export async function pickPostMedia(): Promise<LocalMedia | null> {
  const ok = await ensureMediaPermissions(false);
  if (!ok) throw new Error('Permission galerie refusée.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsEditing: false,
    quality: 0.85,
    videoMaxDuration: MAX_VIDEO_DURATION_SEC,
    exif: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  const isVideo = (a.type === 'video') || (a.mimeType?.startsWith('video') ?? false);

  if (isVideo && a.fileSize && a.fileSize > MAX_VIDEO_BYTES) {
    throw new Error('Vidéo trop lourde (max ~40 Mo). Choisis un extrait plus court.');
  }

  return {
    type: isVideo ? 'video' : 'image',
    uri: a.uri,
    width: a.width,
    height: a.height,
    mimeType: a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
    fileName: a.fileName ?? undefined,
    fileSize: a.fileSize ?? undefined,
  };
}

/**
 * Compresse une image : max edge + JPEG.
 * - Pas de crop / pas de square force
 * - Conserve le ratio d’origine (un seul côté resize → aspect préservé)
 * - Pas d’upscale si déjà plus petit que maxEdge
 */
export async function compressImage(
  uri: string,
  opts?: { maxEdge?: number; quality?: number; sourceWidth?: number; sourceHeight?: number }
): Promise<{ uri: string; width: number; height: number }> {
  const maxEdge = opts?.maxEdge ?? MAX_IMAGE_EDGE;
  const quality = opts?.quality ?? IMAGE_QUALITY;
  let sw = opts?.sourceWidth ?? 0;
  let sh = opts?.sourceHeight ?? 0;

  // Dimensions inconnues : probe sans recompress forcée pour connaître le ratio
  if (!sw || !sh) {
    const probe = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    sw = probe.width;
    sh = probe.height;
    // Si déjà sous la limite, on peut repartir du probe compressé ensuite
    if (Math.max(sw, sh) <= maxEdge) {
      const final = await ImageManipulator.manipulateAsync(probe.uri, [], {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return { uri: final.uri, width: final.width, height: final.height };
    }
    uri = probe.uri;
  }

  const actions: ImageManipulator.Action[] = [];
  if (Math.max(sw, sh) > maxEdge) {
    if (sw >= sh) {
      actions.push({ resize: { width: maxEdge } });
    } else {
      actions.push({ resize: { height: maxEdge } });
    }
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

function guessExt(mime?: string, kind: MediaKind = 'image'): string {
  if (kind === 'video') return 'mp4';
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('webp')) return 'webp';
  return 'jpg';
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  // fetch works for file:// and blob on RN/web
  const res = await fetch(uri);
  return await res.arrayBuffer();
}

/**
 * Upload vers Supabase Storage
 * bucket: avatars | media
 */
export async function uploadToStorage(params: {
  bucket: 'avatars' | 'media';
  userId: string;
  localUri: string;
  kind: MediaKind;
  mimeType?: string;
  pathPrefix?: string;
}): Promise<string> {
  const { bucket, userId, localUri, kind, mimeType, pathPrefix } = params;
  const ext = guessExt(mimeType, kind);
  const name = `${pathPrefix || kind}_${Date.now()}.${ext}`;
  const path = `${userId}/${name}`;

  const body = await uriToArrayBuffer(localUri);
  const contentType =
    mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg');

  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
    cacheControl: '3600',
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Pipeline avatar : pick → compress carré 512 → upload → URL */
export async function pickAndUploadAvatar(userId: string): Promise<string> {
  const local = await pickImage({ allowsEditing: true, aspect: [1, 1] });
  if (!local) throw new Error('CANCELLED');

  const compressed = await compressImage(local.uri, {
    maxEdge: AVATAR_EDGE,
    quality: AVATAR_QUALITY,
    sourceWidth: local.width,
    sourceHeight: local.height,
  });

  return uploadToStorage({
    bucket: 'avatars',
    userId,
    localUri: compressed.uri,
    kind: 'image',
    mimeType: 'image/jpeg',
    pathPrefix: 'avatar',
  });
}

/** Pipeline post media : pick image/video → compress si image → upload */
export async function pickAndUploadPostMedia(userId: string): Promise<MediaAsset> {
  const local = await pickPostMedia();
  if (!local) throw new Error('CANCELLED');

  if (local.type === 'image') {
    const compressed = await compressImage(local.uri, {
      maxEdge: MAX_IMAGE_EDGE,
      quality: IMAGE_QUALITY,
      sourceWidth: local.width,
      sourceHeight: local.height,
    });
    const url = await uploadToStorage({
      bucket: 'media',
      userId,
      localUri: compressed.uri,
      kind: 'image',
      mimeType: 'image/jpeg',
      pathPrefix: 'img',
    });
    return {
      type: 'image',
      url,
      thumbUrl: url,
      width: compressed.width,
      height: compressed.height,
      mime: 'image/jpeg',
    };
  }

  // Vidéo : upload + thumbnail (frame) pour preview feed
  const url = await uploadToStorage({
    bucket: 'media',
    userId,
    localUri: local.uri,
    kind: 'video',
    mimeType: local.mimeType || 'video/mp4',
    pathPrefix: 'vid',
  });

  let thumbUrl: string | null = null;
  let thumbW = local.width;
  let thumbH = local.height;

  try {
    // Frame à ~0.4 s (fallback 0 si court)
    const times = [400, 0, 1000];
    let thumbLocal: string | null = null;
    for (const t of times) {
      try {
        const res = await VideoThumbnails.getThumbnailAsync(local.uri, {
          time: t,
          quality: 0.7,
        });
        if (res?.uri) {
          thumbLocal = res.uri;
          thumbW = res.width || thumbW;
          thumbH = res.height || thumbH;
          break;
        }
      } catch {
        /* try next time */
      }
    }

    if (thumbLocal) {
      const compressed = await compressImage(thumbLocal, {
        maxEdge: 720,
        quality: 0.72,
        sourceWidth: thumbW,
        sourceHeight: thumbH,
      });
      thumbUrl = await uploadToStorage({
        bucket: 'media',
        userId,
        localUri: compressed.uri,
        kind: 'image',
        mimeType: 'image/jpeg',
        pathPrefix: 'vthumb',
      });
      thumbW = compressed.width;
      thumbH = compressed.height;
    }
  } catch (e) {
    console.warn('[media] video thumbnail failed:', e);
  }

  return {
    type: 'video',
    url,
    thumbUrl,
    width: local.width || thumbW,
    height: local.height || thumbH,
    mime: local.mimeType || 'video/mp4',
  };
}

