import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sparkles, MapPin, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const STATUS_OPTIONS = [
  { id: 'idea', label: 'Idée', desc: 'Concept initial' },
  { id: 'prototype', label: 'Prototype', desc: 'Maquette ou démo' },
  { id: 'mvp', label: 'MVP', desc: 'Produit lancé' },
];

const ROLES_POOL = [
  { id: 'dev', label: 'Développeur' },
  { id: 'design', label: 'Designer' },
  { id: 'marketing', label: 'Marketeur' },
  { id: 'po', label: 'Product Owner' },
  { id: 'mentor', label: 'Mentor' },
];

const TECHS_POOL = [
  'React Native', 'Figma', 'TypeScript', 'Node.js', 'Supabase', 'Python', 'IoT', 'PostgreSQL'
];

export default function CreateProjectScreen() {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idea');
  const [location, setLocation] = useState('Parakou');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleCreate = async () => {
    if (!name || !tagline) {
      setErrorMsg('Le nom du projet et le slogan sont obligatoires.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setErrorMsg("Vous devez être connecté pour publier un projet.");
        setLoading(false);
        return;
      }

      // 1. Insérer le projet dans la table projects
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .insert({
          name: name,
          short_description: tagline,
          description: description || tagline,
          creator_id: user.id,
          status: status,
          skills_needed: selectedTechs
        })
        .select('id')
        .single();

      if (projError) {
        setErrorMsg(projError.message);
        setLoading(false);
        return;
      }

      // 2. Ajouter automatiquement le créateur comme membre de l'équipe (Fondateur)
      if (projData) {
        const { error: memberError } = await supabase
          .from('project_members')
          .insert({
            project_id: projData.id,
            user_id: user.id,
            role: 'Founder & Lead'
          });

        if (memberError) {
          console.error('Erreur lors de l’inscription du membre fondateur :', memberError.message);
        }
      }

      // Succès : retour à la liste et rafraîchissement
      router.back();
    } catch (err: any) {
      setErrorMsg('Une erreur inattendue est survenue.');
      setLoading(false);
    }
  };

  const toggleRole = (roleId: string) => {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter(id => id !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const toggleTech = (tech: string) => {
    if (selectedTechs.includes(tech)) {
      setSelectedTechs(selectedTechs.filter(t => t !== tech));
    } else {
      setSelectedTechs([...selectedTechs, tech]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-malt-deep">
      {/* custom Header */}
      <View className="h-14 flex-row items-center justify-between px-6 bg-malt-nav border-b border-malt">
        <Pressable onPress={handleBack} disabled={loading} className="w-9 h-9 rounded-full bg-malt-card border border-malt items-center justify-center">
          <ArrowLeft size={18} color="#F5EDD6" />
        </Pressable>
        <Text className="text-creme font-space text-base font-bold">Nouveau Projet</Text>
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

          {/* Section Identité */}
          <View className="gap-4 bg-malt-card border border-malt rounded-3xl p-5">
            <Text className="text-creme font-space text-[15px] font-bold mb-1">Identité de la startup</Text>
            
            {/* Nom */}
            <View className="gap-1.5">
              <Text className="text-sable font-inter text-[11px] uppercase font-semibold tracking-wider">
                Nom du projet / Startup
              </Text>
              <TextInput
                placeholder="Ex: WapiFood"
                placeholderTextColor="#A39171"
                value={name}
                onChangeText={setName}
                editable={!loading}
                className="h-12 border border-malt bg-malt-deep rounded-xl px-4 text-creme font-inter text-sm"
              />
            </View>

            {/* Tagline */}
            <View className="gap-1.5">
              <Text className="text-sable font-inter text-[11px] uppercase font-semibold tracking-wider">
                Slogan / Description courte
              </Text>
              <TextInput
                placeholder="Ex: Plateforme de livraison de repas par Mobile Money"
                placeholderTextColor="#A39171"
                value={tagline}
                onChangeText={setTagline}
                editable={!loading}
                className="h-12 border border-malt bg-malt-deep rounded-xl px-4 text-creme font-inter text-sm"
              />
            </View>

            {/* Description complète */}
            <View className="gap-1.5">
              <Text className="text-sable font-inter text-[11px] uppercase font-semibold tracking-wider">
                Description détaillée
              </Text>
              <TextInput
                placeholder="Décrivez le problème, votre solution et les objectifs de la startup..."
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

          {/* Section Statut & Localisation */}
          <View className="gap-4 bg-malt-card border border-malt rounded-3xl p-5">
            <Text className="text-creme font-space text-[15px] font-bold">État d'avancement</Text>
            
            {/* Statut Options Grid */}
            <View className="flex-row gap-2">
              {STATUS_OPTIONS.map(opt => {
                const isSelected = status === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setStatus(opt.id)}
                    disabled={loading}
                    className="flex-1 rounded-xl border p-3 items-center"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255, 190, 11, 0.05)' : '#0D0B05',
                      borderColor: isSelected ? '#FFBE0B' : '#261F12',
                      borderWidth: 1.2
                    }}
                  >
                    <Text className={`font-space text-xs font-bold ${isSelected ? 'text-turmeric' : 'text-creme'}`}>
                      {opt.label}
                    </Text>
                    <Text className="text-sable font-inter text-[8px] text-center mt-0.5">
                      {opt.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Localisation */}
            <View className="gap-1.5 mt-2">
              <Text className="text-sable font-inter text-[11px] uppercase font-semibold tracking-wider">
                Ville / Localisation
              </Text>
              <View className="flex-row items-center border border-malt bg-malt-deep rounded-xl px-4 h-12 gap-2">
                <MapPin size={16} color="#A39171" />
                <TextInput
                  placeholder="Ex: Parakou, Bénin (ou Remote)"
                  placeholderTextColor="#A39171"
                  value={location}
                  onChangeText={setLocation}
                  editable={!loading}
                  className="flex-1 text-creme font-inter text-sm h-full"
                />
              </View>
            </View>
          </View>

          {/* Section Besoins (Roles recherchés) */}
          <View className="gap-4 bg-malt-card border border-malt rounded-3xl p-5">
            <Text className="text-creme font-space text-[15px] font-bold">Rôles recherchés</Text>
            <View className="flex-row flex-wrap gap-2">
              {ROLES_POOL.map(role => {
                const isSelected = selectedRoles.includes(role.id);
                return (
                  <Pressable
                    key={role.id}
                    onPress={() => toggleRole(role.id)}
                    disabled={loading}
                    className="px-3 py-2 rounded-xl border flex-row items-center gap-1.5"
                    style={{
                      backgroundColor: isSelected ? '#F5EDD6' : '#0D0B05',
                      borderColor: isSelected ? '#F5EDD6' : '#261F12',
                      borderWidth: 1.2
                    }}
                  >
                    <Text className={`font-inter text-xs font-medium ${isSelected ? 'text-malt-deep' : 'text-sable'}`}>
                      {role.label}
                    </Text>
                    {isSelected && <Check size={12} color="#0D0B05" strokeWidth={2.5} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section Technologies (Stack) */}
          <View className="gap-4 bg-malt-card border border-malt rounded-3xl p-5">
            <Text className="text-creme font-space text-[15px] font-bold">Stack Technique</Text>
            <View className="flex-row flex-wrap gap-2">
              {TECHS_POOL.map(tech => {
                const isSelected = selectedTechs.includes(tech);
                return (
                  <Pressable
                    key={tech}
                    onPress={() => toggleTech(tech)}
                    disabled={loading}
                    className="px-3 py-2 rounded-xl border flex-row items-center gap-1.5"
                    style={{
                      backgroundColor: isSelected ? '#F5EDD6' : '#0D0B05',
                      borderColor: isSelected ? '#F5EDD6' : '#261F12',
                      borderWidth: 1.2
                    }}
                  >
                    <Text className={`font-inter text-xs font-medium ${isSelected ? 'text-malt-deep' : 'text-sable'}`}>
                      {tech}
                    </Text>
                    {isSelected && <Check size={12} color="#0D0B05" strokeWidth={2.5} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* CTA Validation */}
          <Pressable 
            onPress={handleCreate}
            disabled={loading}
            className="bg-turmeric h-14 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90 mt-2"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0D0B05" />
            ) : (
              <>
                <Sparkles size={18} color="#0D0B05" />
                <Text className="text-malt-deep font-inter-bold text-base font-bold">
                  Publier le Projet
                </Text>
              </>
            )}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
