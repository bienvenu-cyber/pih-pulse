import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import PressableScale from './PressableScale';
import SoftSurface from './SoftSurface';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Empty state premium — surface soft, CTA scale. */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useThemeFlavor();

  return (
    <SoftSurface variant="card" className="px-6 py-10 items-center gap-3">
      <View
        style={{ backgroundColor: colors.deep }}
        className="w-14 h-14 rounded-2xl items-center justify-center mb-1"
      >
        <Icon size={24} color={colors.turmeric} strokeWidth={1.8} />
      </View>
      <Text style={{ color: colors.text }} className="font-space text-base font-bold text-center">
        {title}
      </Text>
      <Text
        style={{ color: colors.textSecondary }}
        className="font-inter text-xs text-center leading-5 max-w-[280px]"
      >
        {description}
      </Text>
      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          hapticKind="medium"
          className="bg-turmeric px-5 h-10 rounded-full items-center justify-center mt-2"
        >
          <Text style={{ color: colors.onTurmeric }} className="font-inter text-xs font-bold">
            {actionLabel}
          </Text>
        </PressableScale>
      ) : null}
    </SoftSurface>
  );
}
