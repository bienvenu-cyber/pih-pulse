/**
 * Média PIH Pulse — pick, compression qualité maîtrisée, upload Supabase Storage.
 * Images : resize + JPEG compress. Vidéos : qualité picker + durée max + thumbnail.
 */
import * as FileSystem from 'expo-file-system';
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

const b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const b64Lookup = new Uint8Array(256);
for (let i = 0; i < b64Chars.length; i++) {
  b64Lookup[b64Chars.charCodeAt(i)] = i;
}

/** Decode Base64 to ArrayBuffer in pure JS (safe across React Native engines) */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleanB64 = base64.replace(/[\r\n]/g, '');
  const len = cleanB64.length;
  let bufferLength = len * 0.75;
  if (cleanB64[len - 1] === '=') {
    bufferLength--;
    if (cleanB64[len - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = b64Lookup[cleanB64.charCodeAt(i)];
    const encoded2 = b64Lookup[cleanB64.charCodeAt(i + 1)];
    const encoded3 = b64Lookup[cleanB64.charCodeAt(i + 2)];
    const encoded4 = b64Lookup[cleanB64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== 64) {
      bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
    }
  }

  return arrayBuffer;
}

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
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

/** Sélection image(s) ou vidéo(s) pour posts (support multi-sélection) */
export async function pickPostMedia(limit = 4): Promise<LocalMedia[]> {
  const ok = await ensureMediaPermissions(false);
  if (!ok) throw new Error('Permission galerie refusée.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsEditing: false,
    quality: 0.85,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    videoMaxDuration: MAX_VIDEO_DURATION_SEC,
    exif: false,
  });

  if (result.canceled || !result.assets?.length) return [];

  const items: LocalMedia[] = [];
  for (const a of result.assets) {
    const isVideo = (a.type === 'video') || (a.mimeType?.startsWith('video') ?? false);
    if (isVideo && a.fileSize && a.fileSize > MAX_VIDEO_BYTES) {
      throw new Error('Vidéo trop lourde (max ~40 Mo). Choisis un extrait plus court.');
    }
    items.push({
      type: isVideo ? 'video' : 'image',
      uri: a.uri,
      width: a.width,
      height: a.height,
      mimeType: a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
      fileName: a.fileName ?? undefined,
      fileSize: a.fileSize ?? undefined,
    });
  }

  return items;
}

/**
 * Compresse une image : max edge + JPEG.
 */
export async function compressImage(
  uri: string,
  opts?: { maxEdge?: number; quality?: number; sourceWidth?: number; sourceHeight?: number }
): Promise<{ uri: string; width: number; height: number }> {
  const maxEdge = opts?.maxEdge ?? MAX_IMAGE_EDGE;
  const quality = opts?.quality ?? IMAGE_QUALITY;
  const format = ImageManipulator.SaveFormat?.JPEG || 'jpeg';
  let sw = opts?.sourceWidth ?? 0;
  let sh = opts?.sourceHeight ?? 0;

  if (!sw || !sh) {
    const probe = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: format as any,
    });
    sw = probe.width;
    sh = probe.height;
    if (Math.max(sw, sh) <= maxEdge) {
      const final = await ImageManipulator.manipulateAsync(probe.uri, [], {
        compress: quality,
        format: format as any,
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
    format: format as any,
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
  if (Platform.OS === 'web' || uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('blob:')) {
    const res = await fetch(uri);
    return await res.arrayBuffer();
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(base64);
}

/**
 * Upload vers Supabase Storage
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
  const name = `${pathPrefix || kind}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
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
export async function pickAndUploadAvatar(userId?: string | null): Promise<string> {
  let uid = userId;
  if (!uid) {
    const { data: { session } } = await supabase.auth.getSession();
    uid = session?.user?.id || null;
  }
  if (!uid) throw new Error('Connecte-toi pour ajouter un avatar.');

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
    userId: uid,
    localUri: compressed.uri,
    kind: 'image',
    mimeType: 'image/jpeg',
    pathPrefix: 'avatar',
  });
}

/** Pipeline post media : pick image/video → compress si image → upload (supporte multi-sélection) */
export async function pickAndUploadPostMedia(
  userId?: string | null,
  limit = 4
): Promise<MediaAsset[]> {
  let uid = userId;
  if (!uid) {
    const { data: { session } } = await supabase.auth.getSession();
    uid = session?.user?.id || null;
  }
  if (!uid) throw new Error('Connecte-toi pour ajouter des médias.');

  const locals = await pickPostMedia(limit);
  if (!locals.length) return [];

  const results: MediaAsset[] = [];

  for (const local of locals) {
    if (local.type === 'image') {
      const compressed = await compressImage(local.uri, {
        maxEdge: MAX_IMAGE_EDGE,
        quality: IMAGE_QUALITY,
        sourceWidth: local.width,
        sourceHeight: local.height,
      });
      const url = await uploadToStorage({
        bucket: 'media',
        userId: uid,
        localUri: compressed.uri,
        kind: 'image',
        mimeType: 'image/jpeg',
        pathPrefix: 'img',
      });
      results.push({
        type: 'image',
        url,
        thumbUrl: url,
        width: compressed.width,
        height: compressed.height,
        mime: 'image/jpeg',
      });
    } else {
      const url = await uploadToStorage({
        bucket: 'media',
        userId: uid,
        localUri: local.uri,
        kind: 'video',
        mimeType: local.mimeType || 'video/mp4',
        pathPrefix: 'vid',
      });

      let thumbUrl: string | null = null;
      let thumbW = local.width;
      let thumbH = local.height;

      try {
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
            userId: uid,
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

      results.push({
        type: 'video',
        url,
        thumbUrl,
        width: local.width || thumbW,
        height: local.height || thumbH,
        mime: local.mimeType || 'video/mp4',
      });
    }
  }

  return results;
}
