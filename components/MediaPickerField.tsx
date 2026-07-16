import { Image as ImageIcon, Trash2, Video } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import {
  pickAndUploadPostMedia,
  type MediaAsset,
} from '../lib/media';

interface Props {
  userId: string | null;
  value: MediaAsset[];
  onChange: (next: MediaAsset[]) => void;
  maxItems?: number;
  label?: string;
}

/**
 * Sélecteur multi-média pour création de projet / mission.
 * Compresse les images avant upload Storage.
 */
export default function MediaPickerField({
  userId,
  value,
  onChange,
  maxItems = 4,
  label = 'Médias (images / vidéos)',
}: Props) {
  const { colors } = useThemeFlavor();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const addMedia = async () => {
    if (!userId) {
      setError('Connecte-toi pour ajouter des médias.');
      return;
    }
    if (value.length >= maxItems) {
      setError(`Maximum ${maxItems} médias.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const asset = await pickAndUploadPostMedia(userId);
      onChange([...value, asset]);
    } catch (e: any) {
      if (e?.message === 'CANCELLED') return;
      setError(e?.message || 'Échec upload média.');
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <View className="gap-2">
      <Text
        style={{ color: colors.textSecondary }}
        className="font-inter text-[11px] uppercase font-semibold tracking-wider"
      >
        {label}
      </Text>
      <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] leading-4">
        Images ~1280px JPEG. Vidéos max 60 s / ~40 Mo (+ vignette auto).
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {value.map((m, i) => (
          <View
            key={`${m.url}-${i}`}
            style={{ borderColor: colors.border, backgroundColor: colors.deep }}
            className="w-28 h-28 rounded-xl border overflow-hidden"
          >
            {m.type === 'image' || m.thumbUrl ? (
              <Image
                source={{ uri: m.thumbUrl || m.url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center gap-1">
                <Video size={22} color={colors.turmeric} />
                <Text style={{ color: colors.textSecondary }} className="font-inter text-[9px]">
                  Vidéo
                </Text>
              </View>
            )}
            {m.type === 'video' ? (
              <View className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60">
                <Text className="text-creme font-inter text-[8px] font-bold">VID</Text>
              </View>
            ) : null}
            <Pressable
              onPress={() => removeAt(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 items-center justify-center"
            >
              <Trash2 size={12} color="#fff" />
            </Pressable>
          </View>
        ))}

        {value.length < maxItems && (
          <Pressable
            onPress={addMedia}
            disabled={busy}
            style={{ borderColor: colors.border, backgroundColor: colors.card }}
            className="w-24 h-24 rounded-xl border items-center justify-center gap-1 active:opacity-80"
          >
            {busy ? (
              <ActivityIndicator color={colors.turmeric} />
            ) : (
              <>
                <ImageIcon size={20} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary }} className="font-inter text-[9px]">
                  Ajouter
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {error ? (
        <Text className="text-corail font-inter text-[11px]">{error}</Text>
      ) : null}
    </View>
  );
}
