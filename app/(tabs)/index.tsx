import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MapPin, Clock, Calendar, ChevronRight } from 'lucide-react-native';

// Type definition for Feed Item
interface FeedItem {
  id: string;
  type: 'project' | 'mission' | 'event';
  categoryLabel: string;
  title: string;
  meta1: string;
  meta2?: string;
  buttonLabel?: string;
  badgeColor: string;
}

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'projects' | 'missions'>('all');

  const feedItems: FeedItem[] = [
    {
      id: '1',
      type: 'project',
      categoryLabel: '🚀 Nouveau projet',
      title: 'WapiFood — livraison Parakou',
      meta1: '3/5 membres',
      meta2: 'Parakou',
      buttonLabel: 'Voir le projet',
      badgeColor: 'border-l-[#FFBE0B]',
    },
    {
      id: '2',
      type: 'mission',
      categoryLabel: '🎯 Mission',
      title: 'Design logo EduTrack',
      meta1: '3 jours',
      meta2: '🏆 50 pts',
      buttonLabel: 'Postuler',
      badgeColor: 'border-l-[#7CB87A]',
    },
    {
      id: '3',
      type: 'event',
      categoryLabel: '📢 Événement',
      title: 'Hackathon FinTech Bénin',
      meta1: '15 Juillet',
      badgeColor: 'border-l-[#E8634A]',
    },
  ];

  const filteredItems = feedItems.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'projects') return item.type === 'project';
    if (activeTab === 'missions') return item.type === 'mission';
    return true;
  });

  return (
    <View className="flex-1 bg-[#2A2312]">
      <ScrollView className="flex-1 px-4 py-3">
        {/* Horizontal filter tabs */}
        <View className="flex-row gap-2 mb-4">
          <Pressable
            onPress={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full ${activeTab === 'all' ? 'bg-[#FFBE0B]' : 'bg-[#3D3118]'}`}
          >
            <Text className={`text-[11px] font-bold ${activeTab === 'all' ? 'text-[#2A2312]' : 'text-[#A89060]'}`}>
              Tout
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-full ${activeTab === 'projects' ? 'bg-[#FFBE0B]' : 'bg-[#3D3118]'}`}
          >
            <Text className={`text-[11px] font-bold ${activeTab === 'projects' ? 'text-[#2A2312]' : 'text-[#A89060]'}`}>
              Projets
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('missions')}
            className={`px-4 py-2 rounded-full ${activeTab === 'missions' ? 'bg-[#FFBE0B]' : 'bg-[#3D3118]'}`}
          >
            <Text className={`text-[11px] font-bold ${activeTab === 'missions' ? 'text-[#2A2312]' : 'text-[#A89060]'}`}>
              Missions
            </Text>
          </Pressable>
        </View>

        {/* Feed list */}
        <View className="gap-3">
          {filteredItems.map((item) => (
            <View
              key={item.id}
              className={`bg-[#3D3118] rounded-2xl p-4 border-l-4 ${item.badgeColor}`}
            >
              <Text className={`text-[9px] font-extrabold tracking-wider uppercase mb-1 ${
                item.type === 'project' ? 'text-[#FFBE0B]' : item.type === 'mission' ? 'text-[#7CB87A]' : 'text-[#E8634A]'
              }`}>
                {item.categoryLabel}
              </Text>
              
              <Text className="text-[14px] font-bold text-[#F5EDD6] mb-3 leading-snug">
                {item.title}
              </Text>

              <View className="flex-row items-center gap-4 mb-3">
                {item.type === 'project' && (
                  <>
                    <View className="flex-row items-center gap-1">
                      <Users size={12} color="#A89060" />
                      <Text className="text-[10px] text-[#A89060]">{item.meta1}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <MapPin size={12} color="#A89060" />
                      <Text className="text-[10px] text-[#A89060]">{item.meta2}</Text>
                    </View>
                  </>
                )}
                {item.type === 'mission' && (
                  <>
                    <View className="flex-row items-center gap-1">
                      <Clock size={12} color="#A89060" />
                      <Text className="text-[10px] text-[#A89060]">{item.meta1}</Text>
                    </View>
                    <Text className="text-[10px] text-[#A89060]">{item.meta2}</Text>
                  </>
                )}
                {item.type === 'event' && (
                  <View className="flex-row items-center gap-1">
                    <Calendar size={12} color="#A89060" />
                    <Text className="text-[10px] text-[#A89060]">{item.meta1}</Text>
                  </View>
                )}
              </View>

              {item.buttonLabel && (
                <Pressable
                  className={`self-start py-2 px-4 rounded-full flex-row items-center gap-1 ${
                    item.type === 'project' ? 'bg-[#FFBE0B]' : 'bg-transparent border border-[#7CB87A]'
                  }`}
                >
                  <Text className={`text-[10px] font-bold ${
                    item.type === 'project' ? 'text-[#2A2312]' : 'text-[#7CB87A]'
                  }`}>
                    {item.buttonLabel}
                  </Text>
                  <ChevronRight size={10} color={item.type === 'project' ? '#2A2312' : '#7CB87A'} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
