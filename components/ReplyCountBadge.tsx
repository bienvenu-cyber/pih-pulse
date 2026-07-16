import { MessageCircle } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';

interface Props {
  count?: number | null;
  /** Toujours afficher même si 0 (défaut: false — silencieux si vide) */
  showZero?: boolean;
  size?: number;
}

/**
 * Badge compact icône + nombre pour cartes (feed, listes).
 * Masqué si count = 0 sauf showZero.
 */
export default function ReplyCountBadge({ count = 0, showZero = false, size = 14 }: Props) {
  const { colors } = useThemeFlavor();
  const n = count || 0;
  if (n <= 0 && !showZero) return null;

  return (
    <View className="flex-row items-center gap-1" accessibilityLabel={`${n} réponses`}>
      <MessageCircle size={size} color={colors.textSecondary} strokeWidth={2} />
      <Text
        style={{ color: colors.textSecondary }}
        className="font-inter text-[11px] font-medium tabular-nums"
      >
        {n}
      </Text>
    </View>
  );
}
