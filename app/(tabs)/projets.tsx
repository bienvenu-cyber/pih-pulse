import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, TextInput } from 'react-native';
import { Search, Users, Trophy } from 'lucide-react-native';

interface Project {
  id: string;
  title: string;
  status: 'idea' | 'prototype' | 'mvp' | 'launched';
  statusLabel: string;
  statusColor: string;
  description: string;
  techStack: string[];
  membersCount: number;
  maxMembers: number;
  progress: number; // percentage
  points: number;
}

export default function ProjetsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'idea' | 'prototype' | 'mvp'>('all');

  const projects: Project[] = [
    {
      id: '1',
      title: 'WapiFood',
      status: 'prototype',
      statusLabel: '🟡 Prototype',
      statusColor: 'bg-[#FFBE0B]/10 text-[#FFBE0B]',
      description: 'App de livraison de repas à Parakou avec paiement par Mobile Money.',
      techStack: ['React Native', 'Node.js', 'Supabase'],
      membersCount: 3,
      maxMembers: 5,
      progress: 60,
      points: 200,
    },
    {
      id: '2',
      title: 'EduTrack',
      status: 'idea',
      statusLabel: '💡 Idée',
      statusColor: 'bg-[#A89060]/20 text-[#A89060]',
      description: 'Système de suivi scolaire en temps réel pour parents et élèves.',
      techStack: ['Flutter', 'Firebase'],
      membersCount: 1,
      maxMembers: 4,
      progress: 15,
      points: 150,
    },
  ];

  const filteredProjects = projects.filter((project) => {
    // Search filter
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          project.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    if (activeFilter === 'all') return matchesSearch;
    return project.status === activeFilter && matchesSearch;
  });

  return (
    <View className="flex-1 bg-[#2A2312]">
      <ScrollView className="flex-1 px-4 py-3">
        {/* Search bar */}
        <View className="flex-row items-center bg-[#3D3118] rounded-xl px-3 py-2.5 mb-4 border border-[#4A3D1E]">
          <Search size={16} color="#A89060" className="mr-2" />
          <TextInput
            placeholder="Rechercher un projet..."
            placeholderTextColor="#A89060"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-[12px] text-[#F5EDD6] p-0"
          />
        </View>

        {/* Filter status buttons */}
        <View className="flex-row gap-1.5 mb-4 overflow-x-scroll">
          {(['all', 'idea', 'prototype', 'mvp'] as const).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-full ${activeFilter === filter ? 'bg-[#FFBE0B]' : 'bg-[#3D3118]'}`}
            >
              <Text className={`text-[10px] font-bold capitalize ${activeFilter === filter ? 'text-[#2A2312]' : 'text-[#A89060]'}`}>
                {filter === 'all' ? 'Tous' : filter === 'idea' ? 'Idées' : filter === 'prototype' ? 'Prototypes' : 'MVPs'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Projects list */}
        <View className="gap-3 mb-6">
          {filteredProjects.map((project) => (
            <View key={project.id} className="bg-[#3D3118] rounded-2xl p-4 border border-[#4A3D1E]">
              {/* Header: Status & Points */}
              <div className="flex-row justify-between items-center mb-2">
                <Text className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${project.statusColor}`}>
                  {project.statusLabel}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Trophy size={11} color="#FFBE0B" />
                  <Text className="text-[10px] font-bold text-[#FFBE0B]">+{project.points} pts</Text>
                </View>
              </div>

              {/* Title & Description */}
              <Text className="text-[15px] font-bold text-[#F5EDD6] mb-1">{project.title}</Text>
              <Text className="text-[11px] text-[#A89060] mb-3 leading-relaxed">{project.description}</Text>

              {/* Tech Stack Tags */}
              <View className="flex-row flex-wrap gap-1 mb-4">
                {project.techStack.map((tech) => (
                  <Text key={tech} className="bg-[#2A2312] border border-[#3D3118] text-[#A89060] text-[9px] px-2 py-0.5 rounded-md font-medium">
                    {tech}
                  </Text>
                ))}
              </View>

              {/* Progress bar */}
              <View className="mb-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-[9px] font-bold text-[#A89060] uppercase tracking-wider">Progression</Text>
                  <Text className="text-[10px] font-bold text-[#FFBE0B]">{project.progress}%</Text>
                </View>
                <View className="h-1.5 bg-[#2A2312] rounded-full overflow-hidden">
                  <View className="h-full bg-[#FFBE0B] rounded-full" style={{ width: `${project.progress}%` }} />
                </View>
              </View>

              {/* Team Info & CTA */}
              <div className="flex-row justify-between items-center pt-2 border-t border-[#2A2312]">
                <View className="flex-row items-center gap-1">
                  <Users size={12} color="#A89060" />
                  <Text className="text-[10px] text-[#A89060]">
                    {project.membersCount}/{project.maxMembers} membres
                  </Text>
                </View>
                
                <Pressable className="bg-[#FFBE0B] py-1.5 px-3 rounded-full">
                  <Text className="text-[10px] font-bold text-[#2A2312]">Rejoindre</Text>
                </Pressable>
              </div>
            </View>
          ))}

          {filteredProjects.length === 0 && (
            <View className="py-8 items-center justify-center">
              <Text className="text-[11px] text-[#A89060] text-center">Aucun projet trouvé</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
