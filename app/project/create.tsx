import { useRouter } from 'expo-router';
import { Layers, MapPin, Sparkles, Users, Wrench } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
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
import { grantCreateProjectImpact } from '../../lib/hub';
import { IMPACT_POINTS } from '../../lib/impact';
import type { MediaAsset } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const STATUS_OPTIONS = [
  { id: 'idea', label: 'Idée', description: 'Concept initial' },
  { id: 'prototype', label: 'Prototype', description: 'Maquette ou démo' },
  { id: 'mvp', label: 'MVP', description: 'Produit lancé' },
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

const STEPS = ['Identité', 'Équipe', 'Médias'];

export default function CreateProjectScreen() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idea');
  const [location, setLocation] = useState('Parakou');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
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
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const progress = useMemo(() => (step + 1) / STEPS.length, [step]);

  const validateStep0 = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Donne un nom à ton projet.';
    if (!tagline.trim()) errs.tagline = 'Une tagline courte aide le feed.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    setErrorMsg('');
    if (step === 0 && !validateStep0()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrorMsg('');
    if (step > 0) setStep((s) => s - 1);
    else router.back();
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
        router.replace('/login');
        return;
      }

      const cover = media.find((m) => m.type === 'image')?.url || null;

      // roles: stocker labels lisibles (pas seulement les ids chips)
      const roleLabels = selectedRoles.map((id) => {
        const found = ROLES_POOL.find((r) => r.id === id);
        return found?.label || id;
      });

      const basePayload = {
        name: name.trim(),
        short_description: tagline.trim(),
        description: description.trim() || tagline.trim(),
        creator_id: user.id,
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
        // Colonnes pas encore migrées → insert basique
        const basicInsert = await supabase
          .from('projects')
          .insert(basePayload)
          .select('id')
          .single();
        projData = basicInsert.data;
        projError = basicInsert.error;
        if (!basicInsert.error && fullInsert.error) {
          console.warn(
            '[project/create] location/roles non persistés — lance FIX_PROJECT_LOCATION_ROLES.sql'
          );
        }
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
          user_id: user.id,
          role: 'Founder & Lead',
        });
        if (memberError) {
          console.error('Founder member:', memberError.message);
        }
        await grantCreateProjectImpact(user.id, name.trim());
        router.replace(`/project/${projData.id}`);
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
      title="Nouveau projet"
      subtitle={`${STEPS[step]} · ${step + 1}/${STEPS.length}`}
      onBack={handleBack}
      loading={authChecking}
      progress={progress}
      footer={
        <StepFooter
          showBack={step > 0}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onNext={step < STEPS.length - 1 ? handleNext : handleCreate}
          nextLabel={
            step < STEPS.length - 1
              ? 'Continuer'
              : `Lancer le projet · +${IMPACT_POINTS.createProject}`
          }
          nextIcon={step === STEPS.length - 1 ? Sparkles : undefined}
          loading={loading}
        />
      }
    >
      <ImpactBanner
        points={IMPACT_POINTS.createProject}
        label="Créer un projet crédite +25 Impact. Tu deviens Founder & Lead automatiquement."
      />

      {errorMsg ? <FormAlert message={errorMsg} /> : null}

      {/* Step pills */}
      <View className="flex-row gap-2">
        {STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <View
              key={label}
              style={{
                backgroundColor: active || done ? colors.turmeric + '18' : colors.card,
                borderColor: active ? colors.turmeric : colors.border,
              }}
              className="flex-1 border rounded-xl py-2 items-center"
            >
              <Text
                style={{
                  color: active || done ? colors.turmeric : colors.textSecondary,
                }}
                className="font-inter text-[10px] font-bold"
              >
                {i + 1}. {label}
              </Text>
            </View>
          );
        })}
      </View>

      {step === 0 ? (
        <FormSection
          icon={Layers}
          stepLabel="Étape 1"
          title="Identité de la startup"
          subtitle="Nom percutant + promesse claire en une ligne."
        >
          <FormField
            label="Nom du projet"
            required
            placeholder="Ex: WapiFood"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: '' }));
            }}
            editable={!loading}
            error={fieldErrors.name}
            maxLength={60}
            counter={{ current: name.length, max: 60 }}
          />
          <FormField
            label="Slogan"
            required
            placeholder="Ex: Livraison repas via Mobile Money"
            value={tagline}
            onChangeText={(t) => {
              setTagline(t);
              if (fieldErrors.tagline) setFieldErrors((e) => ({ ...e, tagline: '' }));
            }}
            editable={!loading}
            error={fieldErrors.tagline}
            maxLength={120}
            counter={{ current: tagline.length, max: 120 }}
            hint="Visible en premier dans le feed"
          />
          <FormMultiline
            label="Description"
            placeholder="Problème, solution, pour qui, objectif 3 mois…"
            value={description}
            onChangeText={setDescription}
            editable={!loading}
            minHeight={120}
            maxLength={1200}
            counter={{ current: description.length, max: 1200 }}
            hint="Optionnel mais fortement recommandé"
          />
        </FormSection>
      ) : null}

      {step === 1 ? (
        <>
          <FormSection
            icon={Sparkles}
            stepLabel="Étape 2"
            title="Avancement"
            subtitle="Où en es-tu vraiment ? La transparence attire les contributeurs."
          >
            <ChoiceGrid options={STATUS_OPTIONS} value={status} onChange={setStatus} />
            <FormField
              label="Localisation"
              placeholder="Parakou, Bénin · Remote"
              value={location}
              onChangeText={setLocation}
              leftIcon={MapPin}
              editable={!loading}
            />
          </FormSection>

          <FormSection
            icon={Users}
            title="Rôles recherchés"
            subtitle="Qui veux-tu dans l’équipe maintenant ?"
          >
            <ChipSelect
              options={ROLES_POOL}
              values={selectedRoles}
              onChange={setSelectedRoles}
            />
          </FormSection>

          <FormSection
            icon={Wrench}
            title="Stack & compétences"
            subtitle="Ce que le projet utilise ou cherche."
          >
            <ChipSelect
              options={TECHS_POOL}
              values={selectedTechs}
              onChange={setSelectedTechs}
            />
          </FormSection>
        </>
      ) : null}

      {step === 2 ? (
        <FormSection
          icon={Layers}
          stepLabel="Étape 3"
          title="Visuels & lancement"
          subtitle="Une image forte multiplie les réactions. Récap avant publication."
        >
          <MediaPickerField
            userId={userId}
            value={media}
            onChange={setMedia}
            maxItems={4}
            label="Cover & galerie"
          />

          <View
            style={{ backgroundColor: colors.deep, borderColor: colors.border }}
            className="border rounded-2xl p-4 gap-2 mt-1"
          >
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] uppercase font-bold tracking-wider">
              Aperçu
            </Text>
            <Text style={{ color: colors.text }} className="font-space text-[16px] font-bold">
              {name.trim() || 'Nom du projet'}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[13px] leading-5">
              {tagline.trim() || 'Ta tagline apparaîtra ici'}
            </Text>
            <View className="flex-row flex-wrap gap-2 mt-1">
              <View
                className="px-2.5 py-1 rounded-full"
                style={{ backgroundColor: colors.turmeric + '22' }}
              >
                <Text style={{ color: colors.turmeric }} className="font-inter text-[10px] font-bold">
                  {(status || 'idea').toUpperCase()}
                </Text>
              </View>
              {location.trim() ? (
                <View
                  className="px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                    {location.trim()}
                  </Text>
                </View>
              ) : null}
              {selectedTechs.slice(0, 3).map((t) => (
                <View
                  key={t}
                  className="px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </FormSection>
      ) : null}
    </FormScreen>
  );
}
