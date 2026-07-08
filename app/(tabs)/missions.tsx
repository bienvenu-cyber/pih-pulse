import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Search, Clock, Award, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import CollapsibleHeader from '../../components/CollapsibleHeader';

// Static fallback data
const STATIC_MISSIONS = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    title: 'Intégrer les paiements Mobile Money (MTN / Moov)',
    project: 'WapiFood',
    reward: '+120 pts',
    duration: '7 jours',
    difficulty: 'hard',
    difficultyLabel: 'Difficile',
    category: 'dev',
  },
  {
    id: 'e2222222-2222-2222-2222-222222222222',
    title: 'Créer la charte graphique & Logo de l’application',
    project: 'WapiFood',
    reward: '+50 pts',
    duration: '4 jours',
    difficulty: 'medium',
    difficultyLabel: 'Moyen',
    category: 'design',
  }
];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'dev', label: 'Développement' },
  { id: 'design', label: 'Design' },
  { id: 'marketing', label: 'Marketing' },
];

export default function MissionsScreen() {
  const router = useRouter();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastOffsetY = useRef(0);

  const handleScroll = (event: any) => {
    const currentOffsetY = event.nativeEvent.contentOffset.y;
    if (currentOffsetY <= 10) {
      setHeaderVisible(true);
      return;
    }
    if (currentOffsetY > lastOffsetY.current + 15) {
      setHeaderVisible(false);
    } else if (currentOffsetY < lastOffsetY.current - 15) {
      setHeaderVisible(true);
    }
    lastOffsetY.current = currentOffsetY;
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*, projects(name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setMissions(STATIC_MISSIONS);
      } else {
        const formatted = data.map((miss: any) => {
          const skills = miss.skills_required || [];
          
          // Categorize dynamically based on tags
          let category = 'dev';
          if (skills.some((s: string) => ['Figma', 'UI Design', 'Branding', 'UX Research'].includes(s))) {
            category = 'design';
          } else if (skills.some((s: string) => ['Copywriting', 'Marketing', 'Communication', 'Français'].includes(s))) {
            category = 'marketing';
          }

          return {
            id: miss.id,
            title: miss.title,
            project: (miss.projects as any)?.name || 'Projet',
            reward: `+${miss.points_reward} pts`,
            duration: '5 jours', // fallback duration
            difficulty: miss.difficulty,
            difficultyLabel: miss.difficulty === 'hard' ? 'Difficile' : miss.difficulty === 'medium' ? 'Moyen' : 'Facile',
            category: category,
          };
        });
        setMissions(formatted);
      }
    } catch (err) {
      console.error(err);
      setMissions(STATIC_MISSIONS);
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = missions.filter(mission => {
    const matchesSearch = mission.title.toLowerCase().includes(search.toLowerCase()) ||
                          mission.project.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || mission.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFBE0B" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <CollapsibleHeader title="Missions" visible={headerVisible} />

      {/* Missions List */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: 76, paddingBottom: 80, gap: 12 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Header bar with Search and Category filters (Now scrolls naturally!) */}
        <View className="gap-3 mb-2">
          <View className="flex-row gap-2">
            <View className="flex-row flex-1 items-center h-12 rounded-xl border px-3 gap-2 bg-malt-card border-malt">
              <Search size={16} color="#A39171" />
              <TextInput
                placeholder="Rechercher une mission..."
                placeholderTextColor="#A39171"
                value={search}
                onChangeText={setSearch}
                className="flex-1 text-creme font-inter text-sm h-full"
              />
            </View>
            <Pressable 
              onPress={() => router.push('/mission/create')}
              className="w-12 h-12 rounded-xl bg-turmeric items-center justify-center active:opacity-90"
            >
              <Plus size={20} color="#0D0B05" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Categories scrollbar */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {CATEGORY_FILTERS.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full border ${
                    isActive ? 'bg-turmeric border-turmeric' : 'bg-malt-card border-malt'
                  }`}
                >
                  <Text 
                    className={`font-inter text-xs font-semibold ${
                      isActive ? 'text-malt-deep' : 'text-sable'
                    }`}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {filteredMissions.length > 0 ? (
          filteredMissions.map(mission => {
            // Difficulty tag coloring
            let difficultyClass = 'text-kaki bg-kaki/15 border-kaki/30';
            if (mission.difficulty === 'medium') {
              difficultyClass = 'text-turmeric bg-turmeric/10 border-turmeric/20';
            } else if (mission.difficulty === 'hard') {
              difficultyClass = 'text-corail bg-corail/15 border-corail/30';
            }

            return (
              <Pressable
                key={mission.id}
                onPress={() => router.push(`/mission/${mission.id}`)}
                style={{ backdropFilter: 'blur(12px)', webkitBackdropFilter: 'blur(12px)' } as any}
                className="flex-row items-center justify-between bg-malt-card/80 border border-malt/60 p-4 rounded-2xl active:opacity-95"
              >
                <View className="flex-1 pr-4 gap-2">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="text-sable font-inter text-[10px] uppercase font-bold tracking-wider">
                      {mission.project}
                    </Text>
                    <View className={`px-2 py-0.5 rounded border ${difficultyClass}`}>
                      <Text className="font-inter text-[9px] font-bold uppercase tracking-wider">
                        {mission.difficultyLabel}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-creme font-space text-[15px] font-bold leading-5">
                    {mission.title}
                  </Text>
                </View>

                {/* Reward and Meta details */}
                <View className="items-end gap-1.5">
                  <Text className="text-turmeric font-inter-semibold text-xs font-semibold">
                    {mission.reward}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Clock size={10} color="#A39171" />
                    <Text className="text-sable font-inter text-[10px]">
                      {mission.duration}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View className="items-center py-12">
            <Text className="text-sable font-inter text-sm">Aucune mission trouvée.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
