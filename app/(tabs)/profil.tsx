import React from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { Trophy, Settings, ShieldCheck, Flame, Award } from 'lucide-react-native';

export default function ProfilScreen() {
  const userProfile = {
    name: 'Bienvenu T. (BV)',
    role: 'Founder • Dev Full Stack',
    initials: 'BV',
    reputation: 2450,
    level: 4,
    levelName: 'Innovator',
    nextLevelPts: 50,
    nextLevelName: 'Founder',
    progress: 82, // percentage
    skills: ['React', 'Node.js', 'Supabase', 'MoMo API', 'WhatsApp'],
    completedMissions: [
      { id: '1', title: 'Intégration MoMo', points: 120 },
      { id: '2', title: 'UI Onboarding WapiFood', points: 50 },
    ],
    badges: [
      { id: '1', emoji: '🚀', name: 'First Launch' },
      { id: '2', emoji: '🔥', name: 'On Fire' },
      { id: '3', emoji: '👑', name: 'Founder' },
    ],
  };

  return (
    <View className="flex-1 bg-[#2A2312]">
      <ScrollView className="flex-1 px-4 py-3">
        {/* Profile Header */}
        <View className="items-center py-6 border-b border-[#3D3118]">
          <View className="w-16 h-16 rounded-full bg-[#FFBE0B] items-center justify-center border-4 border-[#3D3118] mb-3">
            <Text className="text-[20px] font-extrabold text-[#2A2312]">
              {userProfile.initials}
            </Text>
          </View>
          <Text className="text-[16px] font-bold text-[#F5EDD6]">{userProfile.name}</Text>
          <Text className="text-[11px] text-[#A89060] mt-0.5">{userProfile.role}</Text>
        </View>

        {/* Reputation Card */}
        <View className="bg-[#3D3118] rounded-2xl p-4 mt-4 border border-[#4A3D1E]">
          <div className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-[16px] font-extrabold text-[#FFBE0B]">
                {userProfile.reputation.toLocaleString()} pts
              </Text>
              <Text className="text-[9px] text-[#A89060] font-bold uppercase tracking-wider mt-0.5">
                🏆 Niveau {userProfile.level} — {userProfile.levelName}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[8px] text-[#A89060]">→ Lvl {userProfile.level + 1} dans</Text>
              <Text className="text-[11px] font-bold text-[#FFBE0B]">{userProfile.nextLevelPts} pts</Text>
            </View>
          </div>

          {/* Progress bar */}
          <View className="h-1.5 bg-[#2A2312] rounded-full overflow-hidden mb-1">
            <View className="h-full bg-[#FFBE0B] rounded-full" style={{ width: `${userProfile.progress}%` }} />
          </View>
        </View>

        {/* Skills Section */}
        <View className="mt-5">
          <Text className="text-[9px] font-bold text-[#A89060] uppercase tracking-widest mb-3">
            Compétences
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {userProfile.skills.map((skill) => (
              <Text
                key={skill}
                className="bg-[#3D3118] border border-[#4A3D1E] text-[#A89060] text-[10px] px-3 py-1 rounded-full font-medium"
              >
                {skill}
              </Text>
            ))}
          </View>
        </View>

        {/* Completed Missions Section */}
        <View className="mt-5">
          <Text className="text-[9px] font-bold text-[#A89060] uppercase tracking-widest mb-3">
            Missions complétées
          </Text>
          <View className="gap-2">
            {userProfile.completedMissions.map((mission) => (
              <View
                key={mission.id}
                className="flex-row justify-between items-center bg-[#1A150A] rounded-xl p-3 border border-[#3D3118]"
              >
                <View className="flex-row items-center gap-2">
                  <ShieldCheck size={14} color="#7CB87A" />
                  <Text className="text-[11px] font-medium text-[#F5EDD6]">{mission.title}</Text>
                </View>
                <Text className="text-[11px] font-bold text-[#7CB87A]">+{mission.points} pts</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Badges Section */}
        <View className="mt-5 mb-8">
          <Text className="text-[9px] font-bold text-[#A89060] uppercase tracking-widest mb-3">
            Badges débloqués
          </Text>
          <View className="flex-row gap-3">
            {userProfile.badges.map((badge) => (
              <View
                key={badge.id}
                className="flex-1 bg-[#3D3118] border border-[#4A3D1E] rounded-xl p-3 items-center justify-center"
              >
                <Text className="text-[18px] mb-1">{badge.emoji}</Text>
                <Text className="text-[8px] font-bold text-[#A89060] text-center" numberOfLines={1}>
                  {badge.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
