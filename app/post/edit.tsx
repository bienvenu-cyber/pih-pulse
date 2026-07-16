import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ImageIcon, PenLine, Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import MediaPickerField from '../../components/MediaPickerField';
import {
  FormAlert,
  FormMultiline,
  FormScreen,
  FormSection,
  PrimaryButton,
} from '../../components/ui/form/FormPrimitives';
import type { MediaAsset } from '../../lib/media';
import { fetchPostById, updateHubPost } from '../../lib/posts';
import { supabase } from '../../lib/supabase';

const CAPTION_MAX = 2000;

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      setUserId(session.user.id);

      const post = await fetchPostById(String(id));
      if (!post) {
        setErrorMsg('Post introuvable.');
        setLoading(false);
        return;
      }
      if (post.author_id !== session.user.id) {
        setErrorMsg('Tu ne peux modifier que tes propres posts.');
        setLoading(false);
        return;
      }
      // Legacy : fusionner ancien titre + body en une caption
      const t = (post.title || '').trim();
      const b = (post.body || '').trim();
      let merged = b;
      if (t && b && !b.startsWith(t)) {
        merged = `${t}\n\n${b}`;
      } else if (t && !b) {
        merged = t;
      }
      setCaption(merged);
      setMedia(post.media || []);
      setProjectId(post.project_id);
      setLoading(false);
    })();
  }, [id, router]);

  const hasText = caption.trim().length >= 1;
  const hasMedia = media.length > 0;
  const canSave = (hasText || hasMedia) && !saving;

  const handleSave = async () => {
    if (!userId || !id) return;
    if (!hasText && !hasMedia) {
      setErrorMsg('Ajoute un message et/ou au moins un média.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    const res = await updateHubPost({
      postId: String(id),
      authorId: userId,
      body: caption.trim(),
      media,
      projectId,
    });
    if (res.error) {
      setErrorMsg(res.error);
      setSaving(false);
      return;
    }
    router.replace(`/post/${id}`);
  };

  return (
    <FormScreen
      title="Modifier le post"
      subtitle="Caption + médias"
      onBack={() => router.back()}
      loading={loading}
      footer={
        <PrimaryButton
          label="Enregistrer"
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
          icon={Save}
        />
      }
    >
      {errorMsg ? <FormAlert message={errorMsg} /> : null}

      <FormSection
        icon={PenLine}
        title="Caption"
        subtitle="Un seul champ texte — réactions et boost restent liés."
      >
        <FormMultiline
          label="Message"
          value={caption}
          onChangeText={setCaption}
          placeholder="Quoi de neuf ?"
          minHeight={140}
          maxLength={CAPTION_MAX}
          counter={{ current: caption.length, max: CAPTION_MAX }}
          hint="Texte et/ou médias"
        />
      </FormSection>

      <FormSection icon={ImageIcon} title="Médias">
        <MediaPickerField
          userId={userId}
          value={media}
          onChange={setMedia}
          maxItems={4}
          label="Galerie"
        />
      </FormSection>
    </FormScreen>
  );
}
