import { ArrowLeft } from 'lucide-react-native';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';

interface Props {
  title: string;
  onBack: () => void;
  disabled?: boolean;
}

/** Header stack clean — icône retour nue, pas de pastille bordée. */
export default function ThemedStackHeader({ title, onBack, disabled }: Props) {
  const { colors } = useThemeFlavor();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderBottomColor: colors.border + '99',
        borderBottomWidth: Platform.OS === 'ios' ? 0.33 : 0.5,
        paddingTop: insets.top,
      }}
    >
      <View
        className="flex-row items-center justify-between"
        style={{ height: 48, paddingHorizontal: 8 }}
      >
        <Pressable
          onPress={onBack}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={10}
          className="w-11 h-11 items-center justify-center active:opacity-55"
        >
          <ArrowLeft size={24} color={colors.text} strokeWidth={1.85} />
        </Pressable>
        <Text
          style={{ color: colors.text }}
          className="font-space text-[17px] font-bold flex-1 text-center"
          accessibilityRole="header"
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="w-11 h-11" />
      </View>
    </View>
  );
}
