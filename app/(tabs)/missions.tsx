import { useRouter } from 'expo-router';
import { Clock, Plus, Search, Target } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import CollapsibleHeader, {
  useCollapsibleHeaderOffset,
  useTabListBottomPadding,
} from '../../components/CollapsibleHeader';
import PostAuthorHeader from '../../components/PostAuthorHeader';
import ReactionBar from '../../components/ReactionBar';
import ReplyCountBadge from '../../components/ReplyCountBadge';
import EmptyState from '../../components/ui/EmptyState';
import ListSkeleton from '../../components/ui/ListSkeleton';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatDeadlineLabel } from '../../lib/deadline';
import { formatRelativeTime, formatRoleLabel } from '../../lib/formatTime';
import { fetchReplyCounts } from '../../lib/replies';
import { supabase } from '../../lib/supabase';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'dev', label: 'Développement' },
  { id: 'design', label: 'Design' },
  { id: 'marketing', label: 'Marketing' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'Tous statuts' },
  { id: 'open', label: 'Ouvertes' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'review', label: 'Revue' },
  { id: 'completed', label: 'Validées' },
];

function pickProfile(raw: any) {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function MissionsScreen() {
  const router = useRouter();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [headerVisible, setHeaderVisible] = useState(true);
  const { colors } = useThemeFlavor();
  const headerOffset = useCollapsibleHeaderOffset();
  const listBottom = useTabListBottomPadding();
  const lastOffsetY = useRef(0);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y <= 10) {
      setHeaderVisible(true);
      return;
    }
    if (y > lastOffsetY.current + 15) setHeaderVisible(false);
    else if (y < lastOffsetY.current - 15) setHeaderVisible(true);
    lastOffsetY.current = y;
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async (mode: 'init' | 'refresh' = 'init') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('missions')
        .select(
          `
          id, title, difficulty, points_reward, skills_required, status, created_at, deadline,
          projects(
            name,
            creator:profiles!creator_id(id, full_name, role)
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setMissions([]);
        return;
      }

      const formatted = (data || []).map((miss: any) => {
        const skills = miss.skills_required || [];
        let category = 'dev';
        if (
          skills.some((s: string) =>
            ['Figma', 'UI Design', 'Branding', 'UX Research'].includes(s)
          )
        ) {
          category = 'design';
        } else if (
          skills.some((s: string) =>
            ['Copywriting', 'Marketing', 'Communication', 'Français'].includes(s)
          )
        ) {
          category = 'marketing';
        }

        const project = Array.isArray(miss.projects) ? miss.projects[0] : miss.projects;
        const creator = pickProfile(project?.creator);
        const projName = project?.name || 'Projet';

        return {
          id: miss.id,
          title: miss.title,
          project: projName,
          reward: `+${miss.points_reward} pts`,
          duration: formatDeadlineLabel(miss.deadline, 'Sans échéance'),
          status: miss.status || 'open',
          difficulty: miss.difficulty,
          difficultyLabel:
            miss.difficulty === 'hard'
              ? 'Difficile'
              : miss.difficulty === 'medium'
                ? 'Moyen'
                : 'Facile',
          category,
          createdAt: miss.created_at,
          replyCount: 0,
          authorId: creator?.id,
          authorName: creator?.full_name || 'Lead projet',
          authorRole: creator?.role,
        };
      });
      const counts = await fetchReplyCounts([
        { refType: 'mission', ids: formatted.map((m) => m.id) },
      ]);
      formatted.forEach((m) => {
        m.replyCount = counts.get(`mission:${m.id}`) || 0;
      });
      setMissions(formatted);
    } catch (err) {
      console.error(err);
      setMissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredMissions = missions.filter((mission) => {
    const matchesSearch =
      mission.title.toLowerCase().includes(search.toLowerCase()) ||
      mission.project.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === 'all' || mission.category === activeCategory;
    const matchesStatus =
      activeStatus === 'all' || mission.status === activeStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <CollapsibleHeader title="Missions" visible={headerVisible} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingTop: headerOffset + 12,
          paddingBottom: listBottom,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMissions('refresh')}
            tintColor={colors.turmeric}
            colors={[colors.turmeric]}
          />
        }
      >
        <View className="gap-3 mb-1">
          <View className="flex-row gap-2">
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="flex-row flex-1 items-center h-12 rounded-xl border px-3 gap-2"
            >
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                placeholder="Rechercher une mission..."
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                style={{ color: colors.text }}
                className="flex-1 font-inter text-sm h-full"
              />
            </View>
            <Pressable
              onPress={() => router.push('/mission/create')}
              className="w-12 h-12 rounded-xl items-center justify-center active:opacity-90 bg-turmeric"
            >
              <Plus size={20} color="#0D0B05" strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {STATUS_FILTERS.map((st) => {
              const isActive = activeStatus === st.id;
              return (
                <Pressable
                  key={st.id}
                  onPress={() => setActiveStatus(st.id)}
                  style={{
                    backgroundColor: isActive ? colors.kaki + '33' : colors.deep,
                    borderColor: isActive ? colors.kaki : colors.border,
                  }}
                  className="px-3.5 py-2 rounded-full border"
                >
                  <Text
                    style={{
                      color: isActive ? colors.kaki : colors.textSecondary,
                    }}
                    className="font-inter text-[11px] font-semibold"
                  >
                    {st.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {CATEGORY_FILTERS.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  style={{
                    backgroundColor: isActive ? colors.turmeric : colors.card,
                    borderColor: isActive ? colors.turmeric : colors.border,
                  }}
                  className="px-4 py-2 rounded-full border"
                >
                  <Text
                    style={{
                      color: isActive ? colors.onTurmeric : colors.textSecondary,
                    }}
                    className="font-inter text-xs font-semibold"
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {filteredMissions.length > 0 ? (
          filteredMissions.map((mission) => {
            let diffColor = colors.kaki;
            if (mission.difficulty === 'medium') diffColor = colors.textSecondary;
            else if (mission.difficulty === 'hard') diffColor = colors.corail;

            return (
              <Pressable
                key={mission.id}
                onPress={() => router.push(`/mission/${mission.id}`)}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="border rounded-2xl px-4 pt-3.5 pb-2 gap-3 active:opacity-95"
              >
                <PostAuthorHeader
                  authorName={mission.authorName}
                  authorId={mission.authorId}
                  subtitle={`${mission.project} · ${formatRoleLabel(mission.authorRole)}`}
                  timeLabel={formatRelativeTime(mission.createdAt)}
                  typeLabel={mission.difficultyLabel}
                  typeColor={diffColor}
                />

                <Text
                  style={{ color: colors.text }}
                  className="font-space text-[15px] font-bold leading-5"
                >
                  {mission.title}
                </Text>

                <View className="flex-row items-center gap-3">
                  <View className="flex-row items-center gap-1">
                    <Clock size={12} color={colors.textSecondary} />
                    <Text
                      style={{ color: colors.textSecondary }}
                      className="font-inter text-[11px]"
                    >
                      {mission.duration}
                    </Text>
                  </View>
                  <ReplyCountBadge count={mission.replyCount} />
                  <View className="flex-1" />
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="font-inter text-xs font-bold"
                  >
                    {mission.reward}
                  </Text>
                </View>

                <View
                  style={{ borderTopWidth: 1, borderTopColor: colors.border + '99' }}
                  className="pt-1"
                >
                  <ReactionBar refId={mission.id} refType="mission" showIdea={false} />
                </View>
              </Pressable>
            );
          })
        ) : loading ? (
          <ListSkeleton count={4} variant="card" />
        ) : (
          <EmptyState
            icon={Target}
            title={search || activeCategory !== 'all' ? 'Aucun résultat' : 'Aucune mission'}
            description={
              search || activeCategory !== 'all'
                ? 'Essaie un autre filtre ou une autre recherche.'
                : 'Les leads publient des missions concrètes ici. Crée-en une si tu pilotes un projet.'
            }
            actionLabel={search || activeCategory !== 'all' ? undefined : 'Créer une mission'}
            onAction={search || activeCategory !== 'all' ? undefined : () => router.push('/mission/create')}
          />
        )}
      </ScrollView>
    </View>
  );
}
