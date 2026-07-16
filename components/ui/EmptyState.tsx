import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Empty state premium réutilisable (listes, chat, etc.) */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useThemeFlavor();

  return (
    <View
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
      className="border rounded-2xl px-6 py-10 items-center gap-3"
    >
      <View
        style={{ backgroundColor: colors.deep, borderColor: colors.border }}
        className="w-14 h-14 rounded-2xl border items-center justify-center mb-1"
      >
        <Icon size={24} color={colors.turmeric} strokeWidth={1.8} />
      </View>
      <Text
        style={{ color: colors.text }}
        className="font-space text-base font-bold text-center"
      >
        {title}
      </Text>
      <Text
        style={{ color: colors.textSecondary }}
        className="font-inter text-xs text-center leading-5 max-w-[280px]"
      >
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="bg-turmeric px-5 h-10 rounded-full items-center justify-center mt-2 active:opacity-90"
        >
          <Text className="text-malt-deep font-inter-bold text-xs font-bold">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
