/**
 * Haptics légers — no-op web / simu / erreur native.
 */
import { Platform } from 'react-native';

export type HapticKind = 'light' | 'selection' | 'medium' | 'success';

export async function haptic(kind: HapticKind = 'light'): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = await import('expo-haptics');
    switch (kind) {
      case 'selection':
        await Haptics.selectionAsync();
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'light':
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  } catch {
    /* module absent ou non supporté */
  }
}
