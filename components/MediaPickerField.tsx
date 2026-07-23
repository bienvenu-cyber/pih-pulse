import { Image as ImageIcon, Video, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { haptic } from '../lib/haptics';
import {
  pickAndUploadPostMedia,
  type MediaAsset,
} from '../lib/media';
import PressableScale from './ui/PressableScale';

interface Props {
  userId: string | null;
  value: MediaAsset[];
  onChange: (next: MediaAsset[]) => void;
  maxItems?: number;
  label?: string;
  variant?: 'compact' | 'standard';
}

/**
 * Sélecteur média ultra-épuré type Threads / X (avec support multi-sélection).
 */
export default function MediaPickerField({
  userId,
  value,
  onChange,
  maxItems = 4,
  label = 'Médias',
}: Props) {
  const { colors } = useThemeFlavor();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const addMedia = async () => {
    const remaining = maxItems - value.length;
    if (remaining <= 0) {
      setError(`Maximum ${maxItems} médias.`);
      return;
    }
    void haptic('selection');
    setBusy(true);
    setError('');
    try {
      const assets = await pickAndUploadPostMedia(userId, remaining);
      if (assets.length) {
        onChange([...value, ...assets]);
        void haptic('success');
      }
    } catch (e: any) {
      if (e?.message !== 'CANCELLED') {
        const msg = typeof e === 'string' ? e : e?.message || e?.error_description || String(e);
        setError(msg || 'Échec upload média.');
      }
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (index: number) => {
    void haptic('selection');
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <View style={{ gap: 8 }}>
      {/* Liste horizontale des vignettes sélectionnées + bouton d'ajout épuré */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, alignItems: 'center' }}
      >
        {value.map((m, i) => (
          <View
            key={`${m.url}-${i}`}
            style={{
              width: 100,
              height: 100,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              position: 'relative',
            }}
          >
            {m.type === 'image' || m.thumbUrl ? (
              <Image
                source={{ uri: m.thumbUrl || m.url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Video size={24} color={colors.turmeric} />
                <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: 'Inter500' }}>
                  Vidéo
                </Text>
              </View>
            )}
            {m.type === 'video' ? (
              <View style={{ position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.65)' }}>
                <Text style={{ color: '#F5EDD6', fontSize: 9, fontFamily: 'Inter700', fontWeight: 'bold' }}>VID</Text>
              </View>
            ) : null}
            <PressableScale
              onPress={() => removeAt(i)}
              hitSlop={6}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: 'rgba(0,0,0,0.7)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={12} color="#fff" strokeWidth={2.5} />
            </PressableScale>
          </View>
        ))}

        {/* Bouton d'ajout épuré type Threads (icône + libellé compact) */}
        {value.length < maxItems && (
          <PressableScale
            onPress={addMedia}
            disabled={busy}
            style={{
              height: value.length > 0 ? 100 : 42,
              paddingHorizontal: value.length > 0 ? 16 : 14,
              borderRadius: value.length > 0 ? 16 : 20,
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color={colors.turmeric} size="small" />
            ) : (
              <>
                <ImageIcon size={18} color={colors.turmeric} />
                <Text style={{ color: colors.text, fontSize: 12, fontFamily: 'Inter500' }}>
                  {value.length > 0 ? `+ Ajouter (${value.length}/${maxItems})` : 'Ajouter photo / vidéo'}
                </Text>
              </>
            )}
          </PressableScale>
        )}
      </ScrollView>

      {error ? (
        <Text style={{ color: colors.corail, fontSize: 11, fontFamily: 'Inter400' }}>{error}</Text>
      ) : null}
    </View>
  );
}
