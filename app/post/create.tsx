import { useRouter } from 'expo-router';
import { Image as ImageIcon, Layers, X as XIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import KeyboardSafe from '../../components/ui/KeyboardSafe';
import { ScreenSkeleton } from '../../components/ui/ListSkeleton';
import PressableScale from '../../components/ui/PressableScale';
import SoftSurface from '../../components/ui/SoftSurface';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { haptic } from '../../lib/haptics';
import { pickAndUploadPostMedia, type MediaAsset } from '../../lib/media';
import { createHubPost } from '../../lib/posts';
import { supabase } from '../../lib/supabase';

const CAPTION_MAX = 2000;

type MentionUser = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default function CreatePostScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [mentions, setMentions] = useState<MentionUser[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        router.replace('/login');
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const [{ data: prof }, { data: memberships }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url').eq('id', uid).maybeSingle(),
        supabase.from('project_members').select('project_id, projects(id, name)').eq('user_id', uid),
      ]);

      if (prof) setUserProfile(prof);

      const byId = new Map<string, { id: string; name: string }>();
      (memberships || []).forEach((m: any) => {
        const p = Array.isArray(m.projects) ? m.projects[0] : m.projects;
        if (p?.id) byId.set(p.id, { id: p.id, name: p.name });
      });
      setProjects(Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setAuthChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleCaptionChange = (text: string) => {
    setCaption(text);
    const match = text.match(/@([a-zA-Z0-9_]{1,20})$/);
    if (match) {
      const q = match[1];
      void (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(4);
        setMentions((data as MentionUser[]) || []);
      })();
    } else {
      setMentions([]);
    }
  };

  const insertMention = (u: MentionUser) => {
    void haptic('selection');
    const handle = u.username || u.full_name || 'member';
    const cleanHandle = handle.replace(/\s+/g, '_');
    setCaption((prev) => prev.replace(/@([a-zA-Z0-9_]{0,20})$/, `@${cleanHandle} `));
    setMentions([]);
  };

  const addMedia = async () => {
    const remaining = 4 - media.length;
    if (remaining <= 0) return;
    void haptic('selection');
    setUploadingMedia(true);
    setErrorMsg('');
    try {
      const assets = await pickAndUploadPostMedia(userId, remaining);
      if (assets.length) {
        setMedia((prev) => [...prev, ...assets]);
        void haptic('success');
      }
    } catch (e: any) {
      if (e?.message !== 'CANCELLED') {
        const msg = typeof e === 'string' ? e : e?.message || e?.error_description || String(e);
        setErrorMsg(msg || 'Échec ajout média.');
      }
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = (index: number) => {
    void haptic('selection');
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const hasText = caption.trim().length >= 1;
  const hasMedia = media.length > 0;
  const canPublish = (hasText || hasMedia) && !loading && !uploadingMedia;

  const handleCreate = async () => {
    if (!userId || !canPublish) return;

    void haptic('medium');
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await createHubPost({
        authorId: userId,
        body: caption.trim(),
        media,
        projectId: selectedProject,
      });
      if (result.error) {
        setErrorMsg(result.error);
        setLoading(false);
        return;
      }
      void haptic('success');
      router.replace('/(tabs)');
    } catch {
      setErrorMsg('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1">
        <ScreenSkeleton variant="form" />
      </View>
    );
  }

  const selectedProjName = projects.find((p) => p.id === selectedProject)?.name;

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      {/* Header ultra-clean type X / Threads : Annuler à gauche, Bouton Publier à droite */}
      <View
        style={{
          height: 48,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 0,
        }}
      >
        <PressableScale
          onPress={() => router.back()}
          hitSlop={10}
          hapticKind="selection"
        >
          <Text style={{ color: colors.text, fontSize: 15, fontFamily: 'Inter500' }}>
            Annuler
          </Text>
        </PressableScale>

        <PressableScale
          onPress={handleCreate}
          disabled={!canPublish}
          style={{
            backgroundColor: canPublish ? colors.turmeric : colors.deep,
            opacity: canPublish ? 1 : 0.4,
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 20,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#0D0B05" />
          ) : (
            <Text
              style={{ color: canPublish ? colors.onTurmeric : colors.textSecondary }}
              className="font-inter text-xs font-bold"
            >
              Publier
            </Text>
          )}
        </PressableScale>
      </View>

      <KeyboardSafe className="flex-1" offset={0}>
        <View className="flex-1">
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {errorMsg ? (
              <Text className="text-corail font-inter text-xs mb-2">{errorMsg}</Text>
            ) : null}

            {/* Layout Canvas X / Threads : Avatar à gauche + zone de texte fluide à droite */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <ProfileAvatar
                uri={userProfile?.avatar_url}
                name={userProfile?.full_name}
                size={40}
                bg={colors.card}
                borderColor={colors.border}
              />

              <View style={{ flex: 1, gap: 10 }}>
                <TextInput
                  value={caption}
                  onChangeText={handleCaptionChange}
                  placeholder="Quoi de neuf ?"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={CAPTION_MAX}
                  editable={!loading}
                  autoFocus
                  style={
                    {
                      color: colors.text,
                      minHeight: 120,
                      textAlignVertical: 'top',
                      fontSize: 16,
                      fontFamily: 'Inter400',
                      lineHeight: 24,
                      backgroundColor: 'transparent',
                      borderWidth: 0,
                      outlineStyle: 'none',
                      padding: 0,
                    } as any
                  }
                />

                {/* Suggestions @mention */}
                {mentions.length > 0 ? (
                  <SoftSurface className="p-2 gap-1 mb-2">
                    <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] font-bold uppercase px-2 py-0.5">
                      Mentionner
                    </Text>
                    {mentions.map((u) => (
                      <PressableScale
                        key={u.id}
                        onPress={() => insertMention(u)}
                        className="flex-row items-center gap-2.5 p-2 rounded-xl"
                        style={{ backgroundColor: colors.deep }}
                      >
                        <ProfileAvatar
                          uri={u.avatar_url}
                          name={u.full_name || u.username}
                          size={26}
                          bg={colors.card}
                        />
                        <View className="flex-1">
                          <Text style={{ color: colors.text }} className="font-space text-xs font-bold">
                            {u.full_name || u.username}
                          </Text>
                          {u.username ? (
                            <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                              @{u.username}
                            </Text>
                          ) : null}
                        </View>
                      </PressableScale>
                    ))}
                  </SoftSurface>
                ) : null}

                {/* Vignettes médias attachées sous le texte */}
                {media.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {media.map((m, i) => (
                      <View
                        key={`${m.url}-${i}`}
                        style={{
                          width: 90,
                          height: 90,
                          borderRadius: 14,
                          overflow: 'hidden',
                          backgroundColor: colors.card,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Image source={{ uri: m.thumbUrl || m.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        <PressableScale
                          onPress={() => removeMedia(i)}
                          hitSlop={6}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <XIcon size={11} color="#fff" strokeWidth={2.5} />
                        </PressableScale>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}

                {/* Sélecteur de projet extensible (si affiché) */}
                {showProjectPicker && projects.length > 0 ? (
                  <View style={{ gap: 6, paddingTop: 4, paddingBottom: 8 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter500' }}>
                      Lier au projet :
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <PressableScale
                        onPress={() => {
                          void haptic('selection');
                          setSelectedProject(null);
                          setShowProjectPicker(false);
                        }}
                        style={{
                          backgroundColor: !selectedProject ? colors.turmeric : colors.card,
                          borderColor: !selectedProject ? colors.turmeric : colors.border,
                          borderWidth: 1,
                          borderRadius: 16,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: !selectedProject ? colors.onTurmeric : colors.textSecondary,
                            fontSize: 11,
                            fontFamily: 'Inter500',
                          }}
                        >
                          Aucun
                        </Text>
                      </PressableScale>

                      {projects.map((p) => {
                        const active = selectedProject === p.id;
                        return (
                          <PressableScale
                            key={p.id}
                            onPress={() => {
                              void haptic('selection');
                              setSelectedProject(p.id);
                              setShowProjectPicker(false);
                            }}
                            style={{
                              backgroundColor: active ? colors.turmeric : colors.card,
                              borderColor: active ? colors.turmeric : colors.border,
                              borderWidth: 1,
                              borderRadius: 16,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Layers size={11} color={active ? colors.onTurmeric : colors.textSecondary} />
                            <Text
                              style={{
                                color: active ? colors.onTurmeric : colors.text,
                                fontSize: 11,
                                fontFamily: 'Inter500',
                              }}
                            >
                              {p.name}
                            </Text>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </ScrollView>

          {/* Barre d'actions fixe en bas (Sticky Bottom Toolbar X / Threads) */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: colors.border + '66',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.bg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {/* Icône Média */}
              <PressableScale
                onPress={addMedia}
                disabled={uploadingMedia || media.length >= 4}
                hitSlop={8}
              >
                {uploadingMedia ? (
                  <ActivityIndicator size="small" color={colors.turmeric} />
                ) : (
                  <ImageIcon size={20} color={media.length >= 4 ? colors.textSecondary + '50' : colors.turmeric} />
                )}
              </PressableScale>

              {/* Icône Projet (Badge) */}
              {projects.length > 0 ? (
                <PressableScale
                  onPress={() => {
                    void haptic('selection');
                    setShowProjectPicker((prev) => !prev);
                  }}
                  hitSlop={8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: selectedProject ? colors.turmeric + '18' : 'transparent',
                    paddingHorizontal: selectedProject ? 8 : 0,
                    paddingVertical: selectedProject ? 3 : 0,
                    borderRadius: 12,
                  }}
                >
                  <Layers size={19} color={selectedProject ? colors.turmeric : colors.textSecondary} />
                  {selectedProject ? (
                    <Text style={{ color: colors.turmeric, fontSize: 11, fontFamily: 'Inter600' }}>
                      {selectedProjName}
                    </Text>
                  ) : null}
                </PressableScale>
              ) : null}

              {/* Tag @mention */}
              <PressableScale
                onPress={() => {
                  void haptic('selection');
                  setCaption((prev) => prev + '@');
                }}
                hitSlop={8}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 16, fontFamily: 'SpaceGrotesk700', fontWeight: 'bold' }}>
                  @
                </Text>
              </PressableScale>
            </View>

            {/* Compteur de caractères type X */}
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter400' }}>
              {CAPTION_MAX - caption.length}
            </Text>
          </View>
        </View>
      </KeyboardSafe>
    </SafeAreaView>
  );
}
