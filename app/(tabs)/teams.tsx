import { useRouter } from 'expo-router';
import { Award, Search, Send, Users } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import CollapsibleHeader, {
  useCollapsibleHeaderOffset,
  useTabListBottomPadding,
} from '../../components/CollapsibleHeader';
import EmptyState from '../../components/ui/EmptyState';
import ListSkeleton from '../../components/ui/ListSkeleton';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatLevelBadge, getLevelProgress } from '../../lib/reputation';
import { supabase } from '../../lib/supabase';

export default function TeamsScreen() {
  const router = useRouter();
  const [talents, setTalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [headerVisible, setHeaderVisible] = useState(true);
  const { colors } = useThemeFlavor();
  const headerOffset = useCollapsibleHeaderOffset();
  const listBottom = useTabListBottomPadding();
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

  const fetchTalents = async (mode: 'init' | 'refresh' = 'init') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      // available_for_missions optionnel (migration prefs) — fallback soft
      let data: any[] | null = null;
      let error: { message?: string } | null = null;

      const full = await supabase
        .from('profiles')
        .select(
          'id, full_name, role, skills, reputation_points, avatar_url, bio, available_for_missions'
        )
        .order('reputation_points', { ascending: false })
        .limit(80);

      if (full.error) {
        const basic = await supabase
          .from('profiles')
          .select('id, full_name, role, skills, reputation_points, avatar_url, bio')
          .order('reputation_points', { ascending: false })
          .limit(80);
        data = basic.data;
        error = basic.error;
      } else {
        data = full.data;
      }

      if (error) {
        console.error(error);
        setTalents([]);
      } else {
        const formatted = (data || []).map((prof: any) => {
          const name = prof.full_name || 'Talent';
          const initials = name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'T';
          const roleRaw = prof.role || 'developer';
          const roleFormatted = roleRaw === 'product_creator'
            ? 'Product Owner'
            : roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);
          return {
            id: prof.id,
            name,
            role: roleFormatted,
            points: prof.reputation_points ?? 0,
            skills: (prof.skills || []).slice(0, 8),
            skillsTotal: (prof.skills || []).length,
            initials,
            avatarUrl: prof.avatar_url || null,
            levelLabel: formatLevelBadge(getLevelProgress(prof.reputation_points ?? 0).level),
            // Défaut ON si colonne absente
            available: prof.available_for_missions !== false,
          };
        });
        setTalents(formatted);
      }
    } catch (err) {
      console.error(err);
      setTalents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredTalents = talents.filter(talent => {
    return talent.name.toLowerCase().includes(search.toLowerCase()) ||
           talent.role.toLowerCase().includes(search.toLowerCase()) ||
           talent.skills.some((skill: string) => skill.toLowerCase().includes(search.toLowerCase()));
  });

  const listHeader = (
    <View className="mb-3">
      <View
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
        className="flex-row items-center h-12 rounded-xl border px-3 gap-2"
      >
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          placeholder="Rechercher un talent ou une compétence..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          style={{ color: colors.text }}
          className="flex-1 font-inter text-sm h-full"
          accessibilityLabel="Rechercher un talent"
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <CollapsibleHeader title="Talents" visible={headerVisible} />

      {loading ? (
        <View style={{ padding: 16, paddingTop: headerOffset + 12 }}>
          {listHeader}
          <ListSkeleton count={5} variant="row" />
        </View>
      ) : (
        <FlatList
          data={filteredTalents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingTop: headerOffset + 12,
            paddingBottom: listBottom,
            gap: 12,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTalents('refresh')}
              tintColor={colors.turmeric}
              colors={[colors.turmeric]}
            />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon={Users}
              title={search ? 'Aucun résultat' : 'Aucun talent pour l’instant'}
              description={
                search
                  ? 'Aucun talent ne correspond à ta recherche.'
                  : 'Les profils de la communauté PIH apparaîtront ici.'
              }
            />
          }
          renderItem={({ item: talent }) => (
            // View racine (pas Pressable) → évite <button> imbriqués sur web
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="border rounded-3xl p-5 gap-4"
            >
              <Pressable
                onPress={() => router.push(`/profile/${talent.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Profil de ${talent.name}`}
                className="gap-4 active:opacity-95"
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-3">
                    <View
                      style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                      className="w-12 h-12 rounded-full border items-center justify-center overflow-hidden"
                    >
                      {talent.avatarUrl ? (
                        <Image source={{ uri: talent.avatarUrl }} style={{ width: 48, height: 48 }} />
                      ) : (
                        <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
                          {talent.initials}
                        </Text>
                      )}
                    </View>
                    <View>
                      <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
                        {talent.name}
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="font-inter text-xs">
                        {talent.role}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Award size={12} color={colors.textSecondary} />
                    <Text style={{ color: colors.text }} className="font-inter text-xs font-semibold">
                      {talent.points} Élan
                    </Text>
                    {talent.levelLabel ? (
                      <Text
                        style={{ color: colors.textSecondary }}
                        className="font-inter text-[9px] font-bold"
                      >
                        {talent.levelLabel}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-1.5">
                  {talent.skills.map((skill: string) => (
                    <View
                      key={skill}
                      style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                      className="px-2.5 py-1 rounded-lg border"
                    >
                      <Text
                        style={{ color: colors.textSecondary }}
                        className="font-inter text-[10px] font-medium"
                      >
                        {skill}
                      </Text>
                    </View>
                  ))}
                  {talent.skillsTotal > talent.skills.length ? (
                    <Text
                      style={{ color: colors.textSecondary }}
                      className="font-inter text-[10px] self-center"
                    >
                      +{talent.skillsTotal - talent.skills.length}
                    </Text>
                  ) : null}
                </View>
              </Pressable>

              <View style={{ backgroundColor: colors.border, opacity: 0.6 }} className="h-[1px]" />

              <View className="flex-row justify-between items-center">
                <Text
                  style={{ color: talent.available ? colors.kaki : colors.textSecondary }}
                  className="font-inter text-[10px] font-semibold"
                >
                  {talent.available ? 'Dispo missions' : 'Indisponible'}
                </Text>
                <Pressable
                  onPress={() => router.push(`/chat/${talent.id}`)}
                  hitSlop={8}
                  style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                  className="border flex-row items-center gap-1.5 px-4 py-2 rounded-full active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel={`Contacter ${talent.name}`}
                >
                  <Text style={{ color: colors.text }} className="font-inter text-[10px] font-bold">
                    Contacter
                  </Text>
                  <Send size={10} color={colors.text} style={{ transform: [{ rotate: '30deg' }] }} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
