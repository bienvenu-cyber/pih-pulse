import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Target, Calendar, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Facile', color: '#7CB87A' },
  { id: 'medium', label: 'Moyen', color: '#FFBE0B' },
  { id: 'hard', label: 'Difficile', color: '#E8634A' },
];

const SKILLS_POOL = [
  'React Native', 'Figma', 'TypeScript', 'Node.js', 'Supabase', 'Python', 'Marketing', 'Agile'
];

export default function CreateMissionScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('80');
  const [duration, setDuration] = useState('5 jours');
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (!error && data && data.length > 0) {
        setProjects(data);
        setSelectedProject(data[0].id);
      } else {
        setErrorMsg('Aucun projet trouvé pour y attacher la mission.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleCreate = async () => {
    if (!selectedProject) {
      setErrorMsg('Veuillez sélectionner un projet.');
      return;
    }
    if (!title) {
      setErrorMsg('Le titre de la mission est obligatoire.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Insérer la mission dans la table missions
      const { error } = await supabase
        .from('missions')
        .insert({
          project_id: selectedProject,
          title: title,
          description: description || title,
          difficulty: difficulty,
          points_reward: parseInt(reward) || 50,
          skills_required: selectedSkills,
          status: 'open'
        });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      // Retourner en arrière
      router.back();
    } catch (err: any) {
      setErrorMsg('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  if (projectsLoading) {
    return (
      <View className="flex-1 bg-malt-deep items-center justify-center">
        <ActivityIndicator size="large" color="#FFBE0B" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-malt-deep">
      {/* custom Header */}
      <View className="h-14 flex-row items-center justify-between px-6 bg-malt-nav border-b border-malt">
        <Pressable onPress={handleBack} disabled={loading} className="w-9 h-9 rounded-full bg-malt-card border border-malt items-center justify-center">
          <ArrowLeft size={18} color="#F5EDD6" />
        </Pressable>
        <Text className="text-creme font-space text-base font-bold">Nouvelle Mission</Text>
        <View className="w-9 h-9" />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {errorMsg ? (
            <View className="bg-corail/15 border border-corail/30 p-4 rounded-2xl">
              <Text className="text-corail font-inter text-xs font-semibold leading-5 text-center">
                {errorMsg}
              </Text>
            </View>
          ) : null}

          {/* Section Projet & Identité */}
          <View className="gap-4 bg-malt-card border border-malt rounded-3xl p-5">
            <Text className="text-creme font-space text-[15px] font-bold mb-1">Détails de la mission</Text>
            
            {/* Projet Associé */}
            <View className="gap-1.5">
              <Text className="text-sable font-inter text-[11px] uppercase font-semibold tracking-wider">
                Projet associé
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
              >
                {projects.map(proj => {
                  const isSelected = selectedProject === proj.id;
                  return (
                    <Pressable
                      key={proj.id}
                      onPress={() => setSelectedProject(proj.id)}
                      disabled={loading}
                      className="px-4 py-3.5 rounded-xl border items-center bg-malt-deep"
                      style={{
                        borderColor: isSelected ? '#FFBE0B' : '#261F12',
                        borderWidth: 1.2
                      }}
                    >
                      <Text className={`font-space text-xs font-bold ${isSelected ? 'text-turmeric' : 'text-creme'}`}>
                        {proj.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Titre */}
            <View className="gap-1.5 mt-2">
              <Text className="text-sable font-inter text-[11px] uppercase font-semibold tracking-wider">
                Titre de la mission
              </Text>
              <TextInput
                placeholder="Ex: Développer la page d'authentification"
                placeholderTextColor="#A39171"
                value={title}
                onChangeText={setTitle}
                editable={!loading}
                className="h-12 border border-malt bg-malt-deep rounded-xl px-4 text-creme font-inter text-sm"
              />
            </View>

            {/* Description détaillée */}
            <View className="gap-1.5">
              <Text className="text-sable font-inter text-[11px] uppercase font-semibold tracking-wider">
                Cahier des charges / Tâches
              </Text>
              <TextInput
                placeholder="Décrivez précisément les tâches à réaliser et le livrable attendu..."
                placeholderTextColor="#A39171"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!loading}
                className="min-h-[100px] border border-malt bg-malt-deep rounded-xl p-4 text-creme font-inter text-sm"
              />
            </View>
          </View>

          {/* Section Paramètres de récompense */}
          <View className="gap-4 bg-malt-card border border-malt rounded-3xl p-5">
            <Text className="text-creme font-space text-[15px] font-bold">Récompense & Difficulté</Text>
            
            {/* Difficulté */}
            <View className="gap-1.5">
              <Text className="text-sable font-inter text-[11px] uppercase font-semibold tracking-wider">
                Niveau de difficulté
              </Text>
              <View className="flex-row gap-2">
                {DIFFICULTY_OPTIONS.map(opt => {
                  const isSelected = difficulty === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setDifficulty(opt.id)}
                      disabled={loading}
                      className="flex-1 rounded-xl border p-3 items-center bg-malt-deep"
                      style={{
                        borderColor: isSelected ? opt.color : '#261F12',
                        borderWidth: 1.2
                      }}
                    >
                      <Text 
                        className="font-space text-xs font-bold"
                        style={{ color: isSelected ? opt.color : '#F5EDD6' }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Points Reward */}
            <View className="gap-1.5 mt-2">
              <Text className="text-sable font-inter text-[11px] uppercase font-semibold tracking-wider">
                Points de Réputation ({reward} pts)
              </Text>
              <TextInput
                placeholder="Ex: 80"
                placeholderTextColor="#A39171"
                value={reward}
                onChangeText={setReward}
                keyboardType="numeric"
                editable={!loading}
                className="h-12 border border-malt bg-malt-deep rounded-xl px-4 text-creme font-inter text-sm"
              />
            </View>

            {/* Durée estimée */}
            <View className="gap-1.5">
              <Text className="text-sable font-inter text-[11px] uppercase font-semibold tracking-wider">
                Durée estimée
              </Text>
              <View className="flex-row items-center border border-malt bg-malt-deep rounded-xl px-4 h-12 gap-2">
                <Calendar size={16} color="#A39171" />
                <TextInput
                  placeholder="Ex: 5 jours (ou 48 heures)"
                  placeholderTextColor="#A39171"
                  value={duration}
                  onChangeText={setDuration}
                  editable={!loading}
                  className="flex-1 text-creme font-inter text-sm h-full"
                />
              </View>
            </View>
          </View>

          {/* Section Compétences clés */}
          <View className="gap-4 bg-malt-card border border-malt rounded-3xl p-5">
            <Text className="text-creme font-space text-[15px] font-bold">Compétences recherchées</Text>
            <View className="flex-row flex-wrap gap-2">
              {SKILLS_POOL.map(skill => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <Pressable
                    key={skill}
                    onPress={() => toggleSkill(skill)}
                    disabled={loading}
                    className="px-3 py-2 rounded-xl border flex-row items-center gap-1.5"
                    style={{
                      backgroundColor: isSelected ? '#F5EDD6' : '#0D0B05',
                      borderColor: isSelected ? '#F5EDD6' : '#261F12',
                      borderWidth: 1.2
                    }}
                  >
                    <Text className={`font-inter text-xs font-medium ${isSelected ? 'text-malt-deep' : 'text-sable'}`}>
                      {skill}
                    </Text>
                    {isSelected && <Check size={12} color="#0D0B05" strokeWidth={2.5} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* CTA Publication */}
          <Pressable 
            onPress={handleCreate}
            disabled={loading}
            className="bg-turmeric h-14 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90 mt-2"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0D0B05" />
            ) : (
              <>
                <Target size={18} color="#0D0B05" />
                <Text className="text-malt-deep font-inter-bold text-base font-bold">
                  Publier la Mission
                </Text>
              </>
            )}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
