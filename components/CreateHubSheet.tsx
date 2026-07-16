import { useRouter } from 'expo-router';
import { Layers, PenLine, Target, X } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';

interface CreateHubSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Menu création type Instagram — post = action principale (contexte Feed).
 * Projet / mission restent aussi accessibles depuis leurs onglets.
 */
export default function CreateHubSheet({ visible, onClose }: CreateHubSheetProps) {
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const go = (path: '/post/create' | '/project/create' | '/mission/create') => {
    onClose();
    // léger délai pour laisser le modal se fermer proprement
    requestAnimationFrame(() => {
      router.push(path);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={{
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
          className="rounded-t-3xl px-4 pt-3"
        >
          <View className="items-center mb-3">
            <View
              style={{ backgroundColor: colors.border }}
              className="w-10 h-1 rounded-full mb-3"
            />
            <View className="w-full flex-row items-center justify-between px-1">
              <Text style={{ color: colors.text }} className="font-space text-base font-bold">
                Créer
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                className="w-8 h-8 rounded-full border items-center justify-center"
              >
                <X size={16} color={colors.textSecondary} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>

          {/* Action principale : Post simple */}
          <Pressable
            onPress={() => go('/post/create')}
            className="rounded-2xl px-4 py-4 flex-row items-center gap-3 mb-2 active:opacity-90 bg-turmeric"
          >
            <View className="w-11 h-11 rounded-xl items-center justify-center bg-malt-deep/15">
              <PenLine size={20} color="#0D0B05" strokeWidth={2.3} />
            </View>
            <View className="flex-1">
              <Text className="font-space text-[15px] font-bold" style={{ color: '#0D0B05' }}>
                Post
              </Text>
              <Text className="font-inter text-[11px] mt-0.5" style={{ color: 'rgba(13,11,5,0.7)' }}>
                Partage une idée, update ou win avec le hub
              </Text>
            </View>
          </Pressable>

          {/* Secondaires */}
          <Pressable
            onPress={() => go('/project/create')}
            style={{ backgroundColor: colors.deep, borderColor: colors.border }}
            className="rounded-2xl border px-4 py-3.5 flex-row items-center gap-3 mb-2 active:opacity-85"
          >
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="w-11 h-11 rounded-xl border items-center justify-center"
            >
              <Layers size={18} color={colors.text} strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="font-space text-[14px] font-bold">
                Projet
              </Text>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px] mt-0.5">
                Lance une idée / prototype / MVP
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => go('/mission/create')}
            style={{ backgroundColor: colors.deep, borderColor: colors.border }}
            className="rounded-2xl border px-4 py-3.5 flex-row items-center gap-3 active:opacity-85"
          >
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="w-11 h-11 rounded-xl border items-center justify-center"
            >
              <Target size={18} color={colors.text} strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="font-space text-[14px] font-bold">
                Mission
              </Text>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px] mt-0.5">
                Publie une tâche pour l’équipe
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
