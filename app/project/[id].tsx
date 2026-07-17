import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Layers,
  MapPin,
  Send,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReplySection from '../../components/ReplySection';
import EmptyState from '../../components/ui/EmptyState';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { joinProject, updateProjectStatus } from '../../lib/hub';
import {
  getPendingInviteForMe,
  respondProjectInvite,
  type ProjectInvite,
} from '../../lib/invites';
import { supabase } from '../../lib/supabase';

const STATUS_STEPS = [
  { id: 'idea', label: 'Idée' },
  { id: 'prototype', label: 'Prototype' },
  { id: 'mvp', label: 'MVP' },
  { id: 'scale', label: 'Lancé' },
];

export default function ProjectDetailsScreen() {
  const { colors } = useThemeFlavor();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<ProjectInvite | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  // Custom premium modal alerts
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('success');

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    setLoadError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setMeId(user.id);
      }

      if (!id || (typeof id === 'string' && id.length < 8)) {
        setProject(null);
        setLoadError('Identifiant de projet invalide.');
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          short_description,
          description,
          status,
          skills_needed,
          location,
          roles_needed,
          creator_id,
          creator:profiles!creator_id(id, full_name, role),
          project_members(role, profiles(id, full_name, role)),
          missions(*)
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error(error);
        setProject(null);
        setLoadError(
          error?.code === 'PGRST116'
            ? 'Ce projet n’existe pas ou a été supprimé.'
            : 'Impossible de charger ce projet. Réessaie plus tard.'
        );
        return;
      }

      const teamFormatted = (data.project_members || []).map((m: any) => {
        const memberProfile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles || {};
        const memberName = memberProfile.full_name || 'Collaborateur';
        const memberInitials =
          memberName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'C';

        return {
          id: memberProfile.id,
          name: memberName,
          role: m.role || memberProfile.role || 'Contributeur',
          initials: memberInitials,
        };
      });

      const missionsFormatted = (data.missions || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        reward: `+${m.points_reward} pts`,
        status: m.status,
      }));

      const creator = Array.isArray(data.creator) ? data.creator[0] : data.creator;

      const statusMap: Record<string, string> = {
        idea: 'Idée',
        prototype: 'Prototype',
        mvp: 'MVP',
        scale: 'Lancé',
      };

      setProject({
        id: data.id,
        name: data.name,
        creator: creator?.full_name || 'Inconnu',
        creatorId: data.creator_id || creator?.id,
        creatorRole:
          creator?.role === 'product_creator' ? 'Product Owner' : 'Développeur',
        shortDescription: data.short_description,
        description: data.description || data.short_description,
        status: data.status || 'idea',
        statusLabel: statusMap[data.status] || 'Idée',
        membersCount: `${teamFormatted.length || 1} membre${teamFormatted.length > 1 ? 's' : ''}`,
        location: (data.location || 'Parakou').trim() || 'Parakou',
        skills: data.skills_needed || [],
        rolesNeeded: data.roles_needed || [],
        team: teamFormatted,
        missions: missionsFormatted,
      });

      // Invitation en attente pour moi ?
      if (user) {
        const inv = await getPendingInviteForMe(String(id), user.id);
        setPendingInvite(inv);
      } else {
        setPendingInvite(null);
      }
    } catch (err) {
      console.error(err);
      setProject(null);
      setLoadError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteResponse = async (accept: boolean) => {
    if (!pendingInvite || !meId || inviteBusy) return;
    setInviteBusy(true);
    try {
      const res = await respondProjectInvite({
        inviteId: pendingInvite.id,
        userId: meId,
        accept,
      });
      if (res.error) {
        showModal('Invitation', res.error, 'error');
        return;
      }
      setPendingInvite(null);
      showModal(
        accept ? 'Bienvenue !' : 'Invitation refusée',
        accept
          ? 'Tu as rejoint l’équipe. +20 Élan si applicable.'
          : 'Invitation déclinée.',
        accept ? 'success' : 'info'
      );
      if (accept) void fetchProjectDetails();
    } finally {
      setInviteBusy(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleMissionPress = (missionId: string) => {
    router.push(`/mission/${missionId}`);
  };

  const handleJoinProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showModal('Connexion Requise', 'Veuillez vous connecter pour rejoindre ce projet.', 'info');
        return;
      }

      const isAlreadyMember = project?.team?.some((m: any) => m.id === user.id);
      if (isAlreadyMember) {
        showModal('Déjà membre', 'Vous collaborez déjà sur ce projet !', 'info');
        return;
      }

      setJoining(true);
      const res = await joinProject({
        projectId: String(id),
        userId: user.id,
        projectName: project.name,
        creatorId: project.creatorId,
      });

      if (res.error) {
        showModal('Une erreur est survenue', res.error, 'error');
      } else {
        showModal(
          'Félicitations !',
          'Tu as rejoint l’équipe. +20 Élan. Le lead a été notifié.',
          'success'
        );
        fetchProjectDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!meId || !project || project.creatorId !== meId) return;
    if (newStatus === project.status) return;
    setStatusBusy(true);
    try {
      const res = await updateProjectStatus({
        projectId: String(id),
        leadId: meId,
        projectName: project.name,
        newStatus,
      });
      if (res.error) showModal('Erreur', res.error, 'error');
      else {
        showModal('Statut mis à jour', `Le projet est maintenant en « ${newStatus} ». L’équipe a été notifiée.`, 'success');
        fetchProjectDetails();
      }
    } finally {
      setStatusBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.turmeric} />
      </View>
    );
  }

  // Pas de mock : état honnête si projet introuvable / erreur réseau
  if (!project) {
    return (
      <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
        <View
          style={{ backgroundColor: colors.nav, borderBottomColor: colors.border }}
          className="h-14 flex-row items-center justify-between px-4 border-b"
        >
          <Pressable
            onPress={handleBack}
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="w-10 h-10 rounded-full border items-center justify-center"
          >
            <ArrowLeft size={18} color={colors.text} />
          </Pressable>
          <Text style={{ color: colors.text }} className="font-space text-base font-bold">
            Projet
          </Text>
          <View className="w-10 h-10" />
        </View>
        <View className="flex-1 px-4 pt-8">
          <EmptyState
            icon={Layers}
            title="Projet introuvable"
            description={
              loadError ||
              'Ce projet n’existe pas, a été supprimé, ou n’est pas accessible.'
            }
            actionLabel="Retour"
            onAction={handleBack}
          />
          <Pressable
            onPress={() => {
              setLoading(true);
              void fetchProjectDetails();
            }}
            className="mt-4 items-center py-3 active:opacity-80"
          >
            <Text style={{ color: colors.turmeric }} className="font-inter text-xs font-bold">
              Réessayer
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isMember = project.team?.some((m: any) => m.id === meId);

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <View style={{ backgroundColor: colors.nav, borderBottomColor: colors.border }} className="h-14 flex-row items-center justify-between px-4 border-b">
        <Pressable onPress={handleBack} style={{ backgroundColor: colors.card, borderColor: colors.border }} className="w-10 h-10 rounded-full border items-center justify-center">
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <View className="flex-1 px-3 items-center">
          <Text style={{ color: colors.text }} className="font-space text-base font-bold" numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
            {project.statusLabel} · {project.membersCount}
          </Text>
        </View>
        <View className="w-10 h-10" />
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {pendingInvite ? (
          <View
            style={{
              backgroundColor: colors.turmeric + '14',
              borderColor: colors.turmeric + '55',
            }}
            className="border rounded-2xl p-4 gap-3 mb-4"
          >
            <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
              Invitation à rejoindre
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-xs leading-5">
              Un lead t’invite sur ce projet. Accepte pour devenir membre de l’équipe.
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => handleInviteResponse(false)}
                disabled={inviteBusy}
                style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                className="flex-1 border h-11 rounded-xl items-center justify-center"
              >
                <Text style={{ color: colors.textSecondary }} className="font-inter text-xs font-bold">
                  Refuser
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleInviteResponse(true)}
                disabled={inviteBusy}
                className="flex-1 bg-turmeric h-11 rounded-xl items-center justify-center"
              >
                {inviteBusy ? (
                  <ActivityIndicator color="#0D0B05" />
                ) : (
                  <Text className="text-malt-deep font-inter text-xs font-bold">Accepter</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Hero */}
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-3xl p-5 gap-3 mb-4"
        >
          <View className="flex-row justify-between items-start gap-3">
            <Text style={{ color: colors.text }} className="font-space text-[22px] font-bold flex-1 leading-7">
              {project.name}
            </Text>
            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: colors.turmeric + '18' }}>
              <Text style={{ color: colors.turmeric }} className="font-inter text-[10px] font-bold uppercase">
                {project.statusLabel}
              </Text>
            </View>
          </View>
          {project.shortDescription ? (
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[13px] leading-5">
              {project.shortDescription}
            </Text>
          ) : null}
          <Text style={{ color: colors.textSecondary }} className="font-inter text-xs">
            Par {project.creator}
            {project.creatorId ? (
              <Text
                style={{ color: colors.turmeric }}
                onPress={() => router.push(`/profile/${project.creatorId}`)}
              >
                {' '}· voir profil
              </Text>
            ) : null}
          </Text>
          <View className="flex-row gap-4 items-center">
            <View className="flex-row items-center gap-1.5">
              <Users size={14} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }} className="font-inter text-xs font-medium">{project.membersCount}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }} className="font-inter text-xs font-medium">{project.location}</Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-3xl p-5 gap-3 mb-4">
          <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">À propos</Text>
          <Text style={{ color: colors.textSecondary }} className="font-inter text-sm leading-6">
            {project.description}
          </Text>
        </View>

        {/* Rôles recherchés */}
        {project.rolesNeeded?.length > 0 ? (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-3xl p-5 gap-3 mb-4"
          >
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
              Rôles recherchés
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {project.rolesNeeded.map((role: string) => (
                <View
                  key={role}
                  style={{ backgroundColor: colors.turmeric + '18', borderColor: colors.turmeric + '40' }}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  <Text style={{ color: colors.turmeric }} className="font-inter text-xs font-semibold">
                    {role}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Tech Stack Badges */}
        {project.skills?.length > 0 ? (
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-3xl p-5 gap-3 mb-6">
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">Stack Technique</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {project.skills.map((skill: string) => (
                <View key={skill} style={{ backgroundColor: colors.deep, borderColor: colors.border }} className="px-3 py-1.5 rounded-xl border">
                  <Text style={{ color: colors.text }} className="font-inter text-xs font-medium">{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* L'Équipe */}
        <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-3xl p-5 gap-4 mb-6">
          <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">L'Équipe ({project.team.length})</Text>
          <View className="gap-3">
            {project.team.map((member: any, index: number) => (
              <Pressable 
                key={index} 
                onPress={() => router.push(`/profile/${member.id}`)}
                className="flex-row items-center gap-3 active:opacity-80"
              >
                <View style={{ backgroundColor: colors.deep, borderColor: colors.border }} className="w-10 h-10 rounded-full border items-center justify-center">
                  <Text style={{ color: colors.text }} className="font-space text-xs font-bold">{member.initials}</Text>
                </View>
                <View>
                  <Text style={{ color: colors.text }} className="font-space text-sm font-bold">{member.name}</Text>
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">{member.role}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Missions du projet */}
        {project.missions.length > 0 && (
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-3xl p-5 gap-4 mb-6">
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">Missions en cours</Text>
            <View className="gap-3">
              {project.missions.map((mission: any) => (
                <Pressable 
                  key={mission.id}
                  onPress={() => handleMissionPress(mission.id)}
                  style={{ backgroundColor: colors.deep, borderColor: colors.border }} className="flex-row justify-between items-center border p-4 rounded-2xl active:opacity-95"
                >
                  <View className="flex-1 pr-4 gap-1">
                    <Text style={{ color: colors.text }} className="font-inter text-xs font-semibold leading-5" numberOfLines={1}>
                      {mission.title}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <Target size={11} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] uppercase font-bold">
                        {mission.status === 'open'
                          ? 'Ouverte'
                          : mission.status === 'review'
                            ? 'Revue'
                            : mission.status === 'completed'
                              ? 'Faite'
                              : 'En cours'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-turmeric font-inter-semibold text-xs font-semibold">
                    {mission.reward}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Progression statut (créateur) */}
        {meId && project.creatorId === meId && (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-4 gap-3 mb-6"
          >
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
              Progression du projet
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px] leading-4">
              Faire avancer le statut attribue des points à toute l’équipe et notifie les membres.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {STATUS_STEPS.map((s) => {
                const active = project.status === s.id;
                return (
                  <Pressable
                    key={s.id}
                    disabled={statusBusy}
                    onPress={() => handleStatusChange(s.id)}
                    style={{
                      backgroundColor: active ? colors.turmeric : colors.deep,
                      borderColor: active ? colors.turmeric : colors.border,
                    }}
                    className="px-3 py-2 rounded-full border"
                  >
                    <Text
                      style={{ color: active ? colors.onTurmeric : colors.textSecondary }}
                      className="font-inter text-[11px] font-bold"
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {id && typeof id === 'string' && id.length > 10 ? (
          <View className="mb-4">
            <ReplySection refType="project" refId={String(id)} />
          </View>
        ) : null}

      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={{
          backgroundColor: colors.nav,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        }}
        className="px-4 pt-3 pb-4"
      >
        {isMember ? (
          <View className="flex-row gap-2">
            <View className="flex-1 bg-kaki/15 border border-kaki/30 h-13 min-h-[52px] rounded-2xl flex-row justify-center items-center gap-2">
              <ShieldCheck size={18} color="#7CB87A" strokeWidth={2.5} />
              <Text className="text-kaki font-inter-bold text-sm font-bold">Membre</Text>
            </View>
            <Pressable
              onPress={() => router.push(`/chat/project-${project.id}`)}
              className="bg-turmeric px-5 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90 min-h-[52px]"
            >
              <Send size={16} color="#0D0B05" style={{ transform: [{ rotate: '30deg' }] }} />
              <Text className="text-malt-deep font-inter-bold text-sm font-bold">Chat</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleJoinProject}
            disabled={joining}
            className="bg-turmeric min-h-[52px] rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90"
          >
            {joining ? (
              <ActivityIndicator size="small" color="#0D0B05" />
            ) : (
              <>
                <ShieldCheck size={18} color="#0D0B05" strokeWidth={2.5} />
                <Text className="text-malt-deep font-inter-bold text-base font-bold">
                  Rejoindre · +20 Élan
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Custom Alert Modal */}
      {modalVisible && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center z-50 px-6">
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border p-6 rounded-3xl w-full max-w-sm gap-4 items-center">
            {modalType === 'success' ? (
              <View className="w-12 h-12 rounded-full bg-kaki/15 border border-kaki/30 items-center justify-center">
                <CheckCircle size={24} color="#7CB87A" />
              </View>
            ) : (
              <View className="w-12 h-12 rounded-full bg-turmeric/10 border border-turmeric/30 items-center justify-center">
                <AlertTriangle size={24} color={colors.turmeric} />
              </View>
            )}
            
            <View className="items-center gap-1.5 w-full">
              <Text style={{ color: colors.text }} className="font-space text-lg font-bold text-center">{modalTitle}</Text>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-xs text-center leading-5">{modalMessage}</Text>
            </View>
            
            <Pressable 
              onPress={() => setModalVisible(false)}
              className="bg-turmeric w-full py-3 rounded-xl items-center justify-center active:opacity-90 mt-2"
            >
              <Text className="text-malt-deep font-inter-bold text-sm font-bold">Compris</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
