import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Layers, MoreHorizontal, Pencil, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MediaCarousel from '../../components/MediaCarousel';
import PostAuthorHeader from '../../components/PostAuthorHeader';
import ReactionBar from '../../components/ReactionBar';
import ReplySection from '../../components/ReplySection';
import ThemedStackHeader from '../../components/ThemedStackHeader';
import KeyboardSafe from '../../components/ui/KeyboardSafe';
import { ScreenSkeleton } from '../../components/ui/ListSkeleton';
import PressableScale from '../../components/ui/PressableScale';
import SoftSurface from '../../components/ui/SoftSurface';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatRelativeTime, formatRoleLabel } from '../../lib/formatTime';
import { deleteHubPost, fetchPostById, postCaption, type HubPost } from '../../lib/posts';
import { supabase } from '../../lib/supabase';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const [post, setPost] = useState<HubPost | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (mode: 'replace' | 'refresh' = 'replace') => {
      if (!id) return;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setMeId(user?.id ?? null);
        const data = await fetchPostById(String(id));
        if (!data) {
          setPost(null);
          setError('Post introuvable.');
        } else {
          setPost(data);
        }
      } catch (e: any) {
        setError(e?.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load('replace');
  }, [load]);

  const isOwner = !!(meId && post && post.author_id === meId);

  const confirmDelete = () => {
    setMenuOpen(false);
    Alert.alert(
      'Supprimer ce post ?',
      'Cette action est définitive. Les réactions associées disparaîtront.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (!meId || !post) return;
            setBusy(true);
            const res = await deleteHubPost(post.id, meId);
            setBusy(false);
            if (res.error) {
              Alert.alert('Erreur', res.error);
              return;
            }
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.bg }}>
        <ScreenSkeleton variant="detail" />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ThemedStackHeader
        title="Post"
        onBack={() => router.back()}
        right={
          isOwner ? (
            <PressableScale
              onPress={() => setMenuOpen(true)}
              hitSlop={10}
              hapticKind="selection"
              scaleTo={0.9}
              className="w-11 h-11 items-center justify-center"
            >
              <MoreHorizontal size={20} color={colors.text} />
            </PressableScale>
          ) : undefined
        }
      />

      <KeyboardSafe className="flex-1" offset={0}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load('refresh')}
            tintColor={colors.turmeric}
            colors={[colors.turmeric]}
          />
        }
      >
        {error || !post ? (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-5"
          >
            <Text style={{ color: colors.text }} className="font-space text-sm font-bold mb-1">
              {error || 'Post introuvable'}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-xs leading-5">
              Vérifie le lien ou tire pour rafraîchir.
            </Text>
          </View>
        ) : (
          <SoftSurface variant="card" className="px-4 pt-3.5 pb-2 gap-3">
            <PostAuthorHeader
              authorName={post.author?.full_name || 'Membre PIH'}
              authorId={post.author_id}
              authorAvatar={post.author?.avatar_url}
              subtitle={`${formatRoleLabel(post.author?.role)} · a publié un post`}
              timeLabel={formatRelativeTime(new Date(post.created_at).getTime())}
              typeLabel="Post"
              typeColor={colors.textSecondary}
            />

            {postCaption(post) ? (
              <Text className="font-inter text-[15px] leading-6" style={{ color: colors.text }}>
                {postCaption(post)}
              </Text>
            ) : null}

            {post.media?.length ? (
              <MediaCarousel
                media={post.media}
                aspectMode="adaptive"
                contentFit="cover"
                enableLightbox
              />
            ) : null}

            {post.project?.id ? (
              <Pressable
                onPress={() => router.push(`/project/${post.project!.id}`)}
                style={{ backgroundColor: colors.deep }}
                className="rounded-xl px-3 py-2.5 flex-row items-center gap-2 active:opacity-80"
              >
                <Layers size={14} color={colors.turmeric} strokeWidth={2.2} />
                <Text style={{ color: colors.textSecondary }} className="font-inter text-xs flex-1">
                  Projet lié ·{' '}
                  <Text style={{ color: colors.text }} className="font-semibold">
                    {post.project.name || 'Voir le projet'}
                  </Text>
                </Text>
              </Pressable>
            ) : null}

            <View
              className="pt-1"
              style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border + '99' }}
            >
              <ReactionBar refId={post.id} refType="post" showIdea />
            </View>
          </SoftSurface>
        )}

        {post ? (
          <View className="mt-3">
            <ReplySection refType="post" refId={post.id} />
          </View>
        ) : null}
      </ScrollView>
      </KeyboardSafe>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setMenuOpen(false)}
        >
          <View
            style={{ backgroundColor: colors.card, borderTopColor: colors.border }}
            className="rounded-t-3xl border-t px-4 pt-3 pb-8 gap-2"
          >
            <View className="items-center mb-2">
              <View style={{ backgroundColor: colors.border }} className="w-10 h-1 rounded-full" />
            </View>
            <Pressable
              disabled={busy}
              onPress={() => {
                setMenuOpen(false);
                router.push({ pathname: '/post/edit', params: { id: String(id) } });
              }}
              style={{ backgroundColor: colors.deep, borderColor: colors.border }}
              className="border rounded-2xl px-4 py-3.5 flex-row items-center gap-3"
            >
              <Pencil size={18} color={colors.text} />
              <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
                Modifier
              </Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={confirmDelete}
              style={{ backgroundColor: colors.corail + '14', borderColor: colors.corail + '40' }}
              className="border rounded-2xl px-4 py-3.5 flex-row items-center gap-3"
            >
              <Trash2 size={18} color={colors.corail} />
              <Text style={{ color: colors.corail }} className="font-space text-sm font-bold">
                Supprimer
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
