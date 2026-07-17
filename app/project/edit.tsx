/**
 * Édition projet — réservé au lead / créateur.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import MediaPickerField from '../../components/MediaPickerField';
import {
  ChoiceGrid,
  ChipSelect,
  FormAlert,
  FormField,
  FormMultiline,
  FormScreen,
  FormSection,
  StepFooter,
} from '../../components/ui/form/FormPrimitives';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import type { MediaAsset } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const STATUS_OPTIONS = [
  { id: 'idea', label: 'Idée', description: 'Concept initial' },
  { id: 'prototype', label: 'Prototype', description: 'Maquette ou démo' },
  { id: 'mvp', label: 'MVP', description: 'Produit lancé' },
  { id: 'scale', label: 'Lancé', description: 'Scale / production' },
];

const ROLES_POOL = [
  { id: 'dev', label: 'Développeur' },
  { id: 'design', label: 'Designer' },
  { id: 'marketing', label: 'Marketeur' },
  { id: 'po', label: 'Product Owner' },
  { id: 'mentor', label: 'Mentor' },
];

const TECHS_POOL = [
  'React Native',
  'Figma',
  'TypeScript',
  'Node.js',
  'Supabase',
  'Python',
  'IoT',
  'PostgreSQL',
].map((t) => ({ id: t, label: t }));

export default function EditProjectScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, userId } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idea');
  const [location, setLocation] = useState('Parakou');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);

  useEffect(() => {
    if (!ready || !userId || !id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(
          'id, name, short_description, description, status, skills_needed, location, roles_needed, creator_id, media, avatar_url'
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        setErrorMsg('Projet introuvable.');
        setLoading(false);
        return;
      }
      if (data.creator_id !== userId) {
        setErrorMsg('Seul le lead peut modifier ce projet.');
        setLoading(false);
        return;
      }

      setName(data.name || '');
      setTagline(data.short_description || '');
      setDescription(data.description || '');
      setStatus(data.status || 'idea');
      setLocation((data.location || 'Parakou').trim() || 'Parakou');
      setSelectedTechs(data.skills_needed || []);

      const roles: string[] = data.roles_needed || [];
      const roleIds = roles.map((label) => {
        const found = ROLES_POOL.find(
          (r) => r.label === label || r.id === label
        );
        return found?.id || label;
      });
      setSelectedRoles(roleIds);

      if (Array.isArray(data.media) && data.media.length) {
        setMedia(data.media as MediaAsset[]);
      } else if (data.avatar_url) {
        setMedia([
          { type: 'image', url: data.avatar_url, thumbUrl: data.avatar_url },
        ]);
      }
      setLoading(false);
    })();
  }, [ready, userId, id]);

  const handleSave = async () => {
    if (!name.trim() || !tagline.trim()) {
      setErrorMsg('Nom et tagline sont requis.');
      return;
    }
    if (!userId || !id) return;
    setSaving(true);
    setErrorMsg('');
    setOkMsg('');

    const roleLabels = selectedRoles.map((rid) => {
      const found = ROLES_POOL.find((r) => r.id === rid);
      return found?.label || rid;
    });
    const cover = media.find((m) => m.type === 'image')?.url || null;

    const payload: Record<string, unknown> = {
      name: name.trim(),
      short_description: tagline.trim(),
      description: description.trim() || tagline.trim(),
      status,
      skills_needed: selectedTechs,
      location: location.trim() || 'Parakou',
      roles_needed: roleLabels,
      avatar_url: cover,
      media,
    };

    let { error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id)
      .eq('creator_id', userId);

    if (error) {
      // colonnes optionnelles absentes
      const { error: e2 } = await supabase
        .from('projects')
        .update({
          name: payload.name,
          short_description: payload.short_description,
          description: payload.description,
          status: payload.status,
          skills_needed: payload.skills_needed,
          avatar_url: payload.avatar_url,
        })
        .eq('id', id)
        .eq('creator_id', userId);
      error = e2;
    }

    setSaving(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setOkMsg('Projet mis à jour.');
    setTimeout(() => router.replace(`/project/${id}`), 400);
  };

  if (!ready || loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.turmeric} />
      </View>
    );
  }

  if (errorMsg && !name) {
    return (
      <FormScreen title="Modifier le projet" onBack={() => router.back()}>
        <FormAlert message={errorMsg} tone="error" />
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title="Modifier le projet"
      subtitle="Lead uniquement"
      onBack={() => router.back()}
      footer={
        <StepFooter
          onNext={handleSave}
          nextLabel="Enregistrer"
          loading={saving}
          nextDisabled={saving}
        />
      }
    >
      {errorMsg ? <FormAlert message={errorMsg} tone="error" /> : null}
      {okMsg ? <FormAlert message={okMsg} tone="success" /> : null}

      <FormSection title="Identité">
        <FormField label="Nom" value={name} onChangeText={setName} />
        <FormField label="Tagline" value={tagline} onChangeText={setTagline} />
        <FormMultiline
          label="Description"
          value={description}
          onChangeText={setDescription}
        />
        <FormField
          label="Localisation"
          value={location}
          onChangeText={setLocation}
        />
      </FormSection>

      <FormSection title="Statut">
        <ChoiceGrid
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
      </FormSection>

      <FormSection title="Équipe recherchée">
        <ChipSelect
          options={ROLES_POOL}
          values={selectedRoles}
          onChange={setSelectedRoles}
        />
        <Text style={{ color: colors.textSecondary }} className="font-inter text-xs mt-2 mb-1">
          Stack
        </Text>
        <ChipSelect
          options={TECHS_POOL}
          values={selectedTechs}
          onChange={setSelectedTechs}
        />
      </FormSection>

      <FormSection title="Médias" subtitle="Cover et visuels (max selon picker).">
        <MediaPickerField userId={userId} value={media} onChange={setMedia} />
      </FormSection>
    </FormScreen>
  );
}
