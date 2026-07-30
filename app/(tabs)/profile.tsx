import { useFocusEffect, useRouter } from 'expo-router';
import {
  Camera,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  Link2,
  LogOut,
  Palette,
  QrCode,
  Settings2,
  Share2,
  Shield,
  Sparkles,
  TrendingUp,
  UserRound,
} from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import CollapsibleHeader, {
  useCollapsibleHeaderOffset,
  useTabListBottomPadding,
} from '../../components/CollapsibleHeader';
import { PresenceDot, ProfileStatusMeta } from '../../components/ProfileStatus';
import ProfileToggles, {
  isUserOnline,
  type ProfileToggleKey,
  type ProfileToggleState,
} from '../../components/ProfileToggles';
import { GlassCard } from '../../components/ui/Glass';
import { ScreenSkeleton } from '../../components/ui/ListSkeleton';
import SoftSurface from '../../components/ui/SoftSurface';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { tryGrantProfileCompleteBonus } from '../../lib/hub';
import { getProfileCompleteness, IMPACT_POINTS } from '../../lib/impact';
import { pickAndUploadAvatar } from '../../lib/media';
import {
  disablePushNotifications,
  enablePushNotifications,
} from '../../lib/notifications';
import { formatLevelName, getLevelProgress } from '../../lib/reputation';
import { supabase } from '../../lib/supabase';
import { THEME_FLAVOR_LABELS, type ThemeFlavor } from '../../lib/theme';
import QRCode from 'react-native-qrcode-svg';

type MenuItem = {
  key: string;
  label: string;
  subtitle: string;
  icon: any;
  route?: string;
};

type ProfileStats = {
  projects: number;
  missionsDone: number;
  posts: number;
};

type MyProject = {
  id: string;
  name: string;
  status: string;
  role: string;
  isLead: boolean;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [stats, setStats] = useState<ProfileStats>({
    projects: 0,
    missionsDone: 0,
    posts: 0,
  });
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [toggleBusy, setToggleBusy] = useState<ProfileToggleKey | null>(null);
  /** Source de vérité UI des contrôles (indépendante des colonnes DB manquantes) */
  const [toggles, setToggles] = useState<ProfileToggleState>({
    available_for_missions: true,
    show_online_presence: true,
    push_enabled: true,
    reminders_enabled: true,
  });
  const [shareOpen, setShareOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const { flavor: themeFlavor, colors, setFlavor } = useThemeFlavor();
  const headerOffset = useCollapsibleHeaderOffset();
  const listBottom = useTabListBottomPadding();
  const lastOffsetY = useRef(0);
  const router = useRouter();
  /** Évite de re-afficher le skeleton plein écran au simple refocus */
  const hasLoadedOnce = useRef(false);

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

  const fetchProfileData = useCallback(async (mode: 'init' | 'refresh' | 'focus' = 'init') => {
    // Skeleton plein écran uniquement au premier chargement (pas au focus / PTR)
    if (mode === 'init' && !hasLoadedOnce.current) {
      setLoading(true);
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);
      setEmail(user.email || '');

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        // Sync toggles depuis DB (défaut ON si null / colonne absente)
        setToggles({
          available_for_missions: data.available_for_missions !== false,
          show_online_presence: data.show_online_presence !== false,
          // Préférence push seule — pas besoin de token pour afficher ON
          push_enabled: data.push_enabled !== false,
          reminders_enabled: data.reminders_enabled !== false,
        });
        // Crédit +20 si profil désormais complet (1×) puis refresh
        if (!data.impact_profile_bonus) {
          const granted = await tryGrantProfileCompleteBonus(user.id);
          const { data: refreshed } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (refreshed) {
            setProfile(refreshed);
          } else if (granted) {
            setProfile({ ...data, impact_profile_bonus: true });
          }
        }
      }

      const [membershipsRes, mDoneRes, postsRes, ownedRes] = await Promise.all([
        supabase
          .from('project_members')
          .select('role, projects(id, name, status, created_at)')
          .eq('user_id', user.id),
        supabase
          .from('missions')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .eq('status', 'completed'),
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', user.id),
        supabase
          .from('projects')
          .select('id, name, status, created_at')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false })
          .limit(12),
      ]);

      // Projets carousel (membres + owned, dédup, lead en premier)
      const byId = new Map<string, MyProject>();
      (ownedRes.data || []).forEach((p: any) => {
        byId.set(p.id, {
          id: p.id,
          name: p.name,
          status: p.status || 'idea',
          role: 'Lead',
          isLead: true,
        });
      });
      (membershipsRes.data || []).forEach((m: any) => {
        const p = Array.isArray(m.projects) ? m.projects[0] : m.projects;
        if (!p?.id) return;
        const role = (m.role || 'Membre').toString();
        const isLead =
          role.toLowerCase().includes('founder') ||
          role.toLowerCase().includes('lead') ||
          role.toLowerCase().includes('creator');
        const existing = byId.get(p.id);
        if (!existing) {
          byId.set(p.id, {
            id: p.id,
            name: p.name,
            status: p.status || 'idea',
            role,
            isLead,
          });
        } else if (isLead) {
          existing.isLead = true;
          existing.role = role;
        }
      });
      const projectsList = Array.from(byId.values()).sort((a, b) => {
        if (a.isLead !== b.isLead) return a.isLead ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setMyProjects(projectsList);

      setStats({
        projects: projectsList.length,
        missionsDone: mDoneRes.count ?? 0,
        posts: postsRes.count ?? 0,
      });
      hasLoadedOnce.current = true;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfileData('refresh');
  }, [fetchProfileData]);

  useFocusEffect(
    useCallback(() => {
      void fetchProfileData(hasLoadedOnce.current ? 'focus' : 'init');
    }, [fetchProfileData])
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleAvatarUpload = async () => {
    if (!userId) return;
    setAvatarBusy(true);
    try {
      const url = await pickAndUploadAvatar(userId);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      setProfile((p: any) => ({ ...p, avatar_url: url }));
      await tryGrantProfileCompleteBonus(userId);
      await fetchProfileData();
    } catch (e: any) {
      if (e?.message !== 'CANCELLED') console.warn(e?.message || e);
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleToggle = async (key: ProfileToggleKey, next: boolean) => {
    if (!userId) return;
    if (toggleBusy === key) return;

    setToggleBusy(key);
    const prevToggles = { ...toggles };

    // Optimistic UI immédiat
    setToggles((t) => ({ ...t, [key]: next }));
    setProfile((p: any) => (p ? { ...p, [key]: next } : p));

    try {
      if (key === 'push_enabled') {
        if (next) {
          const res = await enablePushNotifications(userId);
          if (!res.ok) {
            setToggles(prevToggles);
            setProfile((p: any) => (p ? { ...p, push_enabled: false } : p));
          } else if (res.token) {
            setProfile((p: any) =>
              p ? { ...p, push_enabled: true, expo_push_token: res.token } : p
            );
          }
        } else {
          const ok = await disablePushNotifications(userId);
          if (!ok) {
            setToggles(prevToggles);
            setProfile((p: any) => (p ? { ...p, push_enabled: true } : p));
          } else {
            setProfile((p: any) =>
              p ? { ...p, push_enabled: false, expo_push_token: null } : p
            );
          }
        }
      } else {
        const payload: Record<string, unknown> = { [key]: next };
        // Activer la présence → marquer actif tout de suite (badge public)
        if (key === 'show_online_presence' && next) {
          payload.last_seen_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', userId);
        if (error) {
          // Colonnes absentes (migration non jouée) : on garde l’état local
          console.warn('[toggles] persist failed, state local only:', error.message);
        } else if (key === 'show_online_presence' && next) {
          setProfile((p: any) =>
            p ? { ...p, last_seen_at: payload.last_seen_at } : p
          );
        }
      }
    } catch (e) {
      console.warn('[toggles]', e);
      setToggles(prevToggles);
    } finally {
      setToggleBusy(null);
    }
  };

  const profileUrl =
    userId && Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/profile/${userId}`
      : userId
        ? `pihpulse://profile/${userId}`
        : '';

  const shareProfile = async () => {
    if (!userId) return;
    try {
      await Share.share({
        message: `Mon profil PIH Pulse — ${name}\n${profileUrl}`,
        title: 'Profil PIH Pulse',
        url: profileUrl,
      });
    } catch {
      setShareOpen(true);
    }
  };

  if (loading) {
    // Même inset que le ScrollView chargé (headerOffset + 12 / px 16)
    // pour éviter le saut / le chevauchement sous le glass header.
    return (
      <View className="flex-1" style={{ backgroundColor: colors.bg }}>
        <CollapsibleHeader title="Profil" visible />
        <View
          style={{
            flex: 1,
            paddingTop: headerOffset + 12,
            paddingHorizontal: 16,
            paddingBottom: listBottom,
          }}
        >
          <ScreenSkeleton variant="profile" padded={false} />
        </View>
      </View>
    );
  }

  const name = profile?.full_name || 'Utilisateur';
  const username = profile?.username ? `@${profile.username}` : '';
  const roleLabel = profile?.role
    ? profile.role === 'product_creator'
      ? 'Product Owner'
      : profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : 'Membre';
  const points = profile?.reputation_points ?? 0;
  const level = getLevelProgress(points);
  const bio = (profile?.bio || '').trim();
  const skills: string[] = profile?.skills || [];
  const completeness = getProfileCompleteness(profile || {});
  // Bannière : seulement si incomplet ET bonus pas encore crédité
  const showCompleteCta = completeness.showCta;
  const available = toggles.available_for_missions;
  const onlineSelf = isUserOnline(
    toggles.show_online_presence,
    profile?.last_seen_at || new Date().toISOString()
  );

  const initials =
    name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const menu: MenuItem[] = [
    {
      key: 'edit',
      label: 'Informations',
      subtitle: 'Nom, bio, téléphone, compétences',
      icon: UserRound,
      route: '/profile/edit',
    },
    {
      key: 'impact',
      label: 'Historique Élan',
      subtitle: `${points} pts · mouvements & niveau`,
      icon: TrendingUp,
      route: '/profile/impact',
    },
    {
      key: 'settings',
      label: 'Préférences',
      subtitle: 'Push, langue',
      icon: Settings2,
      route: '/profile/settings',
    },
    {
      key: 'security',
      label: 'Sécurité',
      subtitle: 'E-mail et mot de passe',
      icon: Shield,
      route: '/profile/security',
    },
    {
      key: 'portfolio',
      label: 'Portfolio',
      subtitle: 'GitHub, Figma, LinkedIn…',
      icon: Link2,
      route: '/profile/portfolio',
    },
  ];

  // Ordre produit : Clair (défaut) · Malt · Sombre (ex-OLED)
  const themes: { id: ThemeFlavor; label: string }[] = [
    { id: 'light', label: THEME_FLAVOR_LABELS.light },
    { id: 'malt', label: THEME_FLAVOR_LABELS.malt },
    { id: 'dark', label: THEME_FLAVOR_LABELS.dark },
  ];

  const statusLabel = (s: string) => {
    if (s === 'mvp') return 'MVP';
    if (s === 'prototype') return 'Prototype';
    if (s === 'scale') return 'Lancé';
    return 'Idée';
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <CollapsibleHeader title="Profil" visible={headerVisible} />

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
            onRefresh={() => void onRefresh()}
            tintColor={colors.turmeric}
            colors={[colors.turmeric]}
          />
        }
      >
        {/* CTA profil incomplet — compact */}
        {showCompleteCta ? (
          <Pressable
            onPress={() => router.push('/profile/edit')}
            style={{
              backgroundColor: colors.turmeric + '12',
              borderColor: colors.turmeric + '40',
            }}
            className="border rounded-xl px-3 py-2 mb-3 flex-row items-center gap-2.5 active:opacity-90"
          >
            <Sparkles size={14} color={colors.turmeric} strokeWidth={2.3} />
            <Text style={{ color: colors.text }} className="font-inter text-[11px] font-semibold flex-1">
              Profil incomplet · +{IMPACT_POINTS.profileComplete} Élan
              {completeness.missingLabels.length
                ? ` · ${completeness.missingLabels.join(', ')}`
                : ''}
            </Text>
            <ChevronRight size={14} color={colors.turmeric} />
          </Pressable>
        ) : null}

        {/* Hero glass — moment premium profil */}
        <View className="mb-3 overflow-hidden rounded-3xl">
        <GlassCard>
        <View className="p-4">
          <View className="flex-row items-start gap-3.5">
            <Pressable onPress={handleAvatarUpload} disabled={avatarBusy} className="relative">
              <View
                style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                className="w-[72px] h-[72px] rounded-full border overflow-hidden items-center justify-center"
              >
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={{ width: 72, height: 72 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: colors.text }} className="font-space text-2xl font-bold">
                    {initials}
                  </Text>
                )}
              </View>
              {/* Présence : point bas-gauche (caméra reste bas-droite) */}
              <PresenceDot online={onlineSelf} size={14} borderColor={colors.card} />
              <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-turmeric items-center justify-center">
                {avatarBusy ? (
                  <ActivityIndicator size={10} color="#0D0B05" />
                ) : (
                  <Camera size={12} color="#0D0B05" />
                )}
              </View>
            </Pressable>

            <View className="flex-1 gap-0.5 min-w-0 pr-1">
              <Text
                style={{ color: colors.text }}
                className="font-space text-lg font-bold"
                numberOfLines={1}
              >
                {name}
              </Text>
              {username ? (
                <Text
                  style={{ color: colors.textSecondary }}
                  className="font-inter text-xs"
                  numberOfLines={1}
                >
                  {username}
                </Text>
              ) : null}
              {/* Rôle + icônes statut (point en ligne déjà sur l’avatar) */}
              <ProfileStatusMeta
                roleLabel={roleLabel}
                available={available}
                online={onlineSelf}
                hideOnlineDot
              />
            </View>

            <Pressable
              onPress={() => router.push('/profile/impact')}
              hitSlop={6}
              style={{
                borderColor: colors.turmeric + '50',
                transform: [{ rotate: '12deg' }],
              }}
              className="mt-1 mr-0.5 px-3 py-1.5 rounded-md border active:opacity-80"
            >
              <Text
                style={{ color: colors.turmeric, letterSpacing: 1.4 }}
                className="font-space text-[12px] font-bold uppercase"
              >
                {formatLevelName(level.level)}
              </Text>
            </Pressable>
          </View>

          <View className="flex-row gap-2 mt-3.5">
            {userId ? (
              <Pressable
                onPress={() => router.push(`/profile/${userId}`)}
                style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                className="flex-1 border rounded-xl h-10 flex-row items-center justify-center gap-1.5 active:opacity-85"
              >
                <ExternalLink size={13} color={colors.turmeric} />
                <Text style={{ color: colors.text }} className="font-inter text-[11px] font-bold">
                  Profil public
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={shareProfile}
              style={{ backgroundColor: colors.deep, borderColor: colors.border }}
              className="w-10 h-10 border rounded-xl items-center justify-center active:opacity-85"
            >
              <Share2 size={15} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => setShareOpen(true)}
              style={{ backgroundColor: colors.deep, borderColor: colors.border }}
              className="w-10 h-10 border rounded-xl items-center justify-center active:opacity-85"
            >
              <QrCode size={15} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Stats principales */}
          <View
            className="flex-row mt-3.5 pt-3"
            style={{ borderTopWidth: 1, borderTopColor: colors.border }}
          >
            {[
              { v: points, l: 'Élan', go: () => router.push('/profile/impact') },
              { v: stats.projects, l: 'projets' },
              { v: stats.missionsDone, l: 'validées' },
              { v: stats.posts, l: 'posts' },
            ].map((s, i) => (
              <Pressable
                key={s.l}
                onPress={s.go}
                className="flex-1 items-center"
                style={i > 0 ? { borderLeftWidth: 1, borderLeftColor: colors.border } : undefined}
              >
                <Text style={{ color: colors.text }} className="font-space text-base font-bold">
                  {s.v}
                </Text>
                <Text
                  style={{ color: s.go ? colors.turmeric : colors.textSecondary }}
                  className="font-inter text-[9px] font-semibold"
                >
                  {s.l}
                </Text>
              </Pressable>
            ))}
          </View>

          {level.nextLevel ? (
            <View className="mt-3 gap-1">
              <View
                style={{ backgroundColor: colors.deep }}
                className="h-1.5 rounded-full overflow-hidden"
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${level.progressPercent}%`,
                    backgroundColor: colors.turmeric,
                  }}
                />
              </View>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                {level.pointsToNext} Élan → {level.nextLevel.name}
              </Text>
            </View>
          ) : null}
        </View>
        </GlassCard>
        </View>

        {/* Bio + skills — solid (métier) */}
        <SoftSurface
          variant="card"
          className="p-4 mb-3 gap-3"
        >
          <View className="flex-row items-center justify-between">
            <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
              À propos
            </Text>
            <Pressable
              onPress={() => router.push('/profile/edit')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Modifier le profil"
            >
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px] font-bold">
                Modifier
              </Text>
            </Pressable>
          </View>
          {bio ? (
            <Text
              style={{ color: colors.textSecondary }}
              className="font-inter text-[13px] leading-5"
              numberOfLines={4}
            >
              {bio}
            </Text>
          ) : (
            <Pressable onPress={() => router.push('/profile/edit')}>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[12px] italic">
                Ajoute une bio pour te présenter au hub…
              </Text>
            </Pressable>
          )}
          {skills.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5">
              {skills.slice(0, 12).map((s) => (
                <View
                  key={s}
                  style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                  className="border px-2.5 py-1 rounded-full"
                >
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="font-inter text-[11px] font-medium"
                  >
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Pressable onPress={() => router.push('/profile/edit')}>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[12px] italic">
                Ajoute des compétences pour le matching
              </Text>
            </Pressable>
          )}
        </SoftSurface>

        {/* Mes projets — carrousel */}
        {myProjects.length > 0 ? (
          <View className="mb-3">
            <Text
              style={{ color: colors.textSecondary }}
              className="font-inter text-[11px] font-bold uppercase tracking-wider mb-2 px-0.5"
            >
              Mes projets
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 8 }}
            >
              {myProjects.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/project/${p.id}`)}
                  className="active:opacity-90"
                >
                  <SoftSurface
                    variant="card"
                    style={{
                      borderColor: p.isLead ? colors.turmeric + '55' : undefined,
                      width: 168,
                    }}
                    className="p-3.5"
                  >
                  <Text
                    style={{ color: colors.text }}
                    className="font-space text-[13px] font-bold"
                    numberOfLines={2}
                  >
                    {p.name}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: colors.deep }}
                    >
                      <Text
                        style={{ color: colors.textSecondary }}
                        className="font-inter text-[9px] font-bold"
                      >
                        {statusLabel(p.status)}
                      </Text>
                    </View>
                    {p.isLead ? (
                      <Text style={{ color: colors.turmeric }} className="font-inter text-[9px] font-bold">
                        Lead
                      </Text>
                    ) : null}
                  </View>
                  </SoftSurface>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Menu (infos, impact, portfolio…) */}
        <SoftSurface
          variant="card"
          className="overflow-hidden mb-3"
        >
          {menu.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.route as any)}
                style={{
                  borderBottomWidth: idx < menu.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
                className="flex-row items-center px-4 py-3.5 gap-3 active:opacity-80"
              >
                <View
                  style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                  className="w-9 h-9 rounded-xl border items-center justify-center"
                >
                  <Icon size={16} color={colors.textSecondary} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
                    {item.label}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
                    {item.subtitle}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textSecondary} />
              </Pressable>
            );
          })}
        </SoftSurface>

        {/* Contrôles — bas de page, fermé par défaut */}
        <ProfileToggles
          values={toggles}
          busyKey={toggleBusy}
          onToggle={handleToggle}
          defaultOpen={false}
        />

        {/* Thème */}
        <SoftSurface
          variant="card"
          className="p-4 mb-4 gap-3"
        >
          <View className="flex-row items-center gap-2">
            <Palette size={15} color={colors.turmeric} />
            <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
              Apparence
            </Text>
          </View>
          <View className="flex-row gap-2">
            {themes.map((t) => {
              const active = themeFlavor === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setFlavor(t.id)}
                  disabled={active}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Thème ${t.label}`}
                  style={{
                    backgroundColor: active ? colors.turmeric : colors.deep,
                    borderColor: active ? colors.turmeric : colors.border,
                  }}
                  className="flex-1 py-2.5 rounded-xl border items-center flex-row justify-center gap-1 active:opacity-85"
                >
                  {active ? <CheckCircle size={12} color={colors.onTurmeric} /> : null}
                  <Text
                    style={{ color: active ? colors.onTurmeric : colors.textSecondary }}
                    className="font-inter text-xs font-bold"
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SoftSurface>

        <SoftSurface
          variant="card"
          className="p-4 mb-4 gap-1"
        >
          <Text
            style={{ color: colors.textSecondary }}
            className="font-inter text-[10px] uppercase font-bold"
          >
            Compte
          </Text>
          <Text style={{ color: colors.text }} className="font-inter text-sm">
            {email || '—'}
          </Text>
          {profile?.phone ? (
            <Text style={{ color: colors.textSecondary }} className="font-inter text-xs mt-0.5">
              {profile.phone}
            </Text>
          ) : null}
        </SoftSurface>

        <Pressable
          onPress={handleLogout}
          className="bg-corail/10 border border-corail/25 h-12 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90"
        >
          <LogOut size={16} color="#E8634A" />
          <Text className="text-corail font-inter-bold text-sm font-bold">Se déconnecter</Text>
        </Pressable>
      </ScrollView>

      {/* QR / partage */}
      <Modal visible={shareOpen} transparent animationType="fade" onRequestClose={() => setShareOpen(false)}>
        <Pressable
          className="flex-1 justify-center px-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onPress={() => setShareOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-3xl p-5 items-center gap-3"
          >
            <Text style={{ color: colors.text }} className="font-space text-base font-bold">
              Partager mon profil
            </Text>
            {profileUrl ? (
              <View
                style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10 }}
                accessibilityLabel="QR code du profil"
              >
                <QRCode
                  value={profileUrl}
                  size={148}
                  backgroundColor="#FFFFFF"
                  color="#0D0B05"
                  ecl="M"
                />
              </View>
            ) : null}
            <Text
              style={{ color: colors.textSecondary }}
              className="font-inter text-[11px] text-center"
              numberOfLines={2}
            >
              {profileUrl}
            </Text>
            <Pressable
              onPress={shareProfile}
              className="bg-turmeric h-11 rounded-xl w-full items-center justify-center flex-row gap-2"
            >
              <Share2 size={16} color="#0D0B05" />
              <Text className="font-inter text-sm font-bold" style={{ color: '#0D0B05' }}>
                Partager
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
