import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, Sparkles, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const ROLES = [
  { id: 'developer', label: 'Développeur', desc: 'Code des solutions' },
  { id: 'designer', label: 'Designer', desc: 'Conçoit les interfaces' },
  { id: 'entrepreneur', label: 'Entrepreneur', desc: 'Porte les projets' },
  { id: 'product_creator', label: 'Product Owner', desc: 'Cadre les produits' },
  { id: 'mentor', label: 'Mentor', desc: 'Guide les porteurs' },
  { id: 'investisseur', label: 'Investisseur', desc: 'Finance l’avenir' },
  { id: 'influenceur', label: 'Influenceur', desc: 'Porte la voix du hub' },
  { id: 'secretaire', label: 'Secrétaire', desc: 'Organise le quotidien' },
];

const SKILLS_MAP: Record<string, string[]> = {
  developer: ['React Native', 'TypeScript', 'Node.js', 'Supabase', 'Python', 'Git/GitHub', 'API REST', 'Docker'],
  designer: ['Figma', 'UI Design', 'UX Research', 'Wireframing', 'Illustrator', 'Photoshop', 'Branding'],
  entrepreneur: ['Pitching', 'Business Model', 'Stratégie', 'Marketing', 'Financement', 'Recrutement', 'Ventes'],
  product_creator: ['Gestion de Projet', 'Agile/Scrum', 'Product Spec', 'Roadmap', 'User Stories', 'Figma Viewer'],
  mentor: ['Accompagnement', 'Mentorat', 'Réseau', 'Pitch Training', 'Conseil Tech', 'Stratégie Scale'],
  investisseur: ['Financement', 'Levée de Fonds', 'Business Plan', 'Venture Capital', 'Due Diligence', 'Réseau'],
  influenceur: ['Réseaux Sociaux', 'Communication', 'Création de Contenu', 'Branding', 'Copywriting', 'Publicité'],
  secretaire: ['Organisation', 'Gestion Administrative', 'Planification', 'Communication', 'Rédaction', 'Outils Office'],
};

export default function ProfileSetupScreen() {
  const [step, setStep] = useState(0); // 0: Selection du rôle, 1: Compétences + Bio
  const [selectedRole, setSelectedRole] = useState('developer');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();

  const handleNextStep = () => {
    // Vider les compétences si on change de rôle pour repartir propre
    setSelectedSkills([]);
    setErrorMsg('');
    setStep(1);
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep(0);
  };

  const handleFinishSetup = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg("Aucun utilisateur connecté n'a été trouvé.");
        setLoading(false);
        return;
      }

      // Mise à jour du profil public dans PostgreSQL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
          skills: selectedSkills,
          bio: bio,
        })
        .eq('id', user.id);

      if (updateError) {
        setErrorMsg(updateError.message);
        setLoading(false);
        return;
      }

      // Succès : Redirection finale vers le Feed de l'application
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  const handleToggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Récupère les compétences associées au rôle sélectionné
  const availableSkills = SKILLS_MAP[selectedRole] || [];

  return (
    <SafeAreaView className="flex-1 bg-malt-deep">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }} 
          className="px-8 justify-between pb-12 pt-8"
          showsVerticalScrollIndicator={false}
        >
          
          {/* Header */}
          <View className="mt-6">
            <View className="flex-row items-center gap-2 mb-2">
              <Sparkles size={16} color="#FFBE0B" />
              <Text className="text-turmeric font-space text-xs uppercase font-bold tracking-wider">
                Configuration ({step + 1}/2)
              </Text>
            </View>
            <Text className="text-creme font-space text-3xl font-bold tracking-tight mb-2">
              {step === 0 ? 'Quel est votre rôle ?' : 'Parlez-nous de vous'}
            </Text>
            <Text className="text-sable font-inter text-sm leading-5">
              {step === 0 
                ? 'Choisissez la spécialité qui correspond le mieux à votre profil dans le hub.' 
                : 'Sélectionnez vos compétences clés et rédigez une courte présentation.'}
            </Text>
          </View>

          {/* Form Content */}
          <View className="flex-1 justify-center mt-8">
            {errorMsg ? (
              <View className="bg-corail/15 border border-corail/30 p-4 rounded-2xl mb-6">
                <Text className="text-corail font-inter text-xs font-semibold leading-5 text-center">
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            {step === 0 ? (
              /* Étape 1 : Grille des Rôles */
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {ROLES.map(role => {
                  const isSelected = selectedRole === role.id;
                  return (
                    <Pressable
                      key={role.id}
                      onPress={() => setSelectedRole(role.id)}
                      className="w-[48%] bg-malt-card border p-4 rounded-2xl gap-1 active:opacity-90"
                      style={{
                        borderColor: isSelected ? '#FFBE0B' : '#261F12',
                        borderWidth: isSelected ? 1.5 : 1
                      }}
                    >
                      <Text className={`font-space text-sm font-bold ${isSelected ? 'text-turmeric' : 'text-creme'}`}>
                        {role.label}
                      </Text>
                      <Text className="text-sable font-inter text-[10px] leading-4" numberOfLines={2}>
                        {role.desc}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              /* Étape 2 : Compétences et Bio */
              <View className="gap-6">
                
                {/* Liste des compétences */}
                <View className="gap-2.5">
                  <Text className="text-creme font-inter text-xs font-semibold uppercase tracking-wider ml-1">
                    Sélectionnez vos compétences ({selectedSkills.length} choisies)
                  </Text>
                  
                  <View className="flex-row flex-wrap gap-2">
                    {availableSkills.map(skill => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <Pressable
                          key={skill}
                          onPress={() => handleToggleSkill(skill)}
                          disabled={loading}
                          className="px-3.5 py-2.5 rounded-xl border flex-row items-center gap-1.5"
                          style={{
                            backgroundColor: isSelected ? '#F5EDD6' : '#18140B',
                            borderColor: isSelected ? '#F5EDD6' : '#261F12',
                            borderWidth: 1.2
                          }}
                        >
                          <Text 
                            className={`font-inter text-xs font-medium ${
                              isSelected ? 'text-malt-deep' : 'text-sable'
                            }`}
                          >
                            {skill}
                          </Text>
                          {isSelected && <Check size={12} color="#0D0B05" strokeWidth={2.5} />}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Saisie de la Bio */}
                <View className="gap-2.5">
                  <Text className="text-creme font-inter text-xs font-semibold uppercase tracking-wider ml-1">
                    Présentez-vous en quelques mots
                  </Text>
                  <View className="border rounded-2xl bg-malt-card border-malt p-4 min-h-[120px]">
                    <TextInput
                      placeholder="Ex: Développeur passionné par le mobile, je cherche à m'investir sur des projets à fort impact social à Parakou..."
                      placeholderTextColor="#A39171"
                      value={bio}
                      onChangeText={setBio}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      editable={!loading}
                      className="flex-1 text-creme font-inter text-sm leading-5 h-full"
                    />
                  </View>
                </View>

              </View>
            )}
          </View>

          {/* Bottom Navigation Control */}
          <View className="mt-8 justify-end">
            {step === 0 ? (
              <Pressable 
                onPress={handleNextStep}
                className="bg-turmeric h-14 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90"
              >
                <Text className="text-malt-deep font-inter-bold text-base font-bold">
                  Suivant
                </Text>
                <ArrowRight size={18} color="#0D0B05" strokeWidth={2.5} />
              </Pressable>
            ) : (
              <View className="flex-row gap-3">
                <Pressable 
                  onPress={handlePrevStep}
                  disabled={loading}
                  className="w-14 h-14 rounded-2xl border bg-malt-card border-malt items-center justify-center active:bg-malt-hover"
                  style={{ borderWidth: 1 }}
                >
                  <ArrowLeft size={20} color="#F5EDD6" />
                </Pressable>
                
                <Pressable 
                  onPress={handleFinishSetup}
                  disabled={loading}
                  className="flex-1 bg-turmeric h-14 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#0D0B05" />
                  ) : (
                    <>
                      <Text className="text-malt-deep font-inter-bold text-base font-bold">
                        Finaliser mon profil
                      </Text>
                      <ArrowRight size={18} color="#0D0B05" strokeWidth={2.5} />
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
