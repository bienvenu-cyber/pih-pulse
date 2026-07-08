import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Search, Award, Send } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import CollapsibleHeader from '../../components/CollapsibleHeader';

// Static fallback data
const STATIC_TALENTS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Inès Lawani',
    role: 'UI/UX Designer',
    points: 240,
    skills: ['Figma', 'Prototypage', 'Wireframing', 'Illustrator'],
    initials: 'IL',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Koffi Attignon',
    role: 'Fullstack Developer',
    points: 380,
    skills: ['React Native', 'TypeScript', 'Node.js', 'Supabase'],
    initials: 'KA',
  }
];

export default function TeamsScreen() {
  const router = useRouter();
  const [talents, setTalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchTalents();
  }, []);

  const fetchTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('reputation_points', { ascending: false });

      if (error) {
        console.error(error);
        setTalents(STATIC_TALENTS);
      } else {
        const formatted = data.map((prof: any) => {
          const name = prof.full_name || 'Talent';
          const initials = name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'T';

          // Format role label cleanly
          const roleRaw = prof.role || 'developer';
          const roleFormatted = roleRaw === 'product_creator' 
            ? 'Product Owner' 
            : roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);

          return {
            id: prof.id,
            name: name,
            role: roleFormatted,
            points: prof.reputation_points ?? 0,
            skills: prof.skills || [],
            initials: initials,
          };
        });
        setTalents(formatted);
      }
    } catch (err) {
      console.error(err);
      setTalents(STATIC_TALENTS);
    } finally {
      setLoading(false);
    }
  };

  const filteredTalents = talents.filter(talent => {
    return talent.name.toLowerCase().includes(search.toLowerCase()) ||
           talent.role.toLowerCase().includes(search.toLowerCase()) ||
           talent.skills.some((skill: string) => skill.toLowerCase().includes(search.toLowerCase()));
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
      <CollapsibleHeader title="Équipes" visible={headerVisible} />

      {/* Talents List */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: 76, paddingBottom: 80, gap: 16 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Search Header (Now scrolls naturally!) */}
        <View className="gap-3 mb-2">
          <View className="flex-row items-center h-12 rounded-xl border px-3 gap-2 bg-malt-card border-malt">
            <Search size={16} color="#A39171" />
            <TextInput
              placeholder="Rechercher un talent ou une compétence..."
              placeholderTextColor="#A39171"
              value={search}
              onChangeText={setSearch}
              className="flex-1 text-creme font-inter text-sm h-full"
            />
          </View>
        </View>
        {filteredTalents.length > 0 ? (
          filteredTalents.map(talent => (
            <Pressable 
              key={talent.id}
              onPress={() => router.push(`/profile/${talent.id}`)}
              style={{ backdropFilter: 'blur(12px)', webkitBackdropFilter: 'blur(12px)' } as any}
              className="bg-malt-card/80 border border-malt/60 rounded-3xl p-5 gap-4 active:opacity-95"
            >
              {/* Profile Card Header */}
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                  {/* Initials Avatar */}
                  <View className="w-12 h-12 rounded-full bg-malt-deep border border-malt items-center justify-center">
                    <Text className="text-creme font-space text-sm font-bold">
                      {talent.initials}
                    </Text>
                  </View>
                  
                  {/* User info */}
                  <View>
                    <Text className="text-creme font-space text-[15px] font-bold">
                      {talent.name}
                    </Text>
                    <Text className="text-sable font-inter text-xs">
                      {talent.role}
                    </Text>
                  </View>
                </View>

                {/* Score */}
                <View className="flex-row items-center gap-1">
                  <Award size={12} color="#FFBE0B" />
                  <Text className="text-creme font-inter text-xs font-semibold">
                    {talent.points} pts
                  </Text>
                </View>
              </View>

              {/* Skills Tags */}
              <View className="flex-row flex-wrap gap-1.5">
                {talent.skills.map((skill: string) => (
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
              <View className="h-[1px] bg-malt/50" />

              {/* Actions Footer */}
              <View className="flex-row justify-between items-center">
                <Text className="text-sable font-inter text-[10px]">
                  Disponible pour projets
                </Text>
                
                {/* CTA Action */}
                <View 
                  className="bg-malt-deep border border-malt flex-row items-center gap-1.5 px-4 py-2 rounded-full"
                >
                  <Text className="text-creme font-inter-bold text-[10px] font-bold">
                    Contacter
                  </Text>
                  <Send size={10} color="#F5EDD6" style={{ transform: [{ rotate: '30deg' }] }} />
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <View className="items-center py-12">
            <Text className="text-sable font-inter text-sm">Aucun talent trouvé.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
