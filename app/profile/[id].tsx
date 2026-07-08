import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Award, Layers, Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// Static fallback data
const STATIC_TALENTS: Record<string, any> = {
  '11111111-1111-1111-1111-111111111111': {
    name: 'Inès Lawani',
    username: '@ines_law',
    role: 'UI/UX Designer',
    points: 240,
    skills: ['Figma', 'Prototypage', 'Wireframing', 'Illustrator', 'React Native'],
    initials: 'IL',
    bio: 'Designer passionnée par la création d’interfaces mobiles intuitives et élégantes.',
    stats: { projects: 1, missions: 3 },
    history: [
      { id: '1', title: 'Créer la charte graphique & Logo de l’application WapiFood', reward: 'Collaborateur' }
    ]
  },
  '22222222-2222-2222-2222-222222222222': {
    name: 'Koffi Attignon',
    username: '@koffi_att',
    role: 'Lead Developer',
    points: 380,
    skills: ['React Native', 'TypeScript', 'Node.js', 'Supabase'],
    initials: 'KA',
    bio: 'Développeur passionné de Javascript et de plateformes Cloud.',
    stats: { projects: 2, missions: 4 },
    history: [
      { id: '3', title: 'Intégrer les paiements Mobile Money MTN/Moov sur WapiFood', reward: 'Collaborateur' }
    ]
  }
};

export default function MemberProfileDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [talent, setTalent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTalentDetails();
  }, [id]);

  const fetchTalentDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          project_members(project_id, projects(name))
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error(error);
        setTalent(STATIC_TALENTS[id as string] || STATIC_TALENTS['11111111-1111-1111-1111-111111111111']);
        return;
      }

      const name = data.full_name || 'Talent';
      const initials = name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'T';

      // Format role label
      const roleRaw = data.role || 'developer';
      const roleFormatted = roleRaw === 'product_creator' 
        ? 'Product Owner' 
        : roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);

      // Extract unique projects
      const projectsList = (data.project_members || []).map((m: any) => (m.projects as any)?.name).filter(Boolean);

      // Generate history from projects list or use placeholder
      const historyList = projectsList.map((pName: string, idx: number) => ({
        id: `p-${idx}`,
        title: `A rejoint l’équipe du projet ${pName}`,
        reward: 'Collaborateur'
      }));

      if (historyList.length === 0) {
        historyList.push({
          id: 'h-welcome',
          title: 'A rejoint la communauté PIH Pulse',
          reward: '+20 pts'
        });
      }

      setTalent({
        id: data.id,
        name: name,
        username: data.username ? `@${data.username}` : '@sans_nom',
        role: roleFormatted,
        points: data.reputation_points ?? 20,
        skills: data.skills || [],
        initials: initials,
        bio: data.bio || 'Aucune description disponible.',
        stats: {
          projects: projectsList.length,
          missions: data.reputation_points > 200 ? 3 : 1
        },
        history: historyList
      });

    } catch (err) {
      console.error(err);
      setTalent(STATIC_TALENTS[id as string] || STATIC_TALENTS['11111111-1111-1111-1111-111111111111']);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleContact = () => {
    if (talent?.id) {
      router.push(`/chat/${talent.id}`);
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
        <Text className="text-creme font-space text-base font-bold">Profil Talent</Text>
        <View className="w-9 h-9" />
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & Main details */}
        <View className="items-center mt-4 mb-6">
          <View className="w-24 h-24 rounded-full bg-malt-card border-2 border-malt items-center justify-center mb-4">
            <Text className="text-creme font-space text-3xl font-bold">
              {talent.initials}
            </Text>
          </View>
          <Text className="text-creme font-space text-xl font-bold">
            {talent.name}
          </Text>
          <Text className="text-sable font-inter text-sm mb-1">
            {talent.username}
          </Text>
          <Text className="text-turmeric font-inter-semibold text-xs font-semibold uppercase tracking-wider">
            {talent.role}
          </Text>
        </View>

        {/* Scoreboard / Stats Grid */}
        <View className="flex-row gap-4 mb-6">
          {/* Reputation Score Card */}
          <View className="flex-1 bg-malt-card border border-malt rounded-3xl p-5 justify-between gap-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider">
                Réputation
              </Text>
              <Award size={14} color="#FFBE0B" />
            </View>
            <View>
              <Text className="text-creme font-space text-3xl font-bold mb-1">
                {talent.points}
              </Text>
              <Text className="text-sable font-inter text-xs">
                points totaux
              </Text>
            </View>
          </View>

          {/* Stats Summary Card */}
          <View className="flex-1 bg-malt-card border border-malt rounded-3xl p-5 justify-between gap-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider">
                Activité
              </Text>
              <Layers size={14} color="#A39171" />
            </View>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sable font-inter text-xs">Projets :</Text>
                <Text className="text-creme font-inter-bold text-xs font-bold">{talent.stats.projects}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sable font-inter text-xs">Missions :</Text>
                <Text className="text-creme font-inter-bold text-xs font-bold">{talent.stats.missions}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bio / Bio Detail Card */}
        {talent.bio && (
          <View className="bg-malt-card border border-malt rounded-3xl p-5 gap-3 mb-6">
            <Text className="text-creme font-space text-[15px] font-bold">À propos de moi</Text>
            <Text className="text-sable font-inter text-sm leading-6">
              {talent.bio}
            </Text>
          </View>
        )}

        {/* Skills Tags */}
        {talent.skills.length > 0 && (
          <View className="bg-malt-card border border-malt rounded-3xl p-5 gap-3 mb-6">
            <Text className="text-creme font-space text-[15px] font-bold">Compétences</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {talent.skills.map((skill: string) => (
                <View key={skill} className="bg-malt-deep px-3 py-1.5 rounded-xl border border-malt">
                  <Text className="text-creme font-inter text-xs font-medium">{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Activity Logs */}
        <View className="bg-malt-card border border-malt rounded-3xl p-5 gap-4 mb-6">
          <Text className="text-creme font-space text-[15px] font-bold">Missions Réalisées</Text>
          <View className="gap-4">
            {talent.history.map((act: any) => (
              <View 
                key={act.id}
                className="flex-row justify-between items-center border-b border-malt/30 pb-3 last:border-b-0 last:pb-0"
              >
                <View className="flex-1 pr-4 gap-1">
                  <Text className="text-creme font-inter text-xs font-medium leading-4" numberOfLines={2}>
                    {act.title}
                  </Text>
                </View>
                <Text className="text-turmeric font-inter-semibold text-xs font-semibold">
                  {act.reward}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Contact */}
        <Pressable 
          onPress={handleContact}
          className="bg-turmeric h-14 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90 mt-2"
        >
          <Send size={16} color="#0D0B05" style={{ transform: [{ rotate: '30deg' }] }} />
          <Text className="text-malt-deep font-inter-bold text-base font-bold">
            Contacter par messagerie
          </Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}
