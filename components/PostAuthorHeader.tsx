import { useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { getInitials } from '../lib/formatTime';

export interface PostAuthorHeaderProps {
  /** Nom affiché (créateur / lead) */
  authorName: string;
  /** id profil pour navigation */
  authorId?: string | null;
  /** URL photo de profil */
  authorAvatar?: string | null;
  /** Sous-titre : rôle, projet parent, action… */
  subtitle?: string;
  /** « il y a 2 h » */
  timeLabel?: string;
  /** Badge type : Projet / Mission / Événement */
  typeLabel?: string;
  /** Couleur du badge type */
  typeColor?: string;
  /** Stoppe la propagation du press parent (carte) */
  stopPropagation?: boolean;
}

/**
 * Header de post type LinkedIn / hub :
 * [Avatar]  Nom · type
 *           rôle · temps relatif
 */
export default function PostAuthorHeader({
  authorName,
  authorId,
  authorAvatar,
  subtitle,
  timeLabel,
  typeLabel,
  typeColor,
}: PostAuthorHeaderProps) {
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const initials = getInitials(authorName);
  const accent = typeColor || colors.turmeric;

  const openProfile = () => {
    if (authorId) {
      router.push(`/profile/${authorId}`);
    }
  };

  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          openProfile();
        }}
        disabled={!authorId}
        accessibilityRole="button"
        accessibilityLabel={`Profil de ${authorName}`}
        // web: pas un <button> si parent carte a déjà un rôle interactif
        {...({ role: 'link' } as any)}
        style={{ backgroundColor: colors.deep, borderColor: colors.border }}
        className="w-10 h-10 rounded-full border items-center justify-center overflow-hidden"
      >
        {authorAvatar ? (
          <Image source={{ uri: authorAvatar }} style={{ width: 40, height: 40 }} resizeMode="cover" />
        ) : (
          <Text style={{ color: colors.text }} className="font-space text-xs font-bold">
            {initials}
          </Text>
        )}
      </Pressable>

      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              openProfile();
            }}
            disabled={!authorId}
            accessibilityRole="link"
            {...({ role: 'link' } as any)}
            className="shrink"
          >
            <Text
              style={{ color: colors.text }}
              className="font-space text-[13px] font-bold"
              numberOfLines={1}
            >
              {authorName}
            </Text>
          </Pressable>
          {typeLabel ? (
            <View
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: accent + '22' }}
            >
              <Text
                style={{ color: accent }}
                className="font-inter text-[9px] font-bold uppercase tracking-wide"
              >
                {typeLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center gap-1.5 mt-0.5 flex-wrap">
          {subtitle ? (
            <Text
              style={{ color: colors.textSecondary }}
              className="font-inter text-[11px]"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
          {subtitle && timeLabel ? (
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
              ·
            </Text>
          ) : null}
          {timeLabel ? (
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
              {timeLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
