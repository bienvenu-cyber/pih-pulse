import { useRouter } from 'expo-router';
import { Layers, PenLine, Target, X } from 'lucide-react-native';
import { useMemo } from 'react';
import { Modal, PanResponder, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { haptic } from '../lib/haptics';
import { GlassScrim, GlassSheet } from './ui/Glass';
import PressableScale from './ui/PressableScale';

interface CreateHubSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreateHubSheet({ visible, onClose }: CreateHubSheetProps) {
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 35 || gesture.vy > 0.4) {
            void haptic('selection');
            onClose();
          }
        },
      }),
    [onClose]
  );

  const go = (path: '/post/create' | '/project/create' | '/mission/create') => {
    onClose();
    requestAnimationFrame(() => {
      router.push(path);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GlassScrim>
        <Pressable onPress={onClose} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={(e) => e.stopPropagation?.()}>
            <GlassSheet style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                {/* Drag handle header (Instagram style) */}
                <View {...panResponder.panHandlers} style={{ alignItems: 'center', paddingBottom: 14 }}>
                  <View
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.textSecondary,
                      opacity: 0.35,
                      marginBottom: 12,
                    }}
                  />
                  <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontSize: 17, fontFamily: 'SpaceGrotesk700', fontWeight: 'bold' }}>
                      Créer
                    </Text>
                    <PressableScale
                      onPress={onClose}
                      hitSlop={10}
                      hapticKind="selection"
                      scaleTo={0.9}
                      style={{
                        backgroundColor: colors.deep,
                        borderColor: colors.border,
                        borderWidth: 1,
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={15} color={colors.textSecondary} strokeWidth={2.2} />
                    </PressableScale>
                  </View>
                </View>

                {/* Option 1 : Post (Bouton principal Turmeric) */}
                <PressableScale
                  onPress={() => go('/post/create')}
                  hapticKind="medium"
                  style={{
                    backgroundColor: colors.turmeric,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: 'rgba(13, 11, 5, 0.14)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PenLine size={20} color="#0D0B05" strokeWidth={2.3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#0D0B05', fontSize: 15, fontFamily: 'SpaceGrotesk700', fontWeight: 'bold' }}>
                      Post
                    </Text>
                    <Text style={{ color: 'rgba(13, 11, 5, 0.72)', fontSize: 11, fontFamily: 'Inter400', marginTop: 2 }}>
                      Partage une idée, update ou win avec le hub
                    </Text>
                  </View>
                </PressableScale>

                {/* Option 2 : Projet */}
                <PressableScale
                  onPress={() => go('/project/create')}
                  hapticKind="selection"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: colors.deep,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Layers size={19} color={colors.turmeric} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontFamily: 'SpaceGrotesk700', fontWeight: 'bold' }}>
                      Projet
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter400', marginTop: 2 }}>
                      Lance une idée, prototype ou MVP
                    </Text>
                  </View>
                </PressableScale>

                {/* Option 3 : Mission */}
                <PressableScale
                  onPress={() => go('/mission/create')}
                  hapticKind="selection"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: colors.deep,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Target size={19} color={colors.turmeric} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontFamily: 'SpaceGrotesk700', fontWeight: 'bold' }}>
                      Mission
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter400', marginTop: 2 }}>
                      Publie une tâche pratique pour l’équipe
                    </Text>
                  </View>
                </PressableScale>
              </View>
            </GlassSheet>
          </Pressable>
        </Pressable>
      </GlassScrim>
    </Modal>
  );
}
