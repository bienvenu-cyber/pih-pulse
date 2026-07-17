import { useRouter } from 'expo-router';
import { Image as ImageIcon, Layers, PenLine, Send } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import MediaPickerField from '../../components/MediaPickerField';
import {
  FormAlert,
  FormMultiline,
  FormScreen,
  FormSection,
  ImpactBanner,
  PrimaryButton,
} from '../../components/ui/form/FormPrimitives';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { IMPACT_POINTS } from '../../lib/impact';
import type { MediaAsset } from '../../lib/media';
import { createHubPost } from '../../lib/posts';
import { supabase } from '../../lib/supabase';

const CAPTION_MAX = 2000;

export default function CreatePostScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

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
      setUserId(session.user.id);
      setAuthChecking(false);

      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id, projects(id, name)')
        .eq('user_id', session.user.id);

      const byId = new Map<string, { id: string; name: string }>();
      (memberships || []).forEach((m: any) => {
        const p = Array.isArray(m.projects) ? m.projects[0] : m.projects;
        if (p?.id) byId.set(p.id, { id: p.id, name: p.name });
      });
      setProjects(Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)));
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const hasText = caption.trim().length >= 1;
  const hasMedia = media.length > 0;
  const canPublish = (hasText || hasMedia) && !loading;

  const readiness = useMemo(() => {
    const checks = [hasText, hasMedia, !!selectedProject];
    return checks.filter(Boolean).length;
  }, [hasText, hasMedia, selectedProject]);

  const handleCreate = async () => {
    if (!userId) {
      router.replace('/login');
      return;
    }
    if (!hasText && !hasMedia) {
      setErrorMsg('Ajoute un message et/ou au moins un média.');
      return;
    }

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
      router.replace('/(tabs)');
    } catch {
      setErrorMsg('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  return (
    <FormScreen
      title="Nouveau post"
      subtitle="Comme sur Insta · caption + médias"
      onBack={() => router.back()}
      loading={authChecking}
      footer={
        <PrimaryButton
          label={`Publier · +${IMPACT_POINTS.createPost} Élan`}
          onPress={handleCreate}
          loading={loading}
          disabled={!canPublish}
          icon={Send}
        />
      }
    >
      <ImpactBanner
        points={IMPACT_POINTS.createPost}
        label="Texte, photo ou les deux — le hub écoute. +Élan à la publication."
      />

      {errorMsg ? <FormAlert message={errorMsg} /> : null}

      <FormSection
        icon={PenLine}
        title="Caption"
        subtitle="Un seul champ — ce que tu dirais au hub."
      >
        <FormMultiline
          label="Message"
          placeholder="Quoi de neuf ? Update, question, win, call… + médias en bas."
          value={caption}
          onChangeText={setCaption}
          maxLength={CAPTION_MAX}
          editable={!loading}
          minHeight={140}
          counter={{ current: caption.length, max: CAPTION_MAX }}
          hint="Texte et/ou médias — au moins l’un des deux"
        />
      </FormSection>

      <FormSection
        icon={ImageIcon}
        title="Médias"
        subtitle="Jusqu’à 4 images ou vidéos (optionnel si tu as un message)."
      >
        <MediaPickerField
          userId={userId}
          value={media}
          onChange={setMedia}
          maxItems={4}
          label="Ajouter"
        />
      </FormSection>

      {projects.length > 0 ? (
        <FormSection
          icon={Layers}
          title="Lier à un projet"
          subtitle="Optionnel — contexte équipe."
        >
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setSelectedProject(null)}
              style={{
                backgroundColor: !selectedProject ? colors.turmeric : colors.deep,
                borderColor: !selectedProject ? colors.turmeric : colors.border,
              }}
              className="border rounded-full px-3.5 py-2.5"
            >
              <Text
                style={{
                  color: !selectedProject ? colors.onTurmeric : colors.textSecondary,
                }}
                className="font-inter text-[12px] font-semibold"
              >
                Aucun
              </Text>
            </Pressable>
            {projects.map((p) => {
              const active = selectedProject === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedProject(p.id)}
                  style={{
                    backgroundColor: active ? colors.turmeric : colors.deep,
                    borderColor: active ? colors.turmeric : colors.border,
                  }}
                  className="border rounded-full px-3.5 py-2.5"
                >
                  <Text
                    style={{ color: active ? colors.onTurmeric : colors.textSecondary }}
                    className="font-inter text-[12px] font-semibold"
                  >
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormSection>
      ) : null}

      <View
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
        className="border rounded-2xl px-4 py-3 flex-row items-center justify-between"
      >
        <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
          Caption · médias · projet
        </Text>
        <View className="flex-row gap-1.5">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: i < readiness ? colors.turmeric : colors.border,
              }}
            />
          ))}
        </View>
      </View>
    </FormScreen>
  );
}
