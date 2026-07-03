import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { Clock, Trophy, ChevronRight } from 'lucide-react-native';

interface Mission {
  id: string;
  projectTitle: string;
  title: string;
  type: 'dev' | 'design' | 'analysis' | 'marketing';
  typeLabel: string;
  typeColor: string;
  duration: string;
  points: number;
  status: 'open' | 'in_progress' | 'completed';
  statusLabel: string;
  statusColor: string;
}

export default function MissionsScreen() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'dev' | 'design' | 'analysis' | 'marketing'>('all');

  const missions: Mission[] = [
    {
      id: '1',
      projectTitle: 'WapiFood',
      title: 'Design du logo de la marque',
      type: 'design',
      typeLabel: '🎨 Design',
      typeColor: 'text-[#7CB87A] bg-[#7CB87A]/10',
      duration: '3 jours',
      points: 50,
      status: 'open',
      statusLabel: 'Ouverte',
      statusColor: 'text-[#FFBE0B] bg-[#FFBE0B]/10',
    },
    {
      id: '2',
      projectTitle: 'EduTrack',
      title: "Intégration de l'API de paiement MTN Mobile Money",
      type: 'dev',
      typeLabel: '💻 Développement',
      typeColor: 'text-[#FFBE0B] bg-[#FFBE0B]/10',
      duration: '7 jours',
      points: 120,
      status: 'open',
      statusLabel: 'Ouverte',
      statusColor: 'text-[#FFBE0B] bg-[#FFBE0B]/10',
    },
  ];

  const filteredMissions = missions.filter((mission) => {
    if (activeFilter === 'all') return true;
    return mission.type === activeFilter;
  });

  return (
    <View className="flex-1 bg-[#2A2312]">
      <ScrollView className="flex-1 px-4 py-3">
        {/* Horizontal filter tabs */}
        <View className="flex-row gap-1.5 mb-4 overflow-x-scroll">
          {(['all', 'dev', 'design', 'analysis', 'marketing'] as const).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-full ${activeFilter === filter ? 'bg-[#FFBE0B]' : 'bg-[#3D3118]'}`}
            >
              <Text className={`text-[10px] font-bold capitalize ${activeFilter === filter ? 'text-[#2A2312]' : 'text-[#A89060]'}`}>
                {filter === 'all' ? 'Toutes' : filter === 'dev' ? 'Dev' : filter === 'design' ? 'Design' : filter === 'analysis' ? 'Analyse' : 'Marketing'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Missions list */}
        <View className="gap-3 mb-6">
          {filteredMissions.map((mission) => (
            <View key={mission.id} className="bg-[#3D3118] rounded-2xl p-4 border border-[#4A3D1E]">
              {/* Associated project name */}
              <Text className="text-[9px] font-bold text-[#A89060] uppercase tracking-widest mb-1">
                PROJET : {mission.projectTitle}
              </Text>

              {/* Title */}
              <Text className="text-[14px] font-bold text-[#F5EDD6] mb-3 leading-snug">
                {mission.title}
              </Text>

              {/* Badges: Type & Status */}
              <div className="flex-row gap-2 mb-4">
                <Text className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${mission.typeColor}`}>
                  {mission.typeLabel}
                </Text>
                <Text className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${mission.statusColor}`}>
                  ● {mission.statusLabel}
                </Text>
              </div>

              {/* Stats & Actions */}
              <div className="flex-row justify-between items-center pt-3 border-t border-[#2A2312]">
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1">
                    <Clock size={11} color="#A89060" />
                    <Text className="text-[10px] text-[#A89060]">{mission.duration}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Trophy size={11} color="#FFBE0B" />
                    <Text className="text-[10px] font-bold text-[#FFBE0B]">🏆 {mission.points} pts</Text>
                  </View>
                </View>

                <Pressable className="flex-row items-center gap-1 bg-[#7CB87A]/10 border border-[#7CB87A] py-1 px-3 rounded-full">
                  <Text className="text-[10px] font-bold text-[#7CB87A]">Postuler</Text>
                  <ChevronRight size={10} color="#7CB87A" />
                </Pressable>
              </div>
            </View>
          ))}

          {filteredMissions.length === 0 && (
            <View className="py-8 items-center justify-center">
              <Text className="text-[11px] text-[#A89060] text-center">Aucune mission trouvée</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
