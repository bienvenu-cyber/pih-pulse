import { useRouter } from 'expo-router';
import {
  Award,
  Calendar,
  ChevronRight,
  Clock,
  MapPin,
  Users,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import CollapsibleHeader, {
  useCollapsibleHeaderOffset,
  useTabListBottomPadding,
} from '../../components/CollapsibleHeader';
import CreateHubSheet from '../../components/CreateHubSheet';
import MediaCarousel from '../../components/MediaCarousel';
import PostAuthorHeader from '../../components/PostAuthorHeader';
import ReactionBar from '../../components/ReactionBar';
import ReplyCountBadge from '../../components/ReplyCountBadge';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatRelativeTime, formatRoleLabel } from '../../lib/formatTime';
import type { MediaAsset } from '../../lib/media';
import { fetchPostsSafe, postCaption } from '../../lib/posts';
import {
  emptyReactionCounts,
  fetchReactionsBatch,
  reactionKey,
  type ReactionCounts,
  type RefType,
} from '../../lib/reactions';
import { fetchReplyCounts } from '../../lib/replies';
import { supabase } from '../../lib/supabase';

const FEED_PAGE_SIZE = 12;

type FeedTab = 'all' | 'for_you' | 'my_teams';

type FeedItem = {
  id: string;
  type: 'project' | 'mission' | 'event' | 'post';
  status?: string;
  tag: string;
  title: string;
  body?: string;
  meta1?: string;
  meta2?: string;
  icon1?: any;
  icon2?: any;
  ctaText?: string;
  created_at?: number;
  authorId?: string | null;
  authorName?: string;
  authorRole?: string;
  authorAvatar?: string | null;
  subtitle?: string;
  boosts?: number;
  replyCount?: number;
  skills?: string[];
  projectId?: string;
  media?: MediaAsset[];
};

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'for_you', label: 'Pour moi' },
  { id: 'my_teams', label: 'Mes équipes' },
];

function pickProfile(raw: any) {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

function asMediaList(raw: any, fallbackUrl?: string | null): MediaAsset[] {
  if (Array.isArray(raw) && raw.length > 0) return raw as MediaAsset[];
  if (fallbackUrl) {
    return [{ type: 'image', url: fallbackUrl, thumbUrl: fallbackUrl }];
  }
  return [];
}

/**
 * Select résilient : si colonnes media / jointures avancées absentes
 * (migration pas encore appliquée), on retombe sur le schéma de base
 * pour ne jamais vider le feed seedé.
 */
async function fetchProjectsSafe() {
  const full = await supabase
    .from('projects')
    .select(
      `
      id, name, short_description, status, created_at, creator_id, skills_needed, media, avatar_url,
      creator:profiles!creator_id(id, full_name, role, avatar_url)
    `
    )
    .order('created_at', { ascending: false })
    .limit(40);

  if (!full.error && full.data) return full.data;

  console.warn('[feed] projects full select failed, fallback:', full.error?.message);

  const basic = await supabase
    .from('projects')
    .select(
      `
      id, name, short_description, status, created_at, creator_id, skills_needed, avatar_url,
      creator:profiles!creator_id(id, full_name, role, avatar_url)
    `
    )
    .order('created_at', { ascending: false })
    .limit(40);

  if (!basic.error && basic.data) return basic.data;

  // Dernier recours sans join
  const bare = await supabase
    .from('projects')
    .select('id, name, short_description, status, created_at, creator_id, skills_needed, avatar_url')
    .order('created_at', { ascending: false })
    .limit(40);

  if (bare.error) {
    console.error('[feed] projects bare select failed:', bare.error.message);
    return [];
  }
  return bare.data || [];
}

async function fetchMissionsSafe() {
  const full = await supabase
    .from('missions')
    .select(
      `
      id, title, difficulty, points_reward, created_at, status, skills_required, project_id, media,
      projects(
        id, name,
        creator:profiles!creator_id(id, full_name, role, avatar_url)
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(40);

  if (!full.error && full.data) return full.data;

  console.warn('[feed] missions full select failed, fallback:', full.error?.message);

  // Sans media + sans filtre status strict
  const basic = await supabase
    .from('missions')
    .select(
      `
      id, title, difficulty, points_reward, created_at, status, skills_required, project_id,
      projects(id, name, creator:profiles!creator_id(id, full_name, role, avatar_url))
    `
    )
    .order('created_at', { ascending: false })
    .limit(40);

  if (!basic.error && basic.data) return basic.data;

  const bare = await supabase
    .from('missions')
    .select('id, title, difficulty, points_reward, created_at, status, skills_required, project_id')
    .order('created_at', { ascending: false })
    .limit(40);

  if (bare.error) {
    console.error('[feed] missions bare select failed:', bare.error.message);
    return [];
  }
  return bare.data || [];
}

export default function FeedScreen() {
  const [rawItems, setRawItems] = useState<FeedItem[]>([]);
  const [tab, setTab] = useState<FeedTab>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [mySkills, setMySkills] = useState<string[]>([]);
  const [myProjectIds, setMyProjectIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE);
  const [reactionMap, setReactionMap] = useState<Map<string, ReactionCounts>>(new Map());
  const [meId, setMeId] = useState<string | null>(null);
  const { colors } = useThemeFlavor();
  const headerOffset = useCollapsibleHeaderOffset();
  const listBottom = useTabListBottomPadding();
  const lastOffsetY = useRef(0);
  const router = useRouter();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const y = contentOffset.y;
    if (y <= 10) {
      setHeaderVisible(true);
    } else if (y > lastOffsetY.current + 15) setHeaderVisible(false);
    else if (y < lastOffsetY.current - 15) setHeaderVisible(true);
    lastOffsetY.current = y;

    // Infinite scroll client-side
    const nearBottom = y + layoutMeasurement.height >= contentSize.height - 220;
    if (nearBottom) {
      setVisibleCount((v) => v + FEED_PAGE_SIZE);
    }
  };

  const fetchFeed = useCallback(async (mode: 'replace' | 'refresh' = 'replace') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setFetchError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setMeId(user.id);
        const [{ data: profile }, { data: memberships }] = await Promise.all([
          supabase.from('profiles').select('skills').eq('id', user.id).maybeSingle(),
          supabase.from('project_members').select('project_id').eq('user_id', user.id),
        ]);
        setMySkills(profile?.skills || []);
        setMyProjectIds((memberships || []).map((m: any) => m.project_id));
      } else {
        setMeId(null);
      }

      const [projects, missions, posts, eventsRes, boostsRes] = await Promise.all([
        fetchProjectsSafe(),
        fetchMissionsSafe(),
        fetchPostsSafe(40),
        supabase
          .from('hub_events')
          .select(
            'id, title, description, location, starts_at, created_at, created_by, creator:profiles!created_by(id, full_name, role)'
          )
          .order('starts_at', { ascending: true })
          .limit(10),
        supabase.from('boosts').select('ref_id, ref_type'),
      ]);

      const boostMap = new Map<string, number>();
      (boostsRes.data || []).forEach((b: any) => {
        const key = `${b.ref_type}:${b.ref_id}`;
        boostMap.set(key, (boostMap.get(key) || 0) + 1);
      });

      const items: FeedItem[] = [];

      posts.forEach((post) => {
        const author = post.author;
        const projectName = post.project?.name;
        const caption = postCaption(post);
        items.push({
          id: post.id,
          type: 'post',
          tag: 'Post',
          // Une seule caption (pas titre + corps séparés)
          title: caption.length > 160 ? `${caption.slice(0, 160)}…` : caption || '📷 Post',
          body: undefined,
          meta1: projectName || undefined,
          icon1: projectName ? Users : undefined,
          ctaText: 'Lire',
          created_at: new Date(post.created_at).getTime(),
          authorId: author?.id || post.author_id,
          authorName: author?.full_name || 'Membre PIH',
          authorRole: author?.role || undefined,
          authorAvatar: author?.avatar_url || null,
          subtitle: projectName
            ? `${formatRoleLabel(author?.role)} · post · ${projectName}`
            : `${formatRoleLabel(author?.role)} · a publié un post`,
          boosts: boostMap.get(`post:${post.id}`) || 0,
          projectId: post.project_id || post.project?.id || undefined,
          media: asMediaList(post.media),
        });
      });

      projects.forEach((proj: any) => {
        const creator = pickProfile(proj.creator);
        items.push({
          id: proj.id,
          type: 'project',
          status: proj.status,
          tag: 'Projet',
          title: proj.name,
          body: proj.short_description,
          meta1: (proj.status || 'idea').toUpperCase(),
          meta2: (proj.location || 'Parakou').trim() || 'Parakou',
          icon1: Users,
          icon2: MapPin,
          ctaText: 'Voir',
          created_at: new Date(proj.created_at).getTime(),
          authorId: creator?.id || proj.creator_id,
          authorName: creator?.full_name || 'Membre PIH',
          authorRole: creator?.role,
          authorAvatar: creator?.avatar_url || null,
          subtitle: `${formatRoleLabel(creator?.role)} · a publié un projet`,
          boosts: boostMap.get(`project:${proj.id}`) || 0,
          skills: proj.skills_needed || [],
          projectId: proj.id,
          media: asMediaList(proj.media, proj.avatar_url),
        });
      });

      missions.forEach((miss: any) => {
        // Ne pas masquer les seeds: on affiche tout sauf cancelled
        if (miss.status === 'cancelled') return;

        const project = Array.isArray(miss.projects) ? miss.projects[0] : miss.projects;
        const creator = pickProfile(project?.creator);
        const projName = project?.name || 'Projet';
        const diff =
          miss.difficulty === 'hard'
            ? 'Difficile'
            : miss.difficulty === 'easy'
              ? 'Facile'
              : 'Moyen';

        items.push({
          id: miss.id,
          type: 'mission',
          status: miss.status,
          tag: 'Mission',
          title: miss.title,
          body: `Sur ${projName}`,
          meta1: diff,
          meta2: `+${miss.points_reward} pts`,
          icon1: Clock,
          icon2: Award,
          ctaText: miss.status === 'open' ? 'Postuler' : 'Voir',
          created_at: new Date(miss.created_at).getTime(),
          authorId: creator?.id,
          authorName: creator?.full_name || 'Lead projet',
          authorRole: creator?.role,
          authorAvatar: creator?.avatar_url || null,
          subtitle: `${projName} · ${miss.status || 'open'}`,
          boosts: boostMap.get(`mission:${miss.id}`) || 0,
          skills: miss.skills_required || [],
          projectId: miss.project_id || project?.id,
          media: asMediaList(miss.media),
        });
      });

      if (!eventsRes.error && eventsRes.data?.length) {
        eventsRes.data.forEach((ev: any) => {
          const creator = pickProfile(ev.creator);
          items.push({
            id: ev.id,
            type: 'event',
            tag: 'Événement',
            title: ev.title,
            body: ev.description || ev.location,
            meta1: ev.starts_at
              ? new Date(ev.starts_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })
              : 'À venir',
            icon1: Calendar,
            created_at: new Date(ev.created_at || ev.starts_at || Date.now()).getTime(),
            authorId: creator?.id || ev.created_by,
            authorName: creator?.full_name || 'PIH Pulse',
            subtitle: ev.location || 'Communauté',
            boosts: 0,
          });
        });
      }

      // Compteurs réponses / questions / échanges
      const replyMap = await fetchReplyCounts([
        { refType: 'post', ids: items.filter((i) => i.type === 'post').map((i) => i.id) },
        { refType: 'project', ids: items.filter((i) => i.type === 'project').map((i) => i.id) },
        { refType: 'mission', ids: items.filter((i) => i.type === 'mission').map((i) => i.id) },
      ]);
      items.forEach((item) => {
        if (item.type === 'post' || item.type === 'project' || item.type === 'mission') {
          item.replyCount = replyMap.get(`${item.type}:${item.id}`) || 0;
        }
      });

      items.sort((a, b) => {
        const sa = (a.boosts || 0) * 1e12 + (a.created_at || 0);
        const sb = (b.boosts || 0) * 1e12 + (b.created_at || 0);
        return sb - sa;
      });

      setRawItems(items);
      setVisibleCount(FEED_PAGE_SIZE);

      // Batch réactions (2 req vs 4×N)
      const reactRefs = items
        .filter((i) => i.type === 'post' || i.type === 'project' || i.type === 'mission')
        .map((i) => ({
          refId: i.id,
          refType: i.type as RefType,
        }));
      const batch = await fetchReactionsBatch(reactRefs, user?.id ?? null);
      setReactionMap(batch);

      if (items.length === 0) {
        setFetchError(
          'Aucun contenu trouvé. Publie un post, vérifie les seeds Supabase, ou tire pour rafraîchir.'
        );
      }
    } catch (e: any) {
      console.error('[feed]', e);
      setFetchError(e?.message || 'Erreur chargement du feed');
      setRawItems([]);
      setReactionMap(new Map());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed('replace');
  }, [fetchFeed]);

  // Reset pagination à chaque changement d’onglet
  useEffect(() => {
    setVisibleCount(FEED_PAGE_SIZE);
  }, [tab]);

  const skillsMatch = (itemSkills: string[] | undefined, userSkills: string[]) => {
    if (!itemSkills?.length || !userSkills.length) return false;
    const u = userSkills.map((s) => s.toLowerCase());
    return itemSkills.some((s) => u.includes(String(s).toLowerCase()));
  };

  const feedItems = useMemo(() => {
    if (tab === 'all') return rawItems;

    if (tab === 'my_teams') {
      if (!myProjectIds.length) return [];
      return rawItems.filter(
        (i) =>
          (i.type === 'project' && myProjectIds.includes(i.id)) ||
          (i.type === 'mission' && i.projectId && myProjectIds.includes(i.projectId)) ||
          (i.type === 'post' && i.projectId && myProjectIds.includes(i.projectId))
      );
    }

    // Pour moi — personnalisé (plus de dump « Tout »)
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    return rawItems.filter((i) => {
      // Events à venir (ou passés récents < 2j)
      if (i.type === 'event') {
        const t = i.created_at || 0;
        // meta1 is display date; prefer starts via created_at sort — keep if recent
        return t > now - week * 2;
      }
      // Posts : mes équipes OU mes propres posts
      if (i.type === 'post') {
        if (i.projectId && myProjectIds.includes(i.projectId)) return true;
        if (meId && i.authorId === meId) return true;
        return false;
      }
      // Contenu de mes projets
      if (i.projectId && myProjectIds.includes(i.projectId)) return true;
      if (i.type === 'project' && myProjectIds.includes(i.id)) return true;
      // Match compétences
      if (skillsMatch(i.skills, mySkills)) {
        if (i.type === 'mission') return i.status === 'open' || !i.status;
        if (i.type === 'project') return true;
      }
      // Missions ouvertes sans skills user : non (trop large)
      return false;
    });
  }, [tab, rawItems, mySkills, myProjectIds, meId]);

  const visibleItems = useMemo(
    () => feedItems.slice(0, visibleCount),
    [feedItems, visibleCount]
  );
  const hasMore = visibleCount < feedItems.length;

  const handleItemPress = (item: FeedItem) => {
    if (item.type === 'project') router.push(`/project/${item.id}`);
    else if (item.type === 'mission') router.push(`/mission/${item.id}`);
    else if (item.type === 'post') router.push(`/post/${item.id}`);
    else if (item.type === 'event') router.push(`/event/${item.id}`);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.turmeric} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      {/* Header : + type Insta (remplace le titre) → menu création, post en principal */}
      <CollapsibleHeader
        title="PIH Pulse"
        visible={headerVisible}
        onCreatePress={() => setCreateOpen(true)}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingTop: headerOffset + 12,
          paddingBottom: listBottom,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchFeed('refresh')}
            tintColor={colors.turmeric}
            colors={[colors.turmeric]}
          />
        }
      >
        <View className="flex-row gap-2 mb-4">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                style={{
                  backgroundColor: active ? colors.turmeric : colors.card,
                  borderColor: active ? colors.turmeric : colors.border,
                }}
                className="flex-1 py-2.5 rounded-full border items-center"
              >
                <Text
                  style={{ color: active ? colors.onTurmeric : colors.textSecondary }}
                  className="font-inter text-[11px] font-bold"
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {fetchError && rawItems.length === 0 ? (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-5 mb-3"
          >
            <Text style={{ color: colors.text }} className="font-space text-sm font-bold mb-1">
              Feed indisponible
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-xs leading-5">
              {fetchError}
            </Text>
          </View>
        ) : null}

        <View className="gap-3">
          {feedItems.length === 0 ? (
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="border rounded-2xl p-6 items-center gap-2"
            >
              <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
                {tab === 'all' ? 'Aucun post pour l’instant' : 'Rien dans cet onglet'}
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="font-inter text-xs text-center leading-5"
              >
                {tab === 'my_teams'
                  ? 'Rejoins un projet pour alimenter « Mes équipes ».'
                  : tab === 'for_you'
                    ? 'Complète tes compétences ou bascule sur « Tout ».'
                    : 'Tire pour rafraîchir. Si le vide persiste, vérifie les seeds Supabase.'}
              </Text>
              {tab !== 'all' ? (
                <Pressable onPress={() => setTab('all')} className="mt-2">
                  <Text style={{ color: colors.textSecondary }} className="font-inter-bold text-xs font-bold">
                    Voir tout le feed
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              {visibleItems.map((item) => {
                const Icon1 = item.icon1;
                const Icon2 = item.icon2;
                let typeColor = colors.turmeric;
                if (item.type === 'mission') typeColor = colors.kaki;
                if (item.type === 'event') typeColor = colors.corail;
                if (item.type === 'post') typeColor = colors.textSecondary;

                const isProject = item.type === 'project';
                const isMission = item.type === 'mission';
                const isPost = item.type === 'post';
                const showIdea =
                  isPost ||
                  (isProject &&
                    (item.status === 'idea' || item.status === 'prototype' || !item.status));
                const canReact = isProject || isMission || isPost;
                const rType: RefType = isProject ? 'project' : isMission ? 'mission' : 'post';
                const rCounts =
                  reactionMap.get(reactionKey(rType, item.id)) || emptyReactionCounts();

                const timeLabel =
                  item.type === 'event' && item.meta1
                    ? item.meta1
                    : formatRelativeTime(item.created_at);

                // role="article" sur web : évite <button> imbriqués (auteur / réactions / media)
                const cardWebProps =
                  Platform.OS === 'web'
                    ? ({ role: 'article' } as Record<string, string>)
                    : {};

                return (
                  <Pressable
                    key={`${item.type}-${item.id}`}
                    onPress={() => handleItemPress(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.tag} ${item.title}`}
                    {...cardWebProps}
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    className="border rounded-2xl px-4 pt-3.5 pb-2 gap-3 active:opacity-95"
                  >
                    <PostAuthorHeader
                      authorName={item.authorName || 'PIH Pulse'}
                      authorId={item.authorId}
                      authorAvatar={item.authorAvatar}
                      subtitle={
                        (item.boosts || 0) > 0
                          ? `${item.subtitle || ''} · ⚡ ${item.boosts}`
                          : item.subtitle
                      }
                      timeLabel={timeLabel}
                      typeLabel={item.tag}
                      typeColor={typeColor}
                    />

                    <View className="gap-1.5">
                      <Text
                        className="font-space text-[16px] font-bold leading-6"
                        style={{ color: colors.text }}
                      >
                        {item.title}
                      </Text>
                      {item.body ? (
                        <Text
                          className="font-inter text-[13px] leading-5"
                          style={{ color: colors.textSecondary }}
                          numberOfLines={isPost ? 5 : 3}
                        >
                          {item.body}
                        </Text>
                      ) : null}
                    </View>

                    {item.media && item.media.length > 0 ? (
                      <View
                        onStartShouldSetResponder={() => true}
                        // empêche le press carte d’avaler le lightbox / play
                      >
                        <MediaCarousel
                          media={item.media}
                          aspectMode="4:5"
                          contentFit="cover"
                          enableLightbox
                        />
                      </View>
                    ) : null}

                    {(Icon1 || Icon2 || item.type === 'event') && (
                      <View className="flex-row gap-3.5 items-center">
                        {Icon1 && item.meta1 ? (
                          <View className="flex-row items-center gap-1.5">
                            <Icon1 size={12} color={colors.textSecondary} strokeWidth={2.2} />
                            <Text
                              className="font-inter text-[11px] font-medium"
                              style={{ color: colors.textSecondary }}
                            >
                              {item.meta1}
                            </Text>
                          </View>
                        ) : null}
                        {Icon2 && item.meta2 ? (
                          <View className="flex-row items-center gap-1.5">
                            <Icon2
                              size={12}
                              color={isMission ? colors.turmeric : colors.textSecondary}
                              strokeWidth={2.2}
                            />
                            <Text
                              className="font-inter text-[11px] font-medium"
                              style={{
                                color: isMission ? colors.turmeric : colors.textSecondary,
                              }}
                            >
                              {item.meta2}
                            </Text>
                          </View>
                        ) : null}
                        <View className="flex-1" />
                        <View className="flex-row items-center gap-0.5">
                          <Text
                            className="font-inter text-[11px] font-semibold"
                            style={{ color: colors.textSecondary }}
                          >
                            {item.ctaText || (item.type === 'event' ? 'Voir' : 'Ouvrir')}
                          </Text>
                          <ChevronRight size={13} color={colors.textSecondary} strokeWidth={2.2} />
                        </View>
                      </View>
                    )}

                    {canReact && !String(item.id).startsWith('evt') && (
                      <View
                        className="pt-1 flex-row items-center gap-2"
                        style={{ borderTopWidth: 1, borderTopColor: colors.border + '99' }}
                        onStartShouldSetResponder={() => true}
                      >
                        <ReplyCountBadge count={item.replyCount} />
                        <View className="flex-1">
                          <ReactionBar
                            refId={item.id}
                            refType={rType}
                            showIdea={showIdea}
                            initialCounts={rCounts}
                          />
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
              {hasMore ? (
                <Pressable
                  onPress={() => setVisibleCount((v) => v + FEED_PAGE_SIZE)}
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  className="border rounded-2xl py-3.5 items-center active:opacity-85"
                >
                  <Text style={{ color: colors.text }} className="font-inter text-xs font-bold">
                    Charger plus · {feedItems.length - visibleCount} restants
                  </Text>
                </Pressable>
              ) : feedItems.length > FEED_PAGE_SIZE ? (
                <Text
                  style={{ color: colors.textSecondary }}
                  className="font-inter text-[10px] text-center py-2"
                >
                  Fin du fil · {feedItems.length} éléments
                </Text>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <CreateHubSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
    </View>
  );
}
