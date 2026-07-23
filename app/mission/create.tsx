import { useRouter } from 'expo-router';
import { Award, Calendar, Image as ImageIcon, Layers, Target, X as XIcon } from 'lucide-react-native';
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
import { parseDurationToDeadline } from '../../lib/deadline';
import { grantCreateMissionImpact } from '../../lib/hub';
import { IMPACT_POINTS } from '../../lib/impact';
import { pickAndUploadPostMedia, type MediaAsset } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Facile', desc: 'Quelques heures', color: '#7CB87A' },
  { id: 'medium', label: 'Moyen', desc: 'Quelques jours', color: '#FFBE0B' },
  { id: 'hard', label: 'Difficile', desc: 'Sprint sérieux', color: '#E8634A' },
];

const REWARD_PRESETS = [40, 80, 120, 200];
const DURATION_PRESETS = ['3j', '5j', '7j', '14j'];

const SKILLS_POOL = [
  'React Native',
  'Figma',
  'TypeScript',
  'Node.js',
  'Supabase',
  'Python',
  'Marketing',
  'Agile',
];

export default function CreateMissionScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('80');
  const [customReward, setCustomReward] = useState(false);
  const [duration, setDuration] = useState('5j');
  const [customDuration, setCustomDuration] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
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
      await fetchProjects(uid);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const fetchProjects = async (uid: string) => {
    try {
      const { data: memberships, error } = await supabase
        .from('project_members')
        .select('role, projects(id, name)')
        .eq('user_id', uid);

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      const leadProjects = (memberships || [])
        .filter((m: any) => {
          const role = (m.role || '').toLowerCase();
          return role.includes('founder') || role.includes('lead') || role.includes('creator');
        })
        .map((m: any) => {
          const p = Array.isArray(m.projects) ? m.projects[0] : m.projects;
          return p ? { id: p.id, name: p.name } : null;
        })
        .filter(Boolean) as { id: string; name: string }[];

      const { data: owned } = await supabase
        .from('projects')
        .select('id, name')
        .eq('creator_id', uid);

      const byId = new Map<string, { id: string; name: string }>();
      [...leadProjects, ...(owned || [])].forEach((p: any) => {
        if (p?.id) byId.set(p.id, p);
      });
      const list = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));

      if (list.length > 0) {
        setProjects(list);
        setSelectedProject(list[0].id);
      } else {
        setErrorMsg('Aucun projet où tu es Founder/Lead. Crée un projet d’abord.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
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

  const canPublish = selectedProject && title.trim().length > 0 && !loading && !uploadingMedia;

  const handleCreate = async () => {
    if (!canPublish || !userId) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const deadline = parseDurationToDeadline(duration) || parseDurationToDeadline('5 jours');

      const { data: missionRow, error } = await supabase
        .from('missions')
        .insert({
          project_id: selectedProject,
          title: title.trim(),
          description: description.trim() || title.trim(),
          difficulty,
          points_reward: parseInt(reward, 10) || 50,
          skills_required: selectedSkills,
          status: 'open',
          deadline,
          media,
        })
        .select('id')
        .single();

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      await grantCreateMissionImpact(userId, title.trim(), missionRow?.id);
      if (missionRow?.id) {
        router.replace(`/mission/${missionRow.id}`);
        return;
      }
      router.back();
    } catch {
      setErrorMsg('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  if (authChecking || projectsLoading) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1">
        <ScreenSkeleton variant="form" />
      </View>
    );
  }

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
              Publier (+{IMPACT_POINTS.createMission} Élan)
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

            {/* Projet associé (chips horizontales épurées) */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter600' }}>
                Projet associé *
              </Text>
              {projects.length === 0 ? (
                <Text style={{ color: colors.corail, fontSize: 12, fontFamily: 'Inter400' }}>
                  Aucun projet lead. Crée un projet d’abord.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {projects.map((proj) => {
                    const active = selectedProject === proj.id;
                    return (
                      <PressableScale
                        key={proj.id}
                        onPress={() => setSelectedProject(proj.id)}
                        style={{
                          backgroundColor: active ? colors.turmeric : colors.card,
                          borderColor: active ? colors.turmeric : colors.border,
                          borderWidth: 1,
                          borderRadius: 20,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Layers size={13} color={active ? colors.onTurmeric : colors.textSecondary} />
                        <Text
                          style={{
                            color: active ? colors.onTurmeric : colors.text,
                            fontSize: 12,
                            fontFamily: 'Inter600',
                          }}
                        >
                          {proj.name}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Layout Canvas Mission : Avatar + Inputs Titre et Cahier des Charges */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <ProfileAvatar
                uri={userProfile?.avatar_url}
                name={userProfile?.full_name}
                size={40}
                bg={colors.card}
                borderColor={colors.border}
              />

              <View style={{ flex: 1, gap: 12 }}>
                {/* Titre */}
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Titre de la mission (ex: Auth OTP Mobile)..."
                  placeholderTextColor={colors.textSecondary}
                  maxLength={100}
                  editable={!loading}
                  autoFocus
                  style={
                    {
                      color: colors.text,
                      fontSize: 17,
                      fontFamily: 'SpaceGrotesk700',
                      fontWeight: 'bold',
                      backgroundColor: 'transparent',
                      borderWidth: 0,
                      outlineStyle: 'none',
                      padding: 0,
                    } as any
                  }
                />

                {/* Cahier des charges / Description */}
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Contexte, tâches, livrables attendus, critères d’acceptation..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={1500}
                  editable={!loading}
                  style={
                    {
                      color: colors.text,
                      minHeight: 90,
                      textAlignVertical: 'top',
                      fontSize: 15,
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

            {/* Paramètres de la mission : Difficulté, Points & Durée */}
            <SoftSurface className="p-3.5 gap-3.5">
              {/* Difficulté */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter600' }}>
                  Difficulté
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {DIFFICULTY_OPTIONS.map((opt) => {
                    const active = difficulty === opt.id;
                    return (
                      <PressableScale
                        key={opt.id}
                        onPress={() => setDifficulty(opt.id)}
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
                        <Text style={{ color: colors.textSecondary, fontSize: 9, fontFamily: 'Inter400', marginTop: 1 }}>
                          {opt.desc}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* Récompense (Points Élan) */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter600' }}>
                  Récompense (Points Élan)
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {REWARD_PRESETS.map((pts) => {
                    const active = reward === String(pts) && !customReward;
                    return (
                      <PressableScale
                        key={pts}
                        onPress={() => {
                          setReward(String(pts));
                          setCustomReward(false);
                        }}
                        style={{
                          backgroundColor: active ? colors.turmeric : colors.deep,
                          borderColor: active ? colors.turmeric : colors.border,
                          borderWidth: 1,
                          borderRadius: 16,
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                        }}
                      >
                        <Text
                          style={{ color: active ? colors.onTurmeric : colors.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk700', fontWeight: 'bold' }}
                        >
                          {pts} pts
                        </Text>
                      </PressableScale>
                    );
                  })}

                  <PressableScale
                    onPress={() => setCustomReward((prev) => !prev)}
                    style={{
                      backgroundColor: customReward ? colors.turmeric + '20' : colors.deep,
                      borderColor: customReward ? colors.turmeric : colors.border,
                      borderWidth: 1,
                      borderRadius: 16,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={{ color: customReward ? colors.turmeric : colors.textSecondary, fontSize: 11, fontFamily: 'Inter500' }}>
                      Perso
                    </Text>
                  </PressableScale>
                </View>

                {customReward ? (
                  <TextInput
                    value={reward}
                    onChangeText={setReward}
                    keyboardType="numeric"
                    placeholder="Ex: 150"
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
                ) : null}
              </View>

              {/* Durée estimée */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter600' }}>
                  Échéance estimée
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {DURATION_PRESETS.map((d) => {
                    const active = duration === d && !customDuration;
                    return (
                      <PressableScale
                        key={d}
                        onPress={() => {
                          setDuration(d);
                          setCustomDuration(false);
                        }}
                        style={{
                          backgroundColor: active ? colors.turmeric : colors.deep,
                          borderColor: active ? colors.turmeric : colors.border,
                          borderWidth: 1,
                          borderRadius: 16,
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                        }}
                      >
                        <Text
                          style={{ color: active ? colors.onTurmeric : colors.textSecondary, fontSize: 11, fontFamily: 'Inter600' }}
                        >
                          {d}
                        </Text>
                      </PressableScale>
                    );
                  })}

                  <PressableScale
                    onPress={() => setCustomDuration((prev) => !prev)}
                    style={{
                      backgroundColor: customDuration ? colors.turmeric + '20' : colors.deep,
                      borderColor: customDuration ? colors.turmeric : colors.border,
                      borderWidth: 1,
                      borderRadius: 16,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={{ color: customDuration ? colors.turmeric : colors.textSecondary, fontSize: 11, fontFamily: 'Inter500' }}>
                      Perso
                    </Text>
                  </PressableScale>
                </View>

                {customDuration ? (
                  <TextInput
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="Ex: 10 jours · 48 h"
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
                ) : null}
              </View>

              {/* Compétences demandées */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter600' }}>
                  Compétences clés
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {SKILLS_POOL.map((skill) => {
                    const active = selectedSkills.includes(skill);
                    return (
                      <PressableScale
                        key={skill}
                        onPress={() => toggleSkill(skill)}
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
                          {skill}
                        </Text>
                      </PressableScale>
                    );
                  })}
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
              {/* Bouton Média */}
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

              {/* Indicateur Récompense */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Award size={16} color={colors.turmeric} />
                <Text style={{ color: colors.turmeric, fontSize: 11, fontFamily: 'SpaceGrotesk700', fontWeight: 'bold' }}>
                  {reward} pts
                </Text>
              </View>

              {/* Indicateur Durée */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Calendar size={15} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter500' }}>
                  {duration}
                </Text>
              </View>
            </View>

            {/* Compteur titre */}
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter400' }}>
              {100 - title.length}
            </Text>
          </View>
        </View>
      </KeyboardSafe>
    </SafeAreaView>
  );
}
