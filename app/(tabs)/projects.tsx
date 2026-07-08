import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Search, Users, MapPin, ExternalLink, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import CollapsibleHeader from '../../components/CollapsibleHeader';

// Static fallback data
const STATIC_PROJECTS = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    name: 'WapiFood',
    creator: 'Koffi Attignon',
    shortDescription: 'Application de livraison de repas locaux par Mobile Money.',
    members: '3 membres',
    location: 'Parakou',
    status: 'mvp',
    statusLabel: 'MVP',
    skills: ['React Native', 'Supabase', 'UI Design'],
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    name: 'AgriTrack',
    creator: 'Inès Lawani',
    shortDescription: 'Plateforme IoT et mobile de suivi des récoltes et des stocks.',
    members: '1 membre',
    location: 'Parakou',
    status: 'idea',
    statusLabel: 'Idée',
    skills: ['Python', 'IoT', 'TypeScript'],
  }
];

const STATUS_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'mvp', label: 'MVP' },
  { id: 'prototype', label: 'Prototype' },
  { id: 'idea', label: 'Idée' },
];

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastOffsetY = useRef(0);
  const router = useRouter();

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
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          short_description,
          status,
          skills_needed,
          creator:profiles(full_name),
          project_members(user_id)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setProjects(STATIC_PROJECTS);
      } else {
        const formatted = data.map((proj: any) => ({
          id: proj.id,
          name: proj.name,
          creator: proj.creator?.full_name || 'Inconnu',
          shortDescription: proj.short_description,
          members: `${proj.project_members?.length || 1} membre${(proj.project_members?.length || 1) > 1 ? 's' : ''}`,
          location: 'Parakou',
          status: proj.status,
          statusLabel: proj.status === 'mvp' ? 'MVP' : proj.status === 'prototype' ? 'Prototype' : 'Idée',
          skills: proj.skills_needed || [],
        }));
        setProjects(formatted);
      }
    } catch (err) {
      console.error(err);
      setProjects(STATIC_PROJECTS);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) || 
                          project.shortDescription.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'all' || project.status === activeFilter;
    return matchesSearch && matchesFilter;
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
      <CollapsibleHeader title="Projets" visible={headerVisible} />

      {/* Projects List */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: 76, paddingBottom: 80, gap: 16 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Search Header (Now scrolls naturally!) */}
        <View className="gap-3 mb-2">
          <View className="flex-row gap-2">
            <View className="flex-row flex-1 items-center h-12 rounded-xl border px-3 gap-2 bg-malt-card border-malt">
              <Search size={16} color="#A39171" />
              <TextInput
                placeholder="Rechercher un projet..."
                placeholderTextColor="#A39171"
                value={search}
                onChangeText={setSearch}
                className="flex-1 text-creme font-inter text-sm h-full"
              />
            </View>
            <Pressable 
              onPress={() => router.push('/project/create')}
              className="w-12 h-12 rounded-xl bg-turmeric items-center justify-center active:opacity-90"
            >
              <Plus size={20} color="#0D0B05" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Horizontal Status Filters */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {STATUS_FILTERS.map(filter => {
              const isActive = activeFilter === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => setActiveFilter(filter.id)}
                  className={`px-4 py-2 rounded-full border ${
                    isActive ? 'bg-turmeric border-turmeric' : 'bg-malt-card border-malt'
                  }`}
                >
                  <Text 
                    className={`font-inter text-xs font-semibold ${
                      isActive ? 'text-malt-deep' : 'text-sable'
                    }`}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {filteredProjects.length > 0 ? (
          filteredProjects.map(project => (
            <Pressable 
              key={project.id}
              onPress={() => router.push(`/project/${project.id}`)}
              style={{ backdropFilter: 'blur(12px)', webkitBackdropFilter: 'blur(12px)' } as any}
              className="bg-malt-card/80 border border-malt/60 rounded-3xl p-5 gap-3 active:opacity-95"
            >
              {/* Header card info */}
              <View className="flex-row justify-between items-center">
                <Text className="text-creme font-space text-lg font-bold">
                  {project.name}
                </Text>
                <View className="bg-sable/10 px-2.5 py-1 rounded-lg border border-malt">
                  <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider">
                    {project.statusLabel}
                  </Text>
                </View>
              </View>

              {/* Creator details */}
              <Text className="text-sable font-inter text-xs">
                Créé par {project.creator}
              </Text>

              {/* Description */}
              <Text className="text-creme font-inter text-sm leading-5">
                {project.shortDescription}
              </Text>

              {/* Tech stack badges */}
              <View className="flex-row flex-wrap gap-1.5 mt-1">
                {project.skills.map((skill: string) => (
                  <View 
                    key={skill} 
                    className="bg-malt-deep px-2.5 py-1 rounded-lg border border-malt"
                  >
                    <Text className="text-sable font-inter text-[10px] font-medium">
                      {skill}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Divider */}
              <View className="h-[1px] bg-malt/50 my-1" />

              {/* Footer Meta & Action */}
              <View className="flex-row justify-between items-center">
                <View className="flex-row gap-4">
                  <View className="flex-row items-center gap-1">
                    <Users size={12} color="#A39171" />
                    <Text className="text-sable font-inter text-xs">{project.members}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <MapPin size={12} color="#A39171" />
                    <Text className="text-sable font-inter text-xs">{project.location}</Text>
                  </View>
                </View>

                {/* Primary Action is Yellow ONLY if MVP/Active recruitment, otherwise standard */}
                <View 
                  className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${
                    project.status === 'mvp' ? 'bg-turmeric border-turmeric' : 'bg-malt-deep border-malt'
                  }`}
                >
                  <Text 
                    className={`font-inter text-[10px] font-bold ${
                      project.status === 'mvp' ? 'text-malt-deep' : 'text-creme'
                    }`}
                  >
                    Détails
                  </Text>
                  <ExternalLink size={10} color={project.status === 'mvp' ? '#0D0B05' : '#F5EDD6'} />
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <View className="items-center py-12">
            <Text className="text-sable font-inter text-sm">Aucun projet trouvé.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
