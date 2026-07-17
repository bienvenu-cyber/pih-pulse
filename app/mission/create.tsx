import { useRouter } from 'expo-router';
import { Award, Calendar, Layers, Target } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import MediaPickerField from '../../components/MediaPickerField';
import {
  ChoiceGrid,
  ChipSelect,
  FormAlert,
  FormField,
  FormMultiline,
  FormScreen,
  FormSection,
  ImpactBanner,
  StepFooter,
} from '../../components/ui/form/FormPrimitives';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { parseDurationToDeadline } from '../../lib/deadline';
import { grantCreateMissionImpact } from '../../lib/hub';
import { IMPACT_POINTS } from '../../lib/impact';
import type { MediaAsset } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Facile', description: 'Quelques heures', color: '#7CB87A' },
  { id: 'medium', label: 'Moyen', description: 'Quelques jours', color: '#FFBE0B' },
  { id: 'hard', label: 'Difficile', description: 'Sprint sérieux', color: '#E8634A' },
];

const SKILLS_POOL = [
  'React Native',
  'Figma',
  'TypeScript',
  'Node.js',
  'Supabase',
  'Python',
  'Marketing',
  'Agile',
].map((s) => ({ id: s, label: s }));

const REWARD_PRESETS = [40, 80, 120, 200];
const DURATION_PRESETS = ['3 jours', '5 jours', '7 jours', '14 jours', '48 h'];
const STEPS = ['Brief', 'Récompense'];

export default function CreateMissionScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('80');
  const [duration, setDuration] = useState('5 jours');
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaAsset[]>([]);

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
      await fetchProjects(session.user.id);
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

  const progress = useMemo(() => (step + 1) / STEPS.length, [step]);

  const validateStep0 = () => {
    const errs: Record<string, string> = {};
    if (!selectedProject) errs.project = 'Choisis un projet.';
    if (!title.trim()) errs.title = 'Le titre est obligatoire.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return false;
    return true;
  };

  const handleNext = () => {
    setErrorMsg('');
    if (step === 0 && !validateStep0()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const handleCreate = async () => {
    if (!validateStep0()) {
      setStep(0);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setErrorMsg('Tu dois être connecté pour créer une mission.');
        setLoading(false);
        return;
      }

      // Lead via membership OU créateur du projet
      const { data: membership } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', selectedProject)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: owned } = await supabase
        .from('projects')
        .select('id')
        .eq('id', selectedProject)
        .eq('creator_id', user.id)
        .maybeSingle();

      const role = (membership?.role || '').toLowerCase();
      const isLeadMember =
        role.includes('founder') || role.includes('lead') || role.includes('creator');
      const isCreator = !!owned;

      if (!isLeadMember && !isCreator) {
        setErrorMsg('Seuls les Founders et Leads peuvent créer des missions.');
        setLoading(false);
        return;
      }

      const deadline =
        parseDurationToDeadline(duration) ||
        parseDurationToDeadline('5 jours');

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

      await grantCreateMissionImpact(user.id, title.trim(), missionRow?.id);
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

  return (
    <FormScreen
      title="Nouvelle mission"
      subtitle={`${STEPS[step]} · ${step + 1}/${STEPS.length}`}
      onBack={() => {
        if (step > 0) setStep((s) => s - 1);
        else router.back();
      }}
      loading={authChecking || projectsLoading}
      progress={progress}
      footer={
        <StepFooter
          showBack={step > 0}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onNext={step < STEPS.length - 1 ? handleNext : handleCreate}
          nextLabel={
            step < STEPS.length - 1
              ? 'Continuer'
              : `Publier · +${IMPACT_POINTS.createMission}`
          }
          nextIcon={step === STEPS.length - 1 ? Target : undefined}
          loading={loading}
          nextDisabled={projects.length === 0}
        />
      }
    >
      <ImpactBanner
        points={IMPACT_POINTS.createMission}
        label="Publier une mission crédite +15 Élan. Les contributeurs gagnent aussi à la validation."
      />

      {errorMsg ? <FormAlert message={errorMsg} /> : null}

      {step === 0 ? (
        <FormSection
          icon={Target}
          stepLabel="Étape 1"
          title="Brief de la mission"
          subtitle="Un titre actionnable + un livrable clair = plus de candidatures."
        >
          <View className="gap-1.5">
            <Text
              style={{ color: colors.textSecondary }}
              className="font-inter text-[11px] font-semibold"
            >
              Projet associé *
            </Text>
            {projects.length === 0 ? (
              <Text style={{ color: colors.corail }} className="font-inter text-[12px]">
                Aucun projet lead. Crée un projet d’abord.
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {projects.map((proj) => {
                  const active = selectedProject === proj.id;
                  return (
                    <Pressable
                      key={proj.id}
                      onPress={() => setSelectedProject(proj.id)}
                      style={{
                        backgroundColor: active ? colors.turmeric : colors.deep,
                        borderColor: active ? colors.turmeric : colors.border,
                      }}
                      className="border rounded-2xl px-3.5 py-2.5 flex-row items-center gap-2"
                    >
                      <Layers
                        size={14}
                        color={active ? colors.onTurmeric : colors.textSecondary}
                      />
                      <Text
                        style={{ color: active ? colors.onTurmeric : colors.text }}
                        className="font-inter text-[12px] font-semibold"
                      >
                        {proj.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {fieldErrors.project ? (
              <Text style={{ color: colors.corail }} className="font-inter text-[11px]">
                {fieldErrors.project}
              </Text>
            ) : null}
          </View>

          <FormField
            label="Titre"
            required
            placeholder="Ex: Auth email + OTP sur mobile"
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (fieldErrors.title) setFieldErrors((e) => ({ ...e, title: '' }));
            }}
            editable={!loading}
            error={fieldErrors.title}
            maxLength={100}
            counter={{ current: title.length, max: 100 }}
          />
          <FormMultiline
            label="Cahier des charges"
            placeholder="Contexte, tâches, livrable attendu, critères d’acceptation…"
            value={description}
            onChangeText={setDescription}
            editable={!loading}
            minHeight={140}
            maxLength={1500}
            counter={{ current: description.length, max: 1500 }}
          />
        </FormSection>
      ) : null}

      {step === 1 ? (
        <>
          <FormSection
            icon={Award}
            stepLabel="Étape 2"
            title="Difficulté & Élan"
            subtitle="Calibre l’effort pour attirer le bon profil."
          >
            <ChoiceGrid
              options={DIFFICULTY_OPTIONS}
              value={difficulty}
              onChange={setDifficulty}
            />

            <View className="gap-2">
              <Text
                style={{ color: colors.textSecondary }}
                className="font-inter text-[11px] font-semibold"
              >
                Points de récompense
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {REWARD_PRESETS.map((pts) => {
                  const active = reward === String(pts);
                  return (
                    <Pressable
                      key={pts}
                      onPress={() => setReward(String(pts))}
                      style={{
                        backgroundColor: active ? colors.turmeric : colors.deep,
                        borderColor: active ? colors.turmeric : colors.border,
                      }}
                      className="border rounded-full px-4 py-2"
                    >
                      <Text
                        style={{ color: active ? colors.onTurmeric : colors.textSecondary }}
                        className="font-space text-[12px] font-bold"
                      >
                        {pts} pts
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <FormField
                label="Personnalisé"
                placeholder="80"
                value={reward}
                onChangeText={setReward}
                keyboardType="numeric"
                editable={!loading}
                hint="Le contributeur gagne ces points à la validation"
              />
            </View>

            <View className="gap-2">
              <Text
                style={{ color: colors.textSecondary }}
                className="font-inter text-[11px] font-semibold"
              >
                Durée estimée → échéance
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DURATION_PRESETS.map((d) => {
                  const active = duration === d;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setDuration(d)}
                      style={{
                        backgroundColor: active ? colors.turmeric : colors.deep,
                        borderColor: active ? colors.turmeric : colors.border,
                      }}
                      className="border rounded-full px-3.5 py-2"
                    >
                      <Text
                        style={{
                          color: active ? colors.onTurmeric : colors.textSecondary,
                        }}
                        className="font-inter text-[11px] font-semibold"
                      >
                        {d}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <FormField
                label="Personnalisé"
                placeholder="Ex: 5 jours · 48 h · 2 semaines"
                value={duration}
                onChangeText={setDuration}
                leftIcon={Calendar}
                editable={!loading}
                hint="Enregistré comme date limite (deadline) en base"
              />
            </View>
          </FormSection>

          <FormSection title="Compétences" subtitle="Tags pour le matching « Pour moi ».">
            <ChipSelect
              options={SKILLS_POOL}
              values={selectedSkills}
              onChange={setSelectedSkills}
            />
          </FormSection>

          <FormSection title="Médias" subtitle="Mockups, captures, brief visuel (optionnel).">
            <MediaPickerField
              userId={userId}
              value={media}
              onChange={setMedia}
              maxItems={3}
              label="Pièces jointes"
            />
          </FormSection>
        </>
      ) : null}
    </FormScreen>
  );
}
