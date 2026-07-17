import { useRouter } from 'expo-router';
import { Clock, Plus, Search, Target } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
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
import LoadMoreFooter from '../../components/ui/LoadMoreFooter';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatDeadlineLabel } from '../../lib/deadline';
import { formatRelativeTime, formatRoleLabel } from '../../lib/formatTime';
import { fetchReplyCounts } from '../../lib/replies';
import {
  isSearchActive,
  LIST_PAGE_SIZE,
  sanitizeSearchTerm,
} from '../../lib/scaleQuery';
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

function inferCategory(skills: string[]): string {
  if (
    skills.some((s: string) =>
      ['Figma', 'UI Design', 'Branding', 'UX Research'].includes(s)
    )
  ) {
    return 'design';
  }
  if (
    skills.some((s: string) =>
      ['Copywriting', 'Marketing', 'Communication', 'Français'].includes(s)
    )
  ) {
    return 'marketing';
  }
  return 'dev';
}

type MissionRow = {
  id: string;
  title: string;
  project: string;
  reward: string;
  duration: string;
  status: string;
  difficulty: string;
  difficultyLabel: string;
  category: string;
  createdAt: string;
  replyCount: number;
  authorId?: string;
  authorName: string;
  authorRole?: string;
};

function mapMissions(data: any[]): MissionRow[] {
  return (data || []).map((miss: any) => {
    const skills = miss.skills_required || [];
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
      category: inferCategory(skills),
      createdAt: miss.created_at,
      replyCount: 0,
      authorId: creator?.id,
      authorName: creator?.full_name || 'Lead projet',
      authorRole: creator?.role,
    };
  });
}

async function fetchMissionsPage(opts: {
  from: number;
  to: number;
  statusFilter: string;
  search: string;
}): Promise<{ rows: MissionRow[]; error?: string }> {
  const { from, to, statusFilter, search } = opts;
  const q = sanitizeSearchTerm(search);

  let query = supabase
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
    .order('created_at', { ascending: false })
    .range(from, to);

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  if (isSearchActive(search)) {
    query = query.ilike('title', `%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[missions]', error.message);
    return { rows: [], error: error.message };
  }
  return { rows: mapMissions(data || []) };
}

export default function MissionsScreen() {
  const router = useRouter();
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [headerVisible, setHeaderVisible] = useState(true);
  const { colors } = useThemeFlavor();
  const headerOffset = useCollapsibleHeaderOffset();
  const listBottom = useTabListBottomPadding();
  const lastOffsetY = useRef(0);
  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const setHasMoreSafe = (v: boolean) => {
    hasMoreRef.current = v;
    setHasMore(v);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 320);
    return () => clearTimeout(t);
  }, [search]);

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

  const loadPage = useCallback(
    async (mode: 'init' | 'refresh' | 'more') => {
      if (mode === 'more') {
        if (!hasMoreRef.current || loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const page = mode === 'more' ? pageRef.current : 0;
        const from = page * LIST_PAGE_SIZE;
        const to = from + LIST_PAGE_SIZE - 1;

        const { rows, error } = await fetchMissionsPage({
          from,
          to,
          statusFilter: activeStatus,
          search: debouncedSearch,
        });

        if (error && mode !== 'more') {
          setMissions([]);
          setHasMoreSafe(false);
          return;
        }

        const counts = await fetchReplyCounts([
          { refType: 'mission', ids: rows.map((m) => m.id) },
        ]);
        rows.forEach((m) => {
          m.replyCount = counts.get(`mission:${m.id}`) || 0;
        });

        if (mode === 'more') {
          setMissions((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            rows.forEach((r) => {
              if (!seen.has(r.id)) merged.push(r);
            });
            return merged;
          });
          pageRef.current = page + 1;
        } else {
          setMissions(rows);
          pageRef.current = 1;
        }
        setHasMoreSafe(rows.length >= LIST_PAGE_SIZE);
      } catch (err) {
        console.error('[missions]', err);
        if (mode !== 'more') setMissions([]);
        setHasMoreSafe(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [activeStatus, debouncedSearch]
  );

  useEffect(() => {
    pageRef.current = 0;
    setHasMoreSafe(true);
    void loadPage('init');
  }, [activeStatus, debouncedSearch, loadPage]);

  // Catégorie = heuristique skills côté client (pas de colonne DB)
  const filteredMissions = useMemo(() => {
    if (activeCategory === 'all') return missions;
    return missions.filter((m) => m.category === activeCategory);
  }, [missions, activeCategory]);

  const listHeader = (
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
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <CollapsibleHeader title="Missions" visible={headerVisible} />

      {loading && missions.length === 0 ? (
        <View style={{ padding: 16, paddingTop: headerOffset + 12 }}>
          {listHeader}
          <ListSkeleton count={4} variant="card" />
        </View>
      ) : (
        <FlatList
          data={filteredMissions}
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
          onEndReached={() => void loadPage('more')}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPage('refresh')}
              tintColor={colors.turmeric}
              colors={[colors.turmeric]}
            />
          }
          ListHeaderComponent={listHeader}
          ListFooterComponent={
            <LoadMoreFooter
              loading={loadingMore}
              hasMore={hasMore && missions.length > 0}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Target}
              title={
                debouncedSearch || activeCategory !== 'all' || activeStatus !== 'all'
                  ? 'Aucun résultat'
                  : 'Aucune mission'
              }
              description={
                debouncedSearch || activeCategory !== 'all' || activeStatus !== 'all'
                  ? 'Essaie un autre filtre ou une autre recherche.'
                  : 'Les leads publient des missions concrètes ici. Crée-en une si tu pilotes un projet.'
              }
              actionLabel={
                debouncedSearch || activeCategory !== 'all' || activeStatus !== 'all'
                  ? undefined
                  : 'Créer une mission'
              }
              onAction={
                debouncedSearch || activeCategory !== 'all' || activeStatus !== 'all'
                  ? undefined
                  : () => router.push('/mission/create')
              }
            />
          }
          renderItem={({ item: mission }) => {
            let diffColor = colors.kaki;
            if (mission.difficulty === 'medium') diffColor = colors.textSecondary;
            else if (mission.difficulty === 'hard') diffColor = colors.corail;

            return (
              <View
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="border rounded-2xl px-4 pt-3.5 pb-2 gap-3"
              >
                <PostAuthorHeader
                  authorName={mission.authorName}
                  authorId={mission.authorId}
                  subtitle={`${mission.project} · ${formatRoleLabel(mission.authorRole)}`}
                  timeLabel={formatRelativeTime(mission.createdAt)}
                  typeLabel={mission.difficultyLabel}
                  typeColor={diffColor}
                />

                <Pressable
                  onPress={() => router.push(`/mission/${mission.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mission ${mission.title}`}
                  className="gap-3 active:opacity-95"
                >
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
                </Pressable>

                <View
                  style={{ borderTopWidth: 1, borderTopColor: colors.border + '99' }}
                  className="pt-1"
                >
                  <ReactionBar refId={mission.id} refType="mission" showIdea={false} />
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
