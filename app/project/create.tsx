import { useRouter } from 'expo-router';
import { Image as ImageIcon, MapPin, Sparkles, X as XIcon } from 'lucide-react-native';
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
import { grantCreateProjectImpact } from '../../lib/hub';
import { IMPACT_POINTS } from '../../lib/impact';
import { pickAndUploadPostMedia, type MediaAsset } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const STATUS_OPTIONS = [
  { id: 'idea', label: 'Idée', color: '#FFBE0B' },
  { id: 'prototype', label: 'Prototype', color: '#7CB87A' },
  { id: 'mvp', label: 'MVP', color: '#38BDF8' },
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
];

export default function CreateProjectScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idea');
  const [location, setLocation] = useState('Parakou');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name?: string | null; avatar_url?: string | null } | null>(null);

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

      const [{ data: prof }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url').eq('id', uid).maybeSingle(),
      ]);

      if (prof) setUserProfile(prof);
      setAuthChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const toggleRole = (id: string) => {
    setSelectedRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleTech = (tech: string) => {
    setSelectedTechs((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const addMedia = async () => {
    const remaining = 4 - media.length;
    if (remaining <= 0) return;
    setUploadingMedia(true);
    setErrorMsg('');
    try {
      const assets = await pickAndUploadPostMedia(userId, remaining);
      if (assets.length) {
        setMedia((prev) => [...prev, ...assets]);
      }
    } catch (e: any) {
      if (e?.message !== 'CANCELLED') {
        const msg = typeof e === 'string' ? e : e?.message || e?.error_description || String(e);
        setErrorMsg(msg || 'Échec upload média.');
      }
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const canPublish = name.trim().length > 0 && tagline.trim().length > 0 && !loading && !uploadingMedia;

  const handleCreate = async () => {
    if (!canPublish || !userId) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const cover = media.find((m) => m.type === 'image')?.url || null;

      const roleLabels = selectedRoles.map((id) => {
        const found = ROLES_POOL.find((r) => r.id === id);
        return found?.label || id;
      });

      const basePayload = {
        name: name.trim(),
        short_description: tagline.trim(),
        description: description.trim() || tagline.trim(),
        creator_id: userId,
        status,
        skills_needed: selectedTechs,
        avatar_url: cover,
        media,
      };

      let projData: { id: string } | null = null;
      let projError: { message: string } | null = null;

      const fullInsert = await supabase
        .from('projects')
        .insert({
          ...basePayload,
          location: location.trim() || 'Parakou',
          roles_needed: roleLabels,
        })
        .select('id')
        .single();

      if (fullInsert.error) {
        const basicInsert = await supabase
          .from('projects')
          .insert(basePayload)
          .select('id')
          .single();
        projData = basicInsert.data;
        projError = basicInsert.error;
      } else {
        projData = fullInsert.data;
      }

      if (projError) {
        setErrorMsg(projError.message);
        setLoading(false);
        return;
      }

      if (projData) {
        const { error: memberError } = await supabase.from('project_members').insert({
          project_id: projData.id,
          user_id: userId,
          role: 'Founder & Lead',
        });
        if (memberError) {
          console.error('Founder member:', memberError.message);
        }
        await grantCreateProjectImpact(userId, name.trim(), projData.id);
        router.replace(`/project/${projData.id}`);
        return;
      }

      router.back();
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

  const selectedStatusObj = STATUS_OPTIONS.find((s) => s.id === status);

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      {/* Header ultra-clean type X / Threads */}
      <View
        style={{
          height: 48,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <PressableScale onPress={() => router.back()} hitSlop={10}>
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
              Lancer (+{IMPACT_POINTS.createProject} Élan)
            </Text>
          )}
        </PressableScale>
      </View>

      <KeyboardSafe className="flex-1" offset={0}>
        <View className="flex-1">
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 16 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {errorMsg ? (
              <Text className="text-corail font-inter text-xs px-1">{errorMsg}</Text>
            ) : null}

            {/* Layout Canvas Projet : Avatar Founder + Inputs Nom & Slogan */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <ProfileAvatar
                uri={userProfile?.avatar_url}
                name={userProfile?.full_name}
                size={40}
                bg={colors.card}
                borderColor={colors.border}
              />

              <View style={{ flex: 1, gap: 12 }}>
                {/* Nom du Projet */}
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nom du projet (ex: WapiFood)..."
                  placeholderTextColor={colors.textSecondary}
                  maxLength={60}
                  editable={!loading}
                  autoFocus
                  style={
                    {
                      color: colors.text,
                      fontSize: 18,
                      fontFamily: 'SpaceGrotesk700',
                      fontWeight: 'bold',
                      backgroundColor: 'transparent',
                      borderWidth: 0,
                      outlineStyle: 'none',
                      padding: 0,
                    } as any
                  }
                />

                {/* Tagline / Pitch en une ligne */}
                <TextInput
                  value={tagline}
                  onChangeText={setTagline}
                  placeholder="Slogan ou pitch en 1 ligne (ex: Livraison repas via Mobile Money)..."
                  placeholderTextColor={colors.textSecondary}
                  maxLength={120}
                  editable={!loading}
                  style={
                    {
                      color: colors.text,
                      fontSize: 15,
                      fontFamily: 'Inter500',
                      lineHeight: 22,
                      backgroundColor: 'transparent',
                      borderWidth: 0,
                      outlineStyle: 'none',
                      padding: 0,
                    } as any
                  }
                />

                {/* Description complète */}
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Description du projet (Problème, solution, objectifs)..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={1200}
                  editable={!loading}
                  style={
                    {
                      color: colors.text,
                      minHeight: 80,
                      textAlignVertical: 'top',
                      fontSize: 14,
                      fontFamily: 'Inter400',
                      lineHeight: 22,
                      backgroundColor: 'transparent',
                      borderWidth: 0,
                      outlineStyle: 'none',
                      padding: 0,
                    } as any
                  }
                />

                {/* Vignettes médias attachées */}
                {media.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {media.map((m, i) => (
                      <View
                        key={`${m.url}-${i}`}
                        style={{
                          width: 84,
                          height: 84,
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
              </View>
            </View>

            {/* Config du projet : Statut, Localisation, Rôles & Stack */}
            <SoftSurface className="p-3.5 gap-3.5">
              {/* Statut d'avancement */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter600' }}>
                  Stade du projet
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {STATUS_OPTIONS.map((opt) => {
                    const active = status === opt.id;
                    return (
                      <PressableScale
                        key={opt.id}
                        onPress={() => setStatus(opt.id)}
                        style={{
                          flex: 1,
                          backgroundColor: active ? opt.color + '20' : colors.deep,
                          borderColor: active ? opt.color : colors.border,
                          borderWidth: 1,
                          borderRadius: 14,
                          paddingVertical: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{ color: active ? opt.color : colors.text, fontSize: 12, fontFamily: 'SpaceGrotesk700', fontWeight: 'bold' }}
                        >
                          {opt.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* Localisation */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter600' }}>
                  Localisation
                </Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Parakou, Bénin · Remote"
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    backgroundColor: colors.deep,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    color: colors.text,
                    fontSize: 14,
                    fontFamily: 'Inter400',
                  }}
                />
              </View>

              {/* Rôles recherchés */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter600' }}>
                  Rôles recherchés dans l’équipe
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {ROLES_POOL.map((r) => {
                    const active = selectedRoles.includes(r.id);
                    return (
                      <PressableScale
                        key={r.id}
                        onPress={() => toggleRole(r.id)}
                        style={{
                          backgroundColor: active ? colors.turmeric : colors.deep,
                          borderColor: active ? colors.turmeric : colors.border,
                          borderWidth: 1,
                          borderRadius: 16,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{ color: active ? colors.onTurmeric : colors.textSecondary, fontSize: 11, fontFamily: 'Inter500' }}
                        >
                          {r.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* Stack & Compétences */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter600' }}>
                  Stack & Compétences clés
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {TECHS_POOL.map((t) => {
                    const active = selectedTechs.includes(t);
                    return (
                      <PressableScale
                        key={t}
                        onPress={() => toggleTech(t)}
                        style={{
                          backgroundColor: active ? colors.turmeric : colors.deep,
                          borderColor: active ? colors.turmeric : colors.border,
                          borderWidth: 1,
                          borderRadius: 16,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{ color: active ? colors.onTurmeric : colors.textSecondary, fontSize: 11, fontFamily: 'Inter500' }}
                        >
                          {t}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* Aperçu direct de la carte Feed */}
              <View style={{ paddingTop: 4 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: 'Inter700', textTransform: 'uppercase', marginBottom: 6 }}>
                  Aperçu dans le feed
                </Text>
                <View
                  style={{
                    backgroundColor: colors.deep,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15, fontFamily: 'SpaceGrotesk700', fontWeight: 'bold' }}>
                    {name.trim() || 'Nom du projet'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Inter400' }} numberOfLines={2}>
                    {tagline.trim() || 'Votre slogan apparaîtra ici...'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <View style={{ backgroundColor: (selectedStatusObj?.color || colors.turmeric) + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: selectedStatusObj?.color || colors.turmeric, fontSize: 10, fontFamily: 'Inter700', fontWeight: 'bold' }}>
                        {(status || 'idea').toUpperCase()}
                      </Text>
                    </View>
                    {location.trim() ? (
                      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: 'Inter400' }}>
                          {location.trim()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </SoftSurface>
          </ScrollView>

          {/* Sticky Bottom Toolbar (au-dessus du clavier) */}
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
              {/* Bouton Média / Cover */}
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

              {/* Indicateur Localisation */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={15} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter500' }}>
                  {location || 'Remote'}
                </Text>
              </View>

              {/* Indicateur Statut */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Sparkles size={15} color={selectedStatusObj?.color || colors.turmeric} />
                <Text style={{ color: selectedStatusObj?.color || colors.turmeric, fontSize: 11, fontFamily: 'SpaceGrotesk700', fontWeight: 'bold' }}>
                  {selectedStatusObj?.label || 'Idée'}
                </Text>
              </View>
            </View>

            {/* Compteur Tagline */}
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter400' }}>
              {120 - tagline.length}
            </Text>
          </View>
        </View>
      </KeyboardSafe>
    </SafeAreaView>
  );
}
