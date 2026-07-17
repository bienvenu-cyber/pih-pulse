import React, { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Award,
  CheckCircle,
  ExternalLink,
  Layers,
  Link2,
  Send,
  UserPlus,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PresenceDot, ProfileStatusMeta } from '../../components/ProfileStatus';
import ThemedStackHeader from '../../components/ThemedStackHeader';
import { isUserOnline } from '../../components/ProfileToggles';
import { ScreenSkeleton } from '../../components/ui/ListSkeleton';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { sendProjectInvite } from '../../lib/invites';
import { formatLevelName, getLevelProgress } from '../../lib/reputation';
import { supabase } from '../../lib/supabase';

export default function MemberProfileDetailsScreen() {
  const { colors } = useThemeFlavor();
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [talent, setTalent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [myLeadProjects, setMyLeadProjects] = useState<any[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  const fetchTalentDetails = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setMeId(user.id);
        // Projets où je suis founder/lead (pour inviter)
        const { data: memberships } = await supabase
          .from('project_members')
          .select('role, projects(id, name)')
          .eq('user_id', user.id);
        const leads = (memberships || [])
          .filter((m: any) => {
            const r = (m.role || '').toLowerCase();
            return r.includes('founder') || r.includes('lead') || r.includes('creator');
          })
          .map((m: any) => {
            const p = Array.isArray(m.projects) ? m.projects[0] : m.projects;
            return p;
          })
          .filter(Boolean);

        const { data: owned } = await supabase
          .from('projects')
          .select('id, name')
          .eq('creator_id', user.id);
        const byId = new Map<string, any>();
        [...leads, ...(owned || [])].forEach((p: any) => {
          if (p?.id) byId.set(p.id, p);
        });
        setMyLeadProjects(Array.from(byId.values()));
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          *,
          project_members(project_id, role, projects(id, name, status))
        `
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        setTalent(null);
        return;
      }

      const name = data.full_name || 'Talent';
      const initials =
        name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'T';

      const roleRaw = data.role || 'developer';
      const roleFormatted =
        roleRaw === 'product_creator'
          ? 'Product Owner'
          : roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);

      const projectsList = (data.project_members || [])
        .map((m: any) => {
          const p = Array.isArray(m.projects) ? m.projects[0] : m.projects;
          return p
            ? { id: p.id, name: p.name, status: p.status, role: m.role }
            : null;
        })
        .filter(Boolean);

      const { data: missions } = await supabase
        .from('missions')
        .select('id, title, status, points_reward, projects(name)')
        .eq('assignee_id', data.id)
        .order('created_at', { ascending: false });

      const completed = (missions || []).filter((m: any) => m.status === 'completed');
      const inProgress = (missions || []).filter(
        (m: any) => m.status === 'in_progress' || m.status === 'review'
      );

      const portfolio = data.portfolio || {};
      const portfolioLinks = [
        { key: 'github', label: 'GitHub', url: portfolio.github },
        { key: 'figma', label: 'Figma', url: portfolio.figma },
        { key: 'linkedin', label: 'LinkedIn', url: portfolio.linkedin },
        { key: 'website', label: 'Site', url: portfolio.website },
      ].filter((l) => l.url);

      // Présence publique : opt-in + last_seen < 5 min (heartbeat tabs)
      const online = isUserOnline(data.show_online_presence, data.last_seen_at);

      setTalent({
        id: data.id,
        name,
        username: data.username ? `@${data.username}` : null,
        role: roleFormatted,
        points: data.reputation_points ?? 0,
        skills: data.skills || [],
        initials,
        bio: data.bio || null,
        phone: data.phone || null,
        avatarUrl: data.avatar_url || null,
        available: data.available_for_missions !== false,
        online,
        projects: projectsList,
        completedMissions: completed.map((m: any) => ({
          id: m.id,
          title: m.title,
          reward: `+${m.points_reward} pts`,
          project: (Array.isArray(m.projects) ? m.projects[0] : m.projects)?.name || 'Projet',
        })),
        activeMissions: inProgress.length,
        portfolioLinks,
      });
    } catch (err) {
      console.error(err);
      setTalent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Refresh à chaque focus (badge En ligne à jour)
  useFocusEffect(
    useCallback(() => {
      void fetchTalentDetails();
    }, [fetchTalentDetails])
  );

  const handleContact = () => {
    if (talent?.id) router.push(`/chat/${talent.id}`);
  };

  const handleInvite = async (project: { id: string; name: string }) => {
    if (!meId || !talent?.id) return;
    setInviteBusy(true);
    setInviteMsg('');
    try {
      const res = await sendProjectInvite({
        projectId: project.id,
        projectName: project.name,
        inviteeId: talent.id,
        inviterId: meId,
      });
      if (res.error) {
        setInviteMsg(res.error);
        return;
      }
      setInviteMsg(`Invitation envoyée pour « ${project.name} ».`);
      setTimeout(() => {
        setInviteOpen(false);
        setInviteMsg('');
      }, 900);
    } catch (e: any) {
      setInviteMsg(e?.message || 'Erreur envoi invitation');
    } finally {
      setInviteBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1">
        <ScreenSkeleton variant="profile" />
      </View>
    );
  }

  if (!talent) {
    return (
      <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
        <ThemedStackHeader title="Profil" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: colors.text }} className="font-space text-base font-bold mb-2">
            Profil introuvable
          </Text>
          <Text style={{ color: colors.textSecondary }} className="font-inter text-xs text-center">
            Ce talent n’existe pas ou n’est plus disponible.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSelf = meId === talent.id;
  const level = getLevelProgress(talent.points);
  const canInvite = !isSelf && myLeadProjects.length > 0;

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <ThemedStackHeader title="Profil talent" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero aligné onglet Profil (stamp + dispo + rôle) */}
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-2xl p-4 mb-4 overflow-hidden"
        >
          <View className="flex-row items-start gap-3.5">
            <View className="relative">
              <View
                style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                className="w-[72px] h-[72px] rounded-full border overflow-hidden items-center justify-center"
              >
                {talent.avatarUrl ? (
                  <Image
                    source={{ uri: talent.avatarUrl }}
                    style={{ width: 72, height: 72 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: colors.text }} className="font-space text-2xl font-bold">
                    {talent.initials}
                  </Text>
                )}
              </View>
              <PresenceDot online={talent.online} size={14} borderColor={colors.card} />
            </View>
            <View className="flex-1 min-w-0 gap-0.5">
              <Text
                style={{ color: colors.text }}
                className="font-space text-lg font-bold"
                numberOfLines={1}
              >
                {talent.name}
              </Text>
              {talent.username ? (
                <Text style={{ color: colors.textSecondary }} className="font-inter text-xs">
                  {talent.username}
                </Text>
              ) : null}
              <ProfileStatusMeta
                roleLabel={talent.role}
                available={talent.available}
                online={talent.online}
              />
            </View>
            <View
              style={{
                borderColor: colors.turmeric + '50',
                transform: [{ rotate: '12deg' }],
              }}
              className="mt-1 px-3 py-1.5 rounded-md border"
            >
              <Text
                style={{ color: colors.turmeric, letterSpacing: 1.4 }}
                className="font-space text-[12px] font-bold uppercase"
              >
                {formatLevelName(level.level)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-4">
          <StatCard colors={colors} icon={Award} label="Élan" value={String(talent.points)} />
          <StatCard
            colors={colors}
            icon={Layers}
            label="Projets"
            value={String(talent.projects.length)}
          />
          <StatCard
            colors={colors}
            icon={CheckCircle}
            label="Validées"
            value={String(talent.completedMissions.length)}
          />
        </View>

        {talent.bio ? (
          <Section colors={colors} title="À propos">
            <Text style={{ color: colors.textSecondary }} className="font-inter text-sm leading-6">
              {talent.bio}
            </Text>
          </Section>
        ) : null}

        {talent.skills.length > 0 ? (
          <Section colors={colors} title="Compétences">
            <View className="flex-row flex-wrap gap-1.5">
              {talent.skills.map((skill: string) => (
                <View
                  key={skill}
                  style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  <Text style={{ color: colors.text }} className="font-inter text-xs font-medium">
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {talent.portfolioLinks.length > 0 ? (
          <Section colors={colors} title="Portfolio">
            <View className="gap-2">
              {talent.portfolioLinks.map((l: any) => (
                <Pressable
                  key={l.key}
                  onPress={() =>
                    Linking.openURL(l.url.startsWith('http') ? l.url : `https://${l.url}`)
                  }
                  style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                  className="border rounded-xl px-3 h-11 flex-row items-center justify-between active:opacity-80"
                >
                  <View className="flex-row items-center gap-2">
                    <Link2 size={14} color={colors.turmeric} />
                    <Text style={{ color: colors.text }} className="font-inter text-xs font-bold">
                      {l.label}
                    </Text>
                  </View>
                  <ExternalLink size={12} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          </Section>
        ) : null}

        {talent.projects.length > 0 ? (
          <Section colors={colors} title={`Projets (${talent.projects.length})`}>
            <View className="gap-2">
              {talent.projects.map((p: any) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/project/${p.id}`)}
                  style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                  className="border rounded-xl px-3 py-3 flex-row justify-between items-center"
                >
                  <View className="flex-1 pr-2">
                    <Text style={{ color: colors.text }} className="font-space text-xs font-bold">
                      {p.name}
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                      {p.role || 'Membre'} · {p.status || 'idea'}
                    </Text>
                  </View>
                  <ExternalLink size={12} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          </Section>
        ) : null}

        <Section colors={colors} title="Missions validées">
          {talent.completedMissions.length === 0 ? (
            <Text style={{ color: colors.textSecondary }} className="font-inter text-xs">
              Aucune mission validée pour l’instant.
            </Text>
          ) : (
            <View className="gap-3">
              {talent.completedMissions.map((m: any) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/mission/${m.id}`)}
                  className="flex-row justify-between items-start gap-2"
                >
                  <View className="flex-1">
                    <Text
                      style={{ color: colors.text }}
                      className="font-inter text-xs font-medium leading-4"
                      numberOfLines={2}
                    >
                      {m.title}
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                      {m.project}
                    </Text>
                  </View>
                  <Text style={{ color: colors.turmeric }} className="font-inter text-xs font-bold">
                    {m.reward}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Section>

        {/* CTAs */}
        {!isSelf && (
          <View className="gap-2 mt-2">
            <Pressable
              onPress={handleContact}
              className="bg-turmeric h-12 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90"
            >
              <Send size={16} color="#0D0B05" style={{ transform: [{ rotate: '30deg' }] }} />
              <Text className="text-malt-deep font-inter-bold text-sm font-bold">
                Contacter
              </Text>
            </Pressable>
            {canInvite ? (
              <Pressable
                onPress={() => setInviteOpen(true)}
                style={{ borderColor: colors.border, backgroundColor: colors.card }}
                className="border h-12 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90"
              >
                <UserPlus size={16} color={colors.text} />
                <Text style={{ color: colors.text }} className="font-inter-bold text-sm font-bold">
                  Inviter sur un projet
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Invite modal */}
      <Modal visible={inviteOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-end">
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border-t rounded-t-3xl p-5 gap-3 max-h-[70%]"
          >
            <Text style={{ color: colors.text }} className="font-space text-base font-bold">
              Inviter {talent.name}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-xs mb-1">
              Choisis un projet dont tu es lead. Une notification lui sera envoyée.
            </Text>
            <ScrollView className="max-h-64">
              <View className="gap-2">
                {myLeadProjects.map((p) => (
                  <Pressable
                    key={p.id}
                    disabled={inviteBusy}
                    onPress={() => handleInvite(p)}
                    style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                    className="border rounded-xl px-4 py-3 active:opacity-80"
                  >
                    <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {inviteMsg ? (
              <Text style={{ color: colors.turmeric }} className="font-inter text-xs text-center">
                {inviteMsg}
              </Text>
            ) : null}
            <Pressable
              onPress={() => setInviteOpen(false)}
              className="h-11 items-center justify-center"
            >
              <Text style={{ color: colors.textSecondary }} className="font-inter text-sm font-bold">
                Fermer
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({
  colors,
  icon: Icon,
  label,
  value,
}: {
  colors: any;
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
      className="flex-1 border rounded-2xl p-3 gap-1.5"
    >
      <Icon size={14} color={colors.turmeric} />
      <Text style={{ color: colors.text }} className="font-space text-lg font-bold">
        {value}
      </Text>
      <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
        {label}
      </Text>
    </View>
  );
}

function Section({
  colors,
  title,
  children,
}: {
  colors: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
      className="border rounded-2xl p-4 gap-3 mb-3"
    >
      <Text style={{ color: colors.text }} className="font-space text-[14px] font-bold">
        {title}
      </Text>
      {children}
    </View>
  );
}
