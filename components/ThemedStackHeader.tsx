import { ArrowLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';

interface Props {
  title: string;
  onBack: () => void;
  disabled?: boolean;
}

/** Header standard des écrans stack (détail, create, chat…) — 3 thèmes + safe area */
export default function ThemedStackHeader({ title, onBack, disabled }: Props) {
  const { colors } = useThemeFlavor();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: colors.nav,
        borderBottomColor: colors.border,
        paddingTop: insets.top,
      }}
      className="border-b"
    >
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable
          onPress={onBack}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="w-9 h-9 rounded-full border items-center justify-center"
        >
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <Text
          style={{ color: colors.text }}
          className="font-space text-base font-bold"
          accessibilityRole="header"
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="w-9 h-9" />
      </View>
    </View>
  );
}
