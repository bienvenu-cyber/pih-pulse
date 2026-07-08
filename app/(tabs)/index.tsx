import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, MapPin, Clock, Award, Calendar, ChevronRight, Sparkles } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import CollapsibleHeader from '../../components/CollapsibleHeader';

// Static fallback items just in case the connection is interrupted
const FALLBACK_FEED = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    type: 'project',
    tag: 'Nouveau Projet',
    title: 'WapiFood — Application de livraison de repas à Parakou',
    meta1: '3 membres',
    meta2: 'Parakou',
    icon1: Users,
    icon2: MapPin,
    ctaText: 'Voir le projet',
    isFeatured: true,
  },
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    type: 'mission',
    tag: 'Mission Ouverte',
    title: 'Intégrer les paiements Mobile Money (MTN / Moov)',
    meta1: '5 jours',
    meta2: '+120 pts',
    icon1: Clock,
    icon2: Award,
    ctaText: 'Postuler à la mission',
    isFeatured: false,
  }
];

export default function FeedScreen() {
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchFeedData();
  }, []);

  const fetchFeedData = async () => {
    try {
      // 1. Charger les derniers projets
      const { data: dbProjects, error: projError } = await supabase
        .from('projects')
        .select('id, name, short_description, status, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      // 2. Charger les dernières missions ouvertes
      const { data: dbMissions, error: missError } = await supabase
        .from('missions')
        .select('id, title, difficulty, points_reward, created_at, projects(name)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(2);

      if (projError || missError) {
        console.error(projError || missError);
        setFeedItems(FALLBACK_FEED);
        return;
      }

      // Combiner et transformer au format d'affichage du Feed
      const items: any[] = [];

      // Projets
      if (dbProjects && dbProjects.length > 0) {
        dbProjects.forEach((proj, idx) => {
          items.push({
            id: proj.id,
            type: 'project',
            tag: 'Nouveau Projet',
            title: `${proj.name} — ${proj.short_description}`,
            meta1: proj.status.toUpperCase(),
            meta2: 'Parakou',
            icon1: Users,
            icon2: MapPin,
            ctaText: 'Voir le projet',
            isFeatured: idx === 0, // Mettre en avant le tout dernier projet
            created_at: new Date(proj.created_at).getTime(),
          });
        });
      }

      // Missions
      if (dbMissions && dbMissions.length > 0) {
        dbMissions.forEach((miss) => {
          const projName = (miss.projects as any)?.name || 'Projet';
          items.push({
            id: miss.id,
            type: 'mission',
            tag: 'Mission Ouverte',
            title: `${miss.title} (sur ${projName})`,
            meta1: miss.difficulty.toUpperCase(),
            meta2: `+${miss.points_reward} pts`,
            icon1: Clock,
            icon2: Award,
            ctaText: 'Postuler à la mission',
            isFeatured: false,
            created_at: new Date(miss.created_at).getTime(),
          });
        });
      }

      // Ajouter un petit événement statique local pour habiller le Feed
      items.push({
        id: 'evt-1',
        type: 'event',
        tag: 'Événement à venir',
        title: 'Hackathon FinTech Bénin — Parakou Innovation Hub',
        meta1: 'Samedi 15 Juillet 2026',
        icon1: Calendar,
        isFeatured: false,
        created_at: 0
      });

      // Trier les éléments du feed (du plus récent au plus ancien)
      items.sort((a, b) => b.created_at - a.created_at);

      setFeedItems(items);
    } catch (err) {
      console.error(err);
      setFeedItems(FALLBACK_FEED);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: any) => {
    if (item.type === 'project') {
      router.push(`/project/${item.id}`);
    } else if (item.type === 'mission') {
      router.push(`/mission/${item.id}`);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFBE0B" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <CollapsibleHeader title="PIH Pulse" visible={headerVisible} />
      
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 20, paddingTop: 76, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View className="gap-4">
          {feedItems.map((item) => {
            const Icon1 = item.icon1;
            const Icon2 = item.icon2;

            let badgeDotColor = 'bg-turmeric';
            if (item.type === 'mission') badgeDotColor = 'bg-kaki';
            if (item.type === 'event') badgeDotColor = 'bg-corail';

            return (
              <Pressable
                key={item.id}
                onPress={() => handleItemPress(item)}
                style={{ backdropFilter: 'blur(12px)', webkitBackdropFilter: 'blur(12px)' } as any}
                className="bg-malt-card/80 border border-malt/60 rounded-3xl p-5 gap-3 active:opacity-95"
              >
                {/* Badge supérieur */}
                <View className="flex-row items-center gap-2">
                  <View className={`w-1.5 h-1.5 rounded-full ${badgeDotColor}`} />
                  <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider">
                    {item.tag}
                  </Text>
                </View>

                {/* Titre */}
                <Text className="text-creme font-space text-[17px] font-bold leading-6">
                  {item.title}
                </Text>

                {/* Méta-données */}
                <View className="flex-row gap-4 items-center">
                  {Icon1 && (
                    <View className="flex-row items-center gap-1.5">
                      <Icon1 size={13} color="#A39171" strokeWidth={2.5} />
                      <Text className="text-sable font-inter text-xs font-medium">
                        {item.meta1}
                      </Text>
                    </View>
                  )}
                  {Icon2 && (
                    <View className="flex-row items-center gap-1.5">
                      <Icon2 size={13} color={item.type === 'mission' ? '#FFBE0B' : '#A39171'} strokeWidth={2.5} />
                      <Text 
                        className={`font-inter text-xs font-medium ${
                          item.type === 'mission' ? 'text-creme font-semibold' : 'text-sable'
                        }`}
                      >
                        {item.meta2}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bouton d'action */}
                {item.ctaText && (
                  <View 
                    className={`self-start flex-row items-center gap-1.5 px-4 py-2 rounded-full border ${
                      item.isFeatured
                        ? 'bg-turmeric border-turmeric'
                        : 'bg-malt-deep border-malt'
                    }`}
                  >
                    <Text 
                      className={`font-inter-bold text-[11px] font-bold ${
                        item.isFeatured ? 'text-malt-deep' : 'text-creme'
                      }`}
                    >
                      {item.ctaText}
                    </Text>
                    <ChevronRight 
                      size={12} 
                      color={item.isFeatured ? '#0D0B05' : '#F5EDD6'} 
                      strokeWidth={2.5} 
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
