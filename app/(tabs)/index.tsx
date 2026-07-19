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
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import ListSkeleton from '../../components/ui/ListSkeleton';
import LoadMoreFooter from '../../components/ui/LoadMoreFooter';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatRelativeTime, formatRoleLabel } from '../../lib/formatTime';
import type { MediaAsset } from '../../lib/media';
import { fetchHubFeedPage, type HubFeedRow } from '../../lib/hubFeed';
import { fetchPostsSafe, postCaption } from '../../lib/posts';
import {
  emptyReactionCounts,
  fetchReactionsBatch,
  reactionKey,
  type ReactionCounts,
  type RefType,
} from '../../lib/reactions';
import { fetchReplyCounts } from '../../lib/replies';
import { FEED_SOURCE_PAGE, FEED_UI_PAGE } from '../../lib/scaleQuery';
import { supabase } from '../../lib/supabase';

/** Pagination UI (slice) — ne pas confondre avec FEED_SOURCE_PAGE (serveur) */
const FEED_PAGE_SIZE = FEED_UI_PAGE;

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
 * Select résilient + pagination serveur (offset/limit).
 * Si colonnes media / jointures absentes → fallback schéma de base.
 */
async function fetchProjectsSafe(offset = 0, limit = FEED_SOURCE_PAGE) {
  const from = Math.max(0, offset);
  const to = from + Math.max(1, limit) - 1;

  const full = await supabase
    .from('projects')
    .select(
      `
      id, name, short_description, status, created_at, creator_id, skills_needed, media, avatar_url, location,
      creator:profiles!creator_id(id, full_name, role, avatar_url)
    `
    )
    .order('created_at', { ascending: false })
    .range(from, to);

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
    .range(from, to);

  if (!basic.error && basic.data) return basic.data;

  const bare = await supabase
    .from('projects')
    .select('id, name, short_description, status, created_at, creator_id, skills_needed, avatar_url')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (bare.error) {
    console.error('[feed] projects bare select failed:', bare.error.message);
    return [];
  }
  return bare.data || [];
}

async function fetchMissionsSafe(offset = 0, limit = FEED_SOURCE_PAGE) {
  const from = Math.max(0, offset);
  const to = from + Math.max(1, limit) - 1;

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
    .range(from, to);

  if (!full.error && full.data) return full.data;

  console.warn('[feed] missions full select failed, fallback:', full.error?.message);

  const basic = await supabase
    .from('missions')
    .select(
      `
      id, title, difficulty, points_reward, created_at, status, skills_required, project_id,
      projects(id, name, creator:profiles!creator_id(id, full_name, role, avatar_url))
    `
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (!basic.error && basic.data) return basic.data;

  const bare = await supabase
    .from('missions')
    .select('id, title, difficulty, points_reward, created_at, status, skills_required, project_id')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (bare.error) {
    console.error('[feed] missions bare select failed:', bare.error.message);
    return [];
  }
  return bare.data || [];
}

function feedItemKey(item: FeedItem): string {
  return `${item.type}:${item.id}`;
}

function sortFeedItems(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => {
    const sa = (a.boosts || 0) * 1e12 + (a.created_at || 0);
    const sb = (b.boosts || 0) * 1e12 + (b.created_at || 0);
    return sb - sa;
  });
}

/** Construit les FeedItem depuis les rows sources (boosts=0 — rempli après batch). */
function buildFeedItemsFromSources(opts: {
  posts: Awaited<ReturnType<typeof fetchPostsSafe>>;
  projects: any[];
  missions: any[];
  events?: any[] | null;
}): FeedItem[] {
  const items: FeedItem[] = [];

  opts.posts.forEach((post) => {
    const author = post.author;
    const projectName = post.project?.name;
    const caption = postCaption(post);
    items.push({
      id: post.id,
      type: 'post',
      tag: 'Post',
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
      boosts: 0,
      projectId: post.project_id || post.project?.id || undefined,
      media: asMediaList(post.media),
    });
  });

  opts.projects.forEach((proj: any) => {
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
      boosts: 0,
      skills: proj.skills_needed || [],
      projectId: proj.id,
      media: asMediaList(proj.media, proj.avatar_url),
    });
  });

  opts.missions.forEach((miss: any) => {
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
      boosts: 0,
      skills: miss.skills_required || [],
      projectId: miss.project_id || project?.id,
      media: asMediaList(miss.media),
    });
  });

  if (opts.events?.length) {
    opts.events.forEach((ev: any) => {
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

  return items;
}

/** Map hub_feed rows → FeedItem (ranking déjà global). */
function mapHubFeedRows(rows: HubFeedRow[]): FeedItem[] {
  return rows.map((row) => {
    const author = row.author;
    const media = Array.isArray(row.media) ? row.media : [];
    const base: FeedItem = {
      id: row.item_id,
      type: row.item_type,
      status: row.status || undefined,
      tag:
        row.item_type === 'post'
          ? 'Post'
          : row.item_type === 'project'
            ? 'Projet'
            : row.item_type === 'mission'
              ? 'Mission'
              : 'Événement',
      title: row.title || 'Sans titre',
      body: row.body || undefined,
      created_at: new Date(row.created_at).getTime(),
      authorId: author?.id || row.author_id,
      authorName: author?.full_name || 'Membre PIH',
      authorRole: author?.role || undefined,
      authorAvatar: author?.avatar_url || null,
      boosts: row.boost_count || 0,
      skills: row.skills || [],
      projectId: row.project_id || undefined,
      media,
    };

    if (row.item_type === 'project') {
      base.meta1 = (row.status || 'idea').toUpperCase();
      base.ctaText = 'Voir';
      base.icon1 = Users;
      base.subtitle = `${formatRoleLabel(author?.role)} · a publié un projet`;
    } else if (row.item_type === 'mission') {
      base.meta2 = row.status || undefined;
      base.ctaText = row.status === 'open' ? 'Postuler' : 'Voir';
      base.icon1 = Clock;
      base.icon2 = Award;
      base.subtitle = row.status || 'mission';
    } else if (row.item_type === 'post') {
      base.ctaText = 'Lire';
      base.subtitle = `${formatRoleLabel(author?.role)} · a publié un post`;
    } else {
      base.icon1 = Calendar;
      base.ctaText = 'Voir';
      base.subtitle = 'Communauté';
    }
    return base;
  });
}

/** Applique boosts + reply counts depuis batch (pas de full scan). */
async function enrichFeedItems(
  items: FeedItem[],
  userId: string | null
): Promise<{ items: FeedItem[]; reactionMap: Map<string, ReactionCounts> }> {
  const reactRefs = items
    .filter((i) => i.type === 'post' || i.type === 'project' || i.type === 'mission')
    .map((i) => ({
      refId: i.id,
      refType: i.type as RefType,
    }));

  const [batch, replyMap] = await Promise.all([
    fetchReactionsBatch(reactRefs, userId),
    fetchReplyCounts([
      { refType: 'post', ids: items.filter((i) => i.type === 'post').map((i) => i.id) },
      { refType: 'project', ids: items.filter((i) => i.type === 'project').map((i) => i.id) },
      { refType: 'mission', ids: items.filter((i) => i.type === 'mission').map((i) => i.id) },
    ]),
  ]);

  const enriched = items.map((item) => {
    const next = { ...item };
    if (item.type === 'post' || item.type === 'project' || item.type === 'mission') {
      const c = batch.get(reactionKey(item.type as RefType, item.id));
      next.boosts = c?.boosts ?? 0;
      next.replyCount = replyMap.get(`${item.type}:${item.id}`) || 0;
    }
    return next;
  });

  return { items: sortFeedItems(enriched), reactionMap: batch };
}

export default function FeedScreen() {
  const [rawItems, setRawItems] = useState<FeedItem[]>([]);
  const [tab, setTab] = useState<FeedTab>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreServer, setHasMoreServer] = useState(true);
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
  const sourceOffsetRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreServerRef = useRef(true);
  const router = useRouter();

  const setHasMoreServerSafe = (v: boolean) => {
    hasMoreServerRef.current = v;
    setHasMoreServer(v);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const y = contentOffset.y;
    if (y <= 10) {
      setHeaderVisible(true);
    } else if (y > lastOffsetY.current + 15) setHeaderVisible(false);
    else if (y < lastOffsetY.current - 15) setHeaderVisible(true);
    lastOffsetY.current = y;

    // Infinite scroll : élargir le slice UI près du bas (page serveur via useEffect)
    const nearBottom = y + layoutMeasurement.height >= contentSize.height - 280;
    if (nearBottom) {
      setVisibleCount((v) => v + FEED_PAGE_SIZE);
    }
  };

  const fetchFeed = useCallback(async (mode: 'replace' | 'refresh' | 'more' = 'replace') => {
    if (mode === 'more') {
      if (!hasMoreServerRef.current || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mode !== 'more') {
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
          setMySkills([]);
          setMyProjectIds([]);
        }
      }

      const offset = mode === 'more' ? sourceOffsetRef.current : 0;

      // S3 : feed unifié hub_feed (ranking global) — fallback multi-sources
      let enriched: FeedItem[] = [];
      let batch: Map<string, ReactionCounts> = new Map();
      let gotRows = false;
      let pageFull = false;

      const unified = await fetchHubFeedPage({
        offset,
        limit: FEED_SOURCE_PAGE,
      });

      if (!unified.error && unified.rows.length > 0) {
        const pageItems = mapHubFeedRows(unified.rows).filter(
          (i) => !(i.type === 'mission' && i.status === 'cancelled')
        );
        const enr = await enrichFeedItems(pageItems, user?.id ?? null);
        // Ranking déjà global côté SQL — ne re-trie pas sauf égalités
        enriched = enr.items;
        batch = enr.reactionMap;
        gotRows = unified.rows.length > 0;
        pageFull = unified.hasMore;
      } else {
        const [projects, missions, posts, eventsRes] = await Promise.all([
          fetchProjectsSafe(offset, FEED_SOURCE_PAGE),
          fetchMissionsSafe(offset, FEED_SOURCE_PAGE),
          fetchPostsSafe(FEED_SOURCE_PAGE, offset),
          mode === 'more'
            ? Promise.resolve({ data: null as any, error: null })
            : supabase
                .from('hub_events')
                .select(
                  'id, title, description, location, starts_at, created_at, created_by, creator:profiles!created_by(id, full_name, role)'
                )
                .order('starts_at', { ascending: true })
                .limit(10),
        ]);

        const pageItems = buildFeedItemsFromSources({
          posts,
          projects: projects as any[],
          missions: missions as any[],
          events: !eventsRes.error && eventsRes.data ? eventsRes.data : null,
        });

        const enr = await enrichFeedItems(pageItems, user?.id ?? null);
        enriched = enr.items;
        batch = enr.reactionMap;
        gotRows =
          projects.length > 0 || missions.length > 0 || posts.length > 0;
        pageFull =
          projects.length >= FEED_SOURCE_PAGE ||
          missions.length >= FEED_SOURCE_PAGE ||
          posts.length >= FEED_SOURCE_PAGE;
      }

      if (mode === 'more') {
        setRawItems((prev) => {
          const seen = new Set(prev.map(feedItemKey));
          const merged = [...prev];
          enriched.forEach((item) => {
            if (!seen.has(feedItemKey(item))) {
              merged.push(item);
              seen.add(feedItemKey(item));
            }
          });
          return sortFeedItems(merged);
        });
        setReactionMap((prev) => {
          const next = new Map(prev);
          batch.forEach((v, k) => next.set(k, v));
          return next;
        });
        sourceOffsetRef.current = offset + FEED_SOURCE_PAGE;
        setHasMoreServerSafe(gotRows && pageFull);
      } else {
        setRawItems(enriched);
        setReactionMap(batch);
        setVisibleCount(FEED_PAGE_SIZE);
        sourceOffsetRef.current = FEED_SOURCE_PAGE;
        setHasMoreServerSafe(gotRows && pageFull);

        if (enriched.length === 0) {
          setFetchError(
            'Aucun contenu trouvé. Publie un post, vérifie les seeds Supabase, ou tire pour rafraîchir.'
          );
        }
      }
    } catch (e: any) {
      console.error('[feed]', e);
      if (mode !== 'more') {
        setFetchError(e?.message || 'Erreur chargement du feed');
        setRawItems([]);
        setReactionMap(new Map());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => {
    void fetchFeed('replace');
  }, [fetchFeed]);

  // Reset slice UI à chaque changement d’onglet
  useEffect(() => {
    setVisibleCount(FEED_PAGE_SIZE);
  }, [tab]);

  // Près de la fin du buffer (ou buffer déjà tout affiché) → page serveur
  useEffect(() => {
    if (loadingMoreRef.current) return;
    if (!hasMoreServerRef.current || rawItems.length === 0) return;
    // Prefetch quand il reste moins d’1 page non affichée
    if (visibleCount < rawItems.length - Math.floor(FEED_PAGE_SIZE / 2)) return;
    void fetchFeed('more');
  }, [visibleCount, rawItems.length, fetchFeed]);

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
  const hasMore = visibleCount < feedItems.length || hasMoreServer;

  const handleItemPress = (item: FeedItem) => {
    if (item.type === 'project') router.push(`/project/${item.id}`);
    else if (item.type === 'mission') router.push(`/mission/${item.id}`);
    else if (item.type === 'post') router.push(`/post/${item.id}`);
    else if (item.type === 'event') router.push(`/event/${item.id}`);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      {/* Header : + type Insta (remplace le titre) → menu création, post en principal */}
      <CollapsibleHeader
        title="PIH Pulse"
        visible={headerVisible}
        onCreatePress={() => setCreateOpen(true)}
      />

      {loading ? (
        <View style={{ paddingTop: headerOffset + 8, paddingHorizontal: 16, flex: 1 }}>
          <ListSkeleton count={4} variant="card" />
        </View>
      ) : null}

      {!loading ? (
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

                // View racine (pas Pressable) → évite <button> imbriqués sur web
                // (auteur, media lightbox, réactions = contrôles séparés)
                return (
                  <View
                    key={`${item.type}-${item.id}`}
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    className="border rounded-2xl px-4 pt-3.5 pb-2 gap-3"
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

                    <Pressable
                      onPress={() => handleItemPress(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.tag} ${item.title}`}
                      className="gap-3 active:opacity-95"
                    >
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
                          {item.type !== 'project' ? (
                            <>
                              <View className="flex-1" />
                              <View className="flex-row items-center gap-0.5">
                                <Text
                                  className="font-inter text-[11px] font-semibold"
                                  style={{ color: colors.textSecondary }}
                                >
                                  {item.ctaText || (item.type === 'event' ? 'Voir' : 'Ouvrir')}
                                </Text>
                                <ChevronRight
                                  size={13}
                                  color={colors.textSecondary}
                                  strokeWidth={2.2}
                                />
                              </View>
                            </>
                          ) : null}
                        </View>
                      )}
                    </Pressable>

                    {item.media && item.media.length > 0 ? (
                      <MediaCarousel
                        media={item.media}
                        aspectMode="4:5"
                        contentFit="cover"
                        enableLightbox
                      />
                    ) : null}

                    {canReact && !String(item.id).startsWith('evt') && (
                      <View
                        className="pt-1 flex-row items-center gap-2"
                        style={{ borderTopWidth: 1, borderTopColor: colors.border + '99' }}
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
                  </View>
                );
              })}
              <LoadMoreFooter
                loading={loadingMore}
                hasMore={hasMore}
              />
            </>
          )}
        </View>
      </ScrollView>
      ) : null}

      <CreateHubSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
    </View>
  );
}
