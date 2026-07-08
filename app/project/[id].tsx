import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Users, MapPin, ExternalLink, ShieldCheck, Target, CheckCircle, AlertTriangle, Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// Static fallback data
const FALLBACK_PROJECT = {
  name: 'WapiFood',
  creator: 'Koffi Attignon',
  creatorRole: 'Lead Dev',
  shortDescription: 'Application de livraison de repas locaux par Mobile Money.',
  description: 'WapiFood est une plateforme de livraison ultra-rapide qui permet aux habitants de Parakou de commander leurs repas préférés dans les restaurants locaux et de payer directement par MTN Mobile Money ou Moov Money.',
  membersCount: '3 membres',
  location: 'Parakou',
  statusLabel: 'MVP',
  skills: ['React Native', 'Supabase', 'UI Design', 'API REST'],
  team: [
    { name: 'Koffi Attignon', role: 'Lead Developer', initials: 'KA', id: '22222222-2222-2222-2222-222222222222' },
    { name: 'Inès Lawani', role: 'UI/UX Designer', initials: 'IL', id: '11111111-1111-1111-1111-111111111111' },
    { name: 'Sena Ousmane', role: 'Product Owner', initials: 'SO', id: '33333333-3333-3333-3333-333333333333' },
  ],
  missions: [
    { id: 'd1111111-1111-1111-1111-111111111111', title: 'Intégrer les paiements Mobile Money (MTN / Moov)', reward: '+120 pts', status: 'open' }
  ]
};

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);

  // Custom premium modal alerts
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('success');

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      // Get current user id
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMeId(user.id);
      }

      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          short_description,
          description,
          status,
          skills_needed,
          creator:profiles!creator_id(id, full_name, role),
          project_members(role, profiles(id, full_name, role)),
          missions(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error(error);
        setProject(FALLBACK_PROJECT);
        return;
      }

      // Format team members
      const teamFormatted = (data.project_members || []).map((m: any) => {
        const memberProfile = m.profiles || {};
        const memberName = memberProfile.full_name || 'Collaborateur';
        const memberInitials = memberName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'C';

        return {
          id: memberProfile.id,
          name: memberName,
          role: m.role || memberProfile.role || 'Contributeur',
          initials: memberInitials
        };
      });

      // Format missions
      const missionsFormatted = (data.missions || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        reward: `+${m.points_reward} pts`,
        status: m.status
      }));

      // Format full project details
      setProject({
        id: data.id,
        name: data.name,
        creator: data.creator?.full_name || 'Inconnu',
        creatorRole: data.creator?.role === 'product_creator' ? 'Product Owner' : 'Développeur',
        shortDescription: data.short_description,
        description: data.description || data.short_description,
        statusLabel: data.status === 'mvp' ? 'MVP' : data.status === 'prototype' ? 'Prototype' : 'Idée',
        membersCount: `${teamFormatted.length || 1} membre${teamFormatted.length > 1 ? 's' : ''}`,
        location: 'Parakou',
        skills: data.skills_needed || [],
        team: teamFormatted,
        missions: missionsFormatted
      });

    } catch (err) {
      console.error(err);
      setProject(FALLBACK_PROJECT);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleMissionPress = (missionId: string) => {
    router.push(`/mission/${missionId}`);
  };

  const handleJoinProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showModal("Connexion Requise", "Veuillez vous connecter pour rejoindre ce projet.", "info");
        return;
      }

      // Check if already in team
      const isAlreadyMember = project?.team?.some((m: any) => m.id === user.id);
      if (isAlreadyMember) {
        showModal("Déjà membre", "Vous collaborez déjà sur ce projet !", "info");
        return;
      }

      setJoining(true);

      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: id,
          user_id: user.id,
          role: 'Collaborateur'
        });

      if (error) {
        showModal("Une erreur est survenue", error.message, "error");
      } else {
        // Log reputation points (+50 points)
        await supabase
          .from('reputation_logs')
          .insert({
            user_id: user.id,
            points: 50,
            reason: `A rejoint le projet : ${project.name}`
          });

        showModal(
          "Félicitations !", 
          "Vous avez rejoint l'équipe du projet avec succès. Votre réputation augmente de +50 pts !", 
          "success"
        );
        fetchProjectDetails(); // Refresh members list
      }
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
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
        <Pressable onPress={handleBack} className="w-9 h-9 rounded-full bg-malt-card border border-malt items-center justify-center">
          <ArrowLeft size={18} color="#F5EDD6" />
        </Pressable>
        <Text className="text-creme font-space text-base font-bold">Fiche Projet</Text>
        <View className="w-9 h-9" />
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Project Header Info */}
        <View className="gap-3 mb-6">
          <View className="flex-row justify-between items-start">
            <Text className="text-creme font-space text-2xl font-bold max-w-[70%]">
              {project.name}
            </Text>
            <View className="bg-sable/10 px-3 py-1 rounded-xl border border-malt">
              <Text className="text-sable font-inter text-xs font-bold uppercase tracking-wider">
                {project.statusLabel}
              </Text>
            </View>
          </View>

          <Text className="text-sable font-inter text-sm leading-5">
            Créé par {project.creator} ({project.creatorRole})
          </Text>

          <View className="flex-row gap-4 items-center mt-1">
            <View className="flex-row items-center gap-1">
              <Users size={14} color="#A39171" />
              <Text className="text-sable font-inter text-xs font-medium">{project.membersCount}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <MapPin size={14} color="#A39171" />
              <Text className="text-sable font-inter text-xs font-medium">{project.location}</Text>
            </View>
          </View>
        </View>

        {/* Project Description */}
        <View className="bg-malt-card border border-malt rounded-3xl p-5 gap-3 mb-6">
          <Text className="text-creme font-space text-[15px] font-bold">À propos du projet</Text>
          <Text className="text-sable font-inter text-sm leading-6">
            {project.description}
          </Text>
        </View>

        {/* Tech Stack Badges */}
        <View className="bg-malt-card border border-malt rounded-3xl p-5 gap-3 mb-6">
          <Text className="text-creme font-space text-[15px] font-bold">Stack Technique</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {project.skills.map((skill: string) => (
              <View key={skill} className="bg-malt-deep px-3 py-1.5 rounded-xl border border-malt">
                <Text className="text-creme font-inter text-xs font-medium">{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* L'Équipe */}
        <View className="bg-malt-card border border-malt rounded-3xl p-5 gap-4 mb-6">
          <Text className="text-creme font-space text-[15px] font-bold">L'Équipe ({project.team.length})</Text>
          <View className="gap-3">
            {project.team.map((member: any, index: number) => (
              <Pressable 
                key={index} 
                onPress={() => router.push(`/profile/${member.id}`)}
                className="flex-row items-center gap-3 active:opacity-80"
              >
                <View className="w-10 h-10 rounded-full bg-malt-deep border border-malt items-center justify-center">
                  <Text className="text-creme font-space text-xs font-bold">{member.initials}</Text>
                </View>
                <View>
                  <Text className="text-creme font-space text-sm font-bold">{member.name}</Text>
                  <Text className="text-sable font-inter text-[11px]">{member.role}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Missions du projet */}
        {project.missions.length > 0 && (
          <View className="bg-malt-card border border-malt rounded-3xl p-5 gap-4 mb-6">
            <Text className="text-creme font-space text-[15px] font-bold">Missions en cours</Text>
            <View className="gap-3">
              {project.missions.map((mission: any) => (
                <Pressable 
                  key={mission.id}
                  onPress={() => handleMissionPress(mission.id)}
                  className="flex-row justify-between items-center bg-malt-deep border border-malt p-4 rounded-2xl active:opacity-95"
                >
                  <View className="flex-1 pr-4 gap-1">
                    <Text className="text-creme font-inter text-xs font-semibold leading-5" numberOfLines={1}>
                      {mission.title}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <Target size={11} color="#A39171" />
                      <Text className="text-sable font-inter text-[10px] uppercase font-bold">
                        {mission.status === 'open' ? 'Ouverte' : 'En cours'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-turmeric font-inter-semibold text-xs font-semibold">
                    {mission.reward}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* CTA Rejoindre */}
        {project?.team?.some((m: any) => m.id === meId) ? (
          <View className="flex-row gap-2 mt-2">
            <View className="flex-1 bg-kaki/15 border border-kaki/30 h-14 rounded-2xl flex-row justify-center items-center gap-2">
              <ShieldCheck size={18} color="#7CB87A" strokeWidth={2.5} />
              <Text className="text-kaki font-inter-bold text-sm font-bold">
                Membre de l'équipe
              </Text>
            </View>
            <Pressable 
              onPress={() => router.push(`/chat/project-${project.id}`)}
              className="bg-turmeric px-5 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90 h-14"
            >
              <Send size={16} color="#0D0B05" style={{ transform: [{ rotate: '30deg' }] }} />
              <Text className="text-malt-deep font-inter-bold text-sm font-bold">
                Chat
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable 
            onPress={handleJoinProject}
            disabled={joining}
            className="bg-turmeric h-14 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90 mt-2"
          >
            {joining ? (
              <ActivityIndicator size="small" color="#0D0B05" />
            ) : (
              <>
                <ShieldCheck size={18} color="#0D0B05" strokeWidth={2.5} />
                <Text className="text-malt-deep font-inter-bold text-base font-bold">
                  Rejoindre ce projet
                </Text>
              </>
            )}
          </Pressable>
        )}

      </ScrollView>

      {/* Custom Alert Modal */}
      {modalVisible && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center z-50 px-6">
          <View className="bg-malt-card border border-malt p-6 rounded-3xl w-full max-w-sm gap-4 items-center">
            {modalType === 'success' ? (
              <View className="w-12 h-12 rounded-full bg-kaki/15 border border-kaki/30 items-center justify-center">
                <CheckCircle size={24} color="#7CB87A" />
              </View>
            ) : (
              <View className="w-12 h-12 rounded-full bg-turmeric/10 border border-turmeric/30 items-center justify-center">
                <AlertTriangle size={24} color="#FFBE0B" />
              </View>
            )}
            
            <View className="items-center gap-1.5 w-full">
              <Text className="text-creme font-space text-lg font-bold text-center">{modalTitle}</Text>
              <Text className="text-sable font-inter text-xs text-center leading-5">{modalMessage}</Text>
            </View>
            
            <Pressable 
              onPress={() => setModalVisible(false)}
              className="bg-turmeric w-full py-3 rounded-xl items-center justify-center active:opacity-90 mt-2"
            >
              <Text className="text-malt-deep font-inter-bold text-sm font-bold">Compris</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
