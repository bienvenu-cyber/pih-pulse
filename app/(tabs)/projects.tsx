import { useRouter } from 'expo-router';
import { ExternalLink, Layers, MapPin, Plus, Search, Users } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
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
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatRelativeTime, formatRoleLabel } from '../../lib/formatTime';
import { fetchReplyCounts } from '../../lib/replies';
import { supabase } from '../../lib/supabase';

const STATUS_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'mvp', label: 'MVP' },
  { id: 'prototype', label: 'Prototype' },
  { id: 'idea', label: 'Idée' },
  { id: 'scale', label: 'Lancé' },
];

function statusLabel(status: string) {
  if (status === 'mvp') return 'MVP';
  if (status === 'prototype') return 'Prototype';
  if (status === 'scale') return 'Lancé';
  return 'Idée';
}

function pickProfile(raw: any) {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [headerVisible, setHeaderVisible] = useState(true);
  const { colors } = useThemeFlavor();
  const headerOffset = useCollapsibleHeaderOffset();
  const listBottom = useTabListBottomPadding();
  const lastOffsetY = useRef(0);
  const router = useRouter();

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
    fetchProjects();
  }, []);

  const fetchProjects = async (mode: 'init' | 'refresh' = 'init') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const full = await supabase
        .from('projects')
        .select(
          `
          id, name, short_description, status, skills_needed, location, roles_needed, created_at, creator_id,
          creator:profiles!creator_id(id, full_name, role),
          project_members(user_id)
        `
        )
        .order('created_at', { ascending: false });

      let data: any[] | null = full.data as any[] | null;
      if (full.error) {
        // Colonnes location/roles absentes → fallback
        const basic = await supabase
          .from('projects')
          .select(
            `
            id, name, short_description, status, skills_needed, created_at, creator_id,
            creator:profiles!creator_id(id, full_name, role),
            project_members(user_id)
          `
          )
          .order('created_at', { ascending: false });
        if (basic.error) {
          console.error(basic.error);
          setProjects([]);
          return;
        }
        data = basic.data as any[] | null;
      }

      const mapped = (data || []).map((proj: any) => {
        const creator = pickProfile(proj.creator);
        const memberCount = proj.project_members?.length || 1;
        return {
          id: proj.id,
          name: proj.name,
          shortDescription: proj.short_description,
          members: `${memberCount} membre${memberCount > 1 ? 's' : ''}`,
          location: (proj.location || 'Parakou').trim() || 'Parakou',
          status: proj.status,
          statusLabel: statusLabel(proj.status),
          skills: proj.skills_needed || [],
          createdAt: proj.created_at,
          replyCount: 0,
          authorId: creator?.id || proj.creator_id,
          authorName: creator?.full_name || 'Membre PIH',
          authorRole: creator?.role,
        };
      });

      const counts = await fetchReplyCounts([
        { refType: 'project', ids: mapped.map((p) => p.id) },
      ]);
      mapped.forEach((p) => {
        p.replyCount = counts.get(`project:${p.id}`) || 0;
      });
      setProjects(mapped);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.shortDescription?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'all' || p.status === activeFilter;
    return matchSearch && matchFilter;
  });

  const listHeader = (
    <View className="gap-3 mb-3">
      <View className="flex-row gap-2">
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="flex-row flex-1 items-center h-12 rounded-xl border px-3 gap-2"
        >
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            placeholder="Rechercher un projet..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={{ color: colors.text }}
            className="flex-1 font-inter text-sm h-full"
            accessibilityLabel="Rechercher un projet"
          />
        </View>
        <Pressable
          onPress={() => router.push('/project/create')}
          accessibilityRole="button"
          accessibilityLabel="Créer un projet"
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
        {STATUS_FILTERS.map((f) => {
          const active = activeFilter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setActiveFilter(f.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filtre ${f.label}`}
              style={{
                backgroundColor: active ? colors.turmeric : colors.deep,
                borderColor: active ? colors.turmeric : colors.border,
              }}
              className="px-4 py-2 rounded-full border"
            >
              <Text
                style={{ color: active ? colors.onTurmeric : colors.textSecondary }}
                className="font-inter text-xs font-semibold"
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <CollapsibleHeader title="Projets" visible={headerVisible} />

      {loading ? (
        <View style={{ padding: 16, paddingTop: headerOffset + 12 }}>
          {listHeader}
          <ListSkeleton count={4} variant="card" />
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
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
              onRefresh={() => fetchProjects('refresh')}
              tintColor={colors.turmeric}
              colors={[colors.turmeric]}
            />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon={Layers}
              title={
                search || activeFilter !== 'all'
                  ? 'Aucun résultat'
                  : 'Aucun projet pour l’instant'
              }
              description={
                search || activeFilter !== 'all'
                  ? 'Essaie un autre filtre ou une autre recherche.'
                  : 'Lance le premier projet du hub — l’équipe te rejoindra.'
              }
              actionLabel={
                search || activeFilter !== 'all' ? undefined : 'Créer un projet'
              }
              onAction={
                search || activeFilter !== 'all'
                  ? undefined
                  : () => router.push('/project/create')
              }
            />
          }
          renderItem={({ item: project }) => {
            const showIdea =
              project.status === 'idea' || project.status === 'prototype';
            const isMvp = project.status === 'mvp' || project.status === 'scale';

            return (
              <Pressable
                onPress={() => router.push(`/project/${project.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Projet ${project.name}`}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="rounded-2xl px-4 pt-3.5 pb-2 gap-3 active:opacity-95 border"
              >
                <PostAuthorHeader
                  authorName={project.authorName}
                  authorId={project.authorId}
                  subtitle={`${formatRoleLabel(project.authorRole)} · a publié un projet`}
                  timeLabel={formatRelativeTime(project.createdAt)}
                  typeLabel={project.statusLabel}
                  typeColor={isMvp ? colors.kaki : colors.textSecondary}
                />

                <View className="gap-1.5">
                  <Text
                    style={{ color: colors.text }}
                    className="font-space text-[16px] font-bold leading-6"
                  >
                    {project.name}
                  </Text>
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="font-inter text-[13px] leading-5"
                    numberOfLines={3}
                  >
                    {project.shortDescription}
                  </Text>
                </View>

                {project.skills.length > 0 && (
                  <View className="flex-row flex-wrap gap-1.5">
                    {project.skills.slice(0, 4).map((skill: string) => (
                      <View
                        key={skill}
                        style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                        className="px-2 py-1 rounded-md border"
                      >
                        <Text
                          style={{ color: colors.textSecondary }}
                          className="font-inter text-[10px] font-medium"
                        >
                          {skill}
                        </Text>
                      </View>
                    ))}
                    {project.skills.length > 4 && (
                      <Text
                        style={{ color: colors.textSecondary }}
                        className="font-inter text-[10px] self-center"
                      >
                        +{project.skills.length - 4}
                      </Text>
                    )}
                  </View>
                )}

                <View className="flex-row gap-4 items-center">
                  <View className="flex-row items-center gap-1">
                    <Users size={12} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary }} className="font-inter text-xs">
                      {project.members}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <MapPin size={12} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary }} className="font-inter text-xs">
                      {project.location}
                    </Text>
                  </View>
                  <ReplyCountBadge count={project.replyCount} />
                  <View className="flex-1" />
                  <View className="flex-row items-center gap-0.5">
                    <Text
                      style={{ color: colors.textSecondary }}
                      className="font-inter text-[11px] font-bold"
                    >
                      Voir
                    </Text>
                    <ExternalLink size={12} color={colors.textSecondary} />
                  </View>
                </View>

                <View
                  style={{ borderTopWidth: 1, borderTopColor: colors.border + '99' }}
                  className="pt-1"
                >
                  <ReactionBar refId={project.id} refType="project" showIdea={showIdea} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
