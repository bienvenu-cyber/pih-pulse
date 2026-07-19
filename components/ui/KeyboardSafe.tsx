/**
 * KeyboardSafe — conteneur flex qui remonte le contenu au-dessus du clavier.
 *
 * - iOS : KeyboardAvoidingView `padding` + offset optionnel
 * - Android : s’appuie sur `softwareKeyboardLayoutMode: "resize"` (app.json) ;
 *   KAV en padding léger si besoin, sans double-count height
 * - Web : no-op layout (pas de clavier OS)
 */
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Offset iOS (header, safe top hors SafeArea, etc.).
   * Ex. header custom ~56 → passe 56.
   */
  offset?: number;
  /**
   * Si true, ajoute l’inset top à l’offset iOS
   * (quand le parent n’est PAS dans un SafeAreaView edges top).
   */
  includeTopInset?: boolean;
  className?: string;
};

export default function KeyboardSafe({
  children,
  style,
  offset = 0,
  includeTopInset = false,
  className,
}: Props) {
  const insets = useSafeAreaInsets();
  const iosOffset = offset + (includeTopInset ? insets.top : 0);

  // Web : pas de clavier OS — layout normal
  if (Platform.OS === 'web') {
    return (
      <KeyboardAvoidingView className={className} style={[{ flex: 1 }, style]}>
        {children}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      className={className}
      style={[{ flex: 1 }, style]}
      behavior="padding"
      // Android + resize : offset 0 suffit (fenêtre déjà réduite).
      // iOS : padding + offset header.
      keyboardVerticalOffset={Platform.OS === 'ios' ? iosOffset : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
