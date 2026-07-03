import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, TextInput } from 'react-native';
import { Search, Trophy, Rocket, MessageSquare } from 'lucide-react-native';

interface Member {
  id: string;
  name: string;
  initials: string;
  role: string;
  skills: string[];
  reputation: number;
  projectsCount: number;
}

export default function EquipesScreen() {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'my_teams'>('members');
  const [searchQuery, setSearchQuery] = useState('');

  const members: Member[] = [
    {
      id: '1',
      name: 'Koffi A.',
      initials: 'KA',
      role: 'Dev Full Stack',
      skills: ['React', 'Node.js', 'SQL'],
      reputation: 1240,
      projectsCount: 5,
    },
    {
      id: '2',
      name: 'Inès M.',
      initials: 'IM',
      role: 'UI/UX Designer',
      skills: ['Figma', 'Illustrator', 'Mobile UI'],
      reputation: 780,
      projectsCount: 3,
    },
  ];

  const filteredMembers = members.filter((member) => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View className="flex-1 bg-[#2A2312]">
      <ScrollView className="flex-1 px-4 py-3">
        {/* Toggle members / my teams */}
        <View className="flex-row bg-[#1A150A] rounded-xl p-1 mb-4 border border-[#3D3118]">
          <Pressable
            onPress={() => setActiveSubTab('members')}
            className={`flex-1 py-2 rounded-lg items-center ${activeSubTab === 'members' ? 'bg-[#3D3118]' : ''}`}
          >
            <Text className={`text-[11px] font-bold ${activeSubTab === 'members' ? 'text-[#FFBE0B]' : 'text-[#A89060]'}`}>
              Membres
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSubTab('my_teams')}
            className={`flex-1 py-2 rounded-lg items-center ${activeSubTab === 'my_teams' ? 'bg-[#3D3118]' : ''}`}
          >
            <Text className={`text-[11px] font-bold ${activeSubTab === 'my_teams' ? 'text-[#FFBE0B]' : 'text-[#A89060]'}`}>
              Mes Équipes
            </Text>
          </Pressable>
        </View>

        {activeSubTab === 'members' ? (
          <>
            {/* Search members */}
            <View className="flex-row items-center bg-[#3D3118] rounded-xl px-3 py-2.5 mb-4 border border-[#4A3D1E]">
              <Search size={16} color="#A89060" className="mr-2" />
              <TextInput
                placeholder="Rechercher un talent (compétence, nom)..."
                placeholderTextColor="#A89060"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 text-[12px] text-[#F5EDD6] p-0"
              />
            </View>

            {/* Members list */}
            <View className="gap-3 mb-6">
              {filteredMembers.map((member) => (
                <View key={member.id} className="bg-[#3D3118] rounded-2xl p-4 border border-[#4A3D1E] flex-row items-center gap-3">
                  {/* Avatar */}
                  <View className="w-12 h-12 rounded-full bg-[#FFBE0B] items-center justify-center border-2 border-[#2A2312]">
                    <Text className="text-[14px] font-extrabold text-[#2A2312]">{member.initials}</Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold text-[#F5EDD6]">{member.name}</Text>
                    <Text className="text-[10px] text-[#A89060] mb-2">{member.role}</Text>
                    
                    {/* Skills tags */}
                    <View className="flex-row flex-wrap gap-1">
                      {member.skills.map((skill) => (
                        <Text key={skill} className="bg-[#2A2312] border border-[#3D3118] text-[#A89060] text-[8px] px-1.5 py-0.5 rounded-md font-medium">
                          {skill}
                        </Text>
                      ))}
                    </View>
                  </View>

                  {/* Stats & Actions */}
                  <View className="items-end gap-1.5">
                    <View className="flex-row items-center gap-1">
                      <Trophy size={11} color="#FFBE0B" />
                      <Text className="text-[10px] font-bold text-[#FFBE0B]">{member.reputation.toLocaleString()} pts</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Rocket size={11} color="#A89060" />
                      <Text className="text-[9px] text-[#A89060]">{member.projectsCount} Projets</Text>
                    </View>
                  </View>
                </View>
              ))}

              {filteredMembers.length === 0 && (
                <View className="py-8 items-center justify-center">
                  <Text className="text-[11px] text-[#A89060] text-center">Aucun talent trouvé</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          /* My teams view (placeholder for now) */
          <View className="bg-[#3D3118] rounded-2xl p-6 border border-[#4A3D1E] items-center justify-center py-12">
            <Rocket size={32} color="#A89060" className="mb-2" />
            <Text className="text-[13px] font-bold text-[#F5EDD6] mb-1">Rejoins ton premier projet !</Text>
            <Text className="text-[11px] text-[#A89060] text-center mb-4 leading-normal max-w-[200px]">
              Tu ne fais partie d'aucune équipe pour le moment. Va explorer les projets actifs et propose ta candidature !
            </Text>
            <Pressable className="bg-[#FFBE0B] py-2 px-4 rounded-full">
              <Text className="text-[10px] font-bold text-[#2A2312]">Découvrir les projets</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
