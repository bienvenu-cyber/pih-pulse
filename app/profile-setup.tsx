import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import {
  ChipSelect,
  ChoiceGrid,
  FormAlert,
  FormMultiline,
  FormScreen,
  FormSection,
  StepFooter,
} from '../components/ui/form/FormPrimitives';
import { supabase } from '../lib/supabase';

const ROLES = [
  { id: 'developer', label: 'Développeur', description: 'Code des solutions' },
  { id: 'designer', label: 'Designer', description: 'Conçoit les interfaces' },
  { id: 'entrepreneur', label: 'Entrepreneur', description: 'Porte les projets' },
  { id: 'product_creator', label: 'Product Owner', description: 'Cadre les produits' },
  { id: 'mentor', label: 'Mentor', description: 'Guide les porteurs' },
  { id: 'investisseur', label: 'Investisseur', description: 'Finance l’avenir' },
  { id: 'influenceur', label: 'Influenceur', description: 'Porte la voix du hub' },
  { id: 'secretaire', label: 'Secrétaire', description: 'Organise le quotidien' },
];

const SKILLS_MAP: Record<string, string[]> = {
  developer: [
    'React Native',
    'TypeScript',
    'Node.js',
    'Supabase',
    'Python',
    'Git/GitHub',
    'API REST',
    'Docker',
  ],
  designer: [
    'Figma',
    'UI Design',
    'UX Research',
    'Wireframing',
    'Illustrator',
    'Photoshop',
    'Branding',
  ],
  entrepreneur: [
    'Pitching',
    'Business Model',
    'Stratégie',
    'Marketing',
    'Financement',
    'Recrutement',
    'Ventes',
  ],
  product_creator: [
    'Gestion de Projet',
    'Agile/Scrum',
    'Product Spec',
    'Roadmap',
    'User Stories',
    'Figma Viewer',
  ],
  mentor: [
    'Accompagnement',
    'Mentorat',
    'Réseau',
    'Pitch Training',
    'Conseil Tech',
    'Stratégie Scale',
  ],
  investisseur: [
    'Financement',
    'Levée de Fonds',
    'Business Plan',
    'Venture Capital',
    'Due Diligence',
    'Réseau',
  ],
  influenceur: [
    'Réseaux Sociaux',
    'Communication',
    'Création de Contenu',
    'Branding',
    'Copywriting',
    'Publicité',
  ],
  secretaire: [
    'Organisation',
    'Gestion Administrative',
    'Planification',
    'Communication',
    'Rédaction',
    'Outils Office',
  ],
};

export default function ProfileSetupScreen() {
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState('developer');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const availableSkills = (SKILLS_MAP[selectedRole] || []).map((s) => ({ id: s, label: s }));

  const handleFinishSetup = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setErrorMsg("Aucun utilisateur connecté n'a été trouvé.");
        setLoading(false);
        return;
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
          skills: selectedSkills,
          bio,
        })
        .eq('id', user.id);
      if (updateError) {
        setErrorMsg(updateError.message);
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
      title="Configuration"
      subtitle={step === 0 ? 'Ton rôle au hub' : 'Compétences & bio'}
      onBack={() => (step > 0 ? setStep(0) : router.replace('/login'))}
      progress={(step + 1) / 2}
      footer={
        <StepFooter
          showBack={step > 0}
          onBack={() => setStep(0)}
          onNext={
            step === 0
              ? () => {
                  setSelectedSkills([]);
                  setErrorMsg('');
                  setStep(1);
                }
              : handleFinishSetup
          }
          nextLabel={step === 0 ? 'Continuer' : 'Finaliser mon profil'}
          nextIcon={step === 1 ? Sparkles : undefined}
          loading={loading}
        />
      }
    >
      {errorMsg ? <FormAlert message={errorMsg} /> : null}

      {step === 0 ? (
        <FormSection
          icon={Sparkles}
          stepLabel="Étape 1/2"
          title="Quel est ton rôle ?"
          subtitle="Choisis la spécialité qui te représente le mieux dans le hub."
        >
          <ChoiceGrid
            options={ROLES}
            value={selectedRole}
            onChange={setSelectedRole}
            columns={2}
          />
        </FormSection>
      ) : (
        <>
          <FormSection
            stepLabel="Étape 2/2"
            title="Compétences"
            subtitle="Sélectionne ce que tu apportes concrètement."
          >
            <ChipSelect
              options={availableSkills}
              values={selectedSkills}
              onChange={setSelectedSkills}
            />
          </FormSection>
          <FormSection title="Bio" subtitle="Quelques lignes pour te présenter à l’équipe.">
            <FormMultiline
              label="Présentation"
              placeholder="Ex: Dev mobile, je cherche des projets à impact à Parakou…"
              value={bio}
              onChangeText={setBio}
              minHeight={120}
              maxLength={400}
              counter={{ current: bio.length, max: 400 }}
              editable={!loading}
            />
          </FormSection>
        </>
      )}
    </FormScreen>
  );
}
