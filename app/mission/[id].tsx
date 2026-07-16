import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BadgeCheck,
  CheckCircle,
  Clock,
  FileUp,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReplySection from '../../components/ReplySection';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { formatDeadlineDate, formatDeadlineLabel } from '../../lib/deadline';
import {
  applyToMission,
  approveApplication,
  rejectApplication,
  requestMissionChanges,
  submitDeliverable,
  validateMission,
} from '../../lib/hub';
import { supabase } from '../../lib/supabase';

const LEAD_HINTS = ['founder', 'lead', 'creator'];

function isLeadRole(role: string | null | undefined) {
  const r = (role || '').toLowerCase();
  return LEAD_HINTS.some((h) => r.includes(h));
}

export default function MissionDetailsScreen() {
  const { colors } = useThemeFlavor();
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [mission, setMission] = useState<any>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [isProjectLead, setIsProjectLead] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [myApplication, setMyApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableNote, setDeliverableNote] = useState('');
  const [pitch, setPitch] = useState('');

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
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setMeId(user.id);

      const { data, error } = await supabase
        .from('missions')
        .select(
          '*, projects(id, name, creator_id), assignee:profiles!assignee_id(id, full_name)'
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        showModal('Erreur', error?.message || 'Mission introuvable', 'error');
        return;
      }

      const project = data.projects as any;
      const projectId = project?.id || '';
      const creatorId = project?.creator_id || null;
      const assignee = Array.isArray(data.assignee) ? data.assignee[0] : data.assignee;

      let tasksList = [
        'Prendre connaissance du brief.',
        'Développer et tester la solution.',
        'Soumettre le livrable pour validation.',
      ];
      if (data.description?.includes('\n')) {
        const lines = data.description
          .split('\n')
          .map((l: string) => l.trim().replace(/^-\s*/, ''))
          .filter((l: string) => l.length > 5);
        if (lines.length > 1) tasksList = lines;
      }

      setMission({
        id: data.id,
        title: data.title,
        project: project?.name || 'Projet',
        projectId,
        creatorId,
        reward: `+${data.points_reward} pts`,
        rewardPoints: data.points_reward ?? 50,
        duration: formatDeadlineLabel(data.deadline, 'Sans échéance'),
        deadlineDate: formatDeadlineDate(data.deadline),
        difficultyLabel:
          data.difficulty === 'hard'
            ? 'Difficile'
            : data.difficulty === 'medium'
              ? 'Moyen'
              : 'Facile',
        difficulty: data.difficulty,
        description: data.description || 'Aucune description.',
        tasks: tasksList,
        skills: data.skills_required || [],
        assigneeId: data.assignee_id,
        assigneeName: assignee?.full_name,
        status: data.status,
        deliverableUrl: data.deliverable_url,
        deliverableNote: data.deliverable_note,
        submittedAt: data.submitted_at,
      });

      if (data.deliverable_url) setDeliverableUrl(data.deliverable_url);
      if (data.deliverable_note) setDeliverableNote(data.deliverable_note);

      // Lead?
      let lead = !!(user && creatorId === user.id);
      if (user && projectId && !lead) {
        const { data: membership } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .maybeSingle();
        lead = isLeadRole(membership?.role);
      }
      setIsProjectLead(lead);

      // Applications
      if (user) {
        const { data: apps } = await supabase
          .from('mission_applications')
          .select('*, applicant:profiles!applicant_id(id, full_name)')
          .eq('mission_id', id)
          .order('applied_at', { ascending: false });

        const list = apps || [];
        setApplications(list);
        setMyApplication(list.find((a: any) => a.applicant_id === user.id) || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const run = async (fn: () => Promise<{ error?: string }>, successTitle: string, successMsg: string) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res.error) showModal('Erreur', res.error, 'error');
      else {
        showModal(successTitle, successMsg, 'success');
        await fetchAll();
      }
    } catch {
      showModal('Erreur', 'Une erreur inattendue est survenue.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !mission) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.turmeric} />
      </View>
    );
  }

  const isAssignedToMe = mission.assigneeId === meId;
  const isOpen = mission.status === 'open';
  const isInProgress = mission.status === 'in_progress';
  const isReview = mission.status === 'review';
  const isCompleted = mission.status === 'completed';
  const myPending = myApplication?.status === 'pending';
  const myRejected = myApplication?.status === 'rejected';

  const statusLabel =
    isCompleted
      ? 'Complétée'
      : isReview
        ? 'En revue'
        : isInProgress
          ? 'En cours'
          : isOpen
            ? 'Ouverte'
            : mission.status;

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <View
        style={{ backgroundColor: colors.nav, borderBottomColor: colors.border }}
        className="h-14 flex-row items-center justify-between px-4 border-b"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="w-10 h-10 rounded-full border items-center justify-center"
        >
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <View className="flex-1 px-3 items-center">
          <Text style={{ color: colors.text }} className="font-space text-base font-bold" numberOfLines={1}>
            Mission
          </Text>
          <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]" numberOfLines={1}>
            {mission.project} · {statusLabel}
          </Text>
        </View>
        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-3xl p-5 gap-3 mb-4"
        >
          <Pressable onPress={() => mission.projectId && router.push(`/project/${mission.projectId}`)}>
            <Text
              style={{ color: colors.turmeric }}
              className="font-inter text-[11px] font-bold uppercase tracking-wider"
            >
              {mission.project} →
            </Text>
          </Pressable>
          <Text style={{ color: colors.text }} className="font-space text-[20px] font-bold leading-7">
            {mission.title}
          </Text>
          <View className="flex-row gap-2 flex-wrap">
            <View className="px-2.5 py-1 rounded-full bg-turmeric/15 border border-turmeric/25">
              <Text style={{ color: colors.turmeric }} className="font-inter text-[10px] font-bold">
                {statusLabel}
              </Text>
            </View>
            <View
              style={{ backgroundColor: colors.deep, borderColor: colors.border }}
              className="px-2.5 py-1 rounded-full border"
            >
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] font-bold">
                {mission.difficultyLabel}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-3 mb-4">
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="flex-1 border rounded-2xl p-4 gap-2"
          >
            <Award size={14} color={colors.turmeric} />
            <Text style={{ color: colors.text }} className="font-space text-xl font-bold">
              {mission.reward}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
              Impact récompense
            </Text>
          </View>
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="flex-1 border rounded-2xl p-4 gap-2"
          >
            <Clock size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.text }} className="font-space text-lg font-bold">
              {mission.duration}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
              {mission.deadlineDate ? `Échéance ${mission.deadlineDate}` : 'Échéance'}
            </Text>
          </View>
        </View>

        {mission.skills?.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5 mb-4">
            {mission.skills.map((skill: string) => (
              <View
                key={skill}
                style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                className="border px-2.5 py-1 rounded-full"
              >
                <Text
                  style={{ color: colors.textSecondary }}
                  className="font-inter text-[10px] font-medium"
                >
                  {skill}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {mission.assigneeName ? (
          <Text style={{ color: colors.textSecondary }} className="font-inter text-xs mb-4">
            Assigné : {mission.assigneeName}
          </Text>
        ) : null}

        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-2xl p-4 gap-2 mb-4"
        >
          <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
            Description
          </Text>
          <Text style={{ color: colors.textSecondary }} className="font-inter text-sm leading-6">
            {mission.description}
          </Text>
        </View>

        {/* Livrable affiché si soumis */}
        {(mission.deliverableUrl || isReview || isCompleted) && mission.deliverableUrl ? (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-4 gap-2 mb-4"
          >
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
              Livrable
            </Text>
            <Pressable onPress={() => Linking.openURL(mission.deliverableUrl)}>
              <Text style={{ color: colors.turmeric }} className="font-inter text-sm underline">
                {mission.deliverableUrl}
              </Text>
            </Pressable>
            {mission.deliverableNote ? (
              <Text style={{ color: colors.textSecondary }} className="font-inter text-xs leading-5">
                {mission.deliverableNote}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ── CTA contributeur : postuler ── */}
        {isOpen && !isProjectLead && !myPending && !myRejected && !isAssignedToMe && (
          <View className="gap-3 mb-3">
            <TextInput
              placeholder="Pitch court (optionnel)…"
              placeholderTextColor={colors.textSecondary}
              value={pitch}
              onChangeText={setPitch}
              multiline
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
                minHeight: 72,
              }}
              className="border rounded-xl p-3 font-inter text-sm"
            />
            <Pressable
              disabled={busy}
              onPress={() =>
                run(
                  async () => {
                    if (!meId) return { error: 'Connexion requise' };
                    return applyToMission({
                      missionId: String(id),
                      applicantId: meId,
                      missionTitle: mission.title,
                      projectId: mission.projectId,
                      pitch,
                    });
                  },
                  'Candidature envoyée',
                  'Le lead a été notifié. Tu seras prévenu si ta candidature est acceptée.'
                )
              }
              className="bg-turmeric h-14 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90"
            >
              {busy ? (
                <ActivityIndicator color="#0D0B05" />
              ) : (
                <>
                  <ShieldCheck size={18} color="#0D0B05" strokeWidth={2.5} />
                  <Text className="text-malt-deep font-inter-bold text-base font-bold">
                    Postuler à cette mission
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {myPending && isOpen && (
          <View className="bg-turmeric/10 border border-turmeric/25 h-14 rounded-2xl flex-row justify-center items-center gap-2 mb-3">
            <Clock size={18} color={colors.turmeric} />
            <Text style={{ color: colors.turmeric }} className="font-inter-bold text-sm font-bold">
              Candidature en attente
            </Text>
          </View>
        )}

        {myRejected && isOpen && (
          <View className="bg-corail/10 border border-corail/25 h-14 rounded-2xl flex-row justify-center items-center gap-2 mb-3">
            <XCircle size={18} color="#E8634A" />
            <Text className="text-corail font-inter-bold text-sm font-bold">
              Candidature non retenue
            </Text>
          </View>
        )}

        {/* ── Lead : candidatures ── */}
        {isProjectLead && isOpen && applications.filter((a) => a.status === 'pending').length > 0 && (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-4 gap-3 mb-4"
          >
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
              Candidatures ({applications.filter((a) => a.status === 'pending').length})
            </Text>
            {applications
              .filter((a) => a.status === 'pending')
              .map((app) => {
                const applicant = Array.isArray(app.applicant) ? app.applicant[0] : app.applicant;
                const name = applicant?.full_name || 'Talent';
                return (
                  <View
                    key={app.id}
                    style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                    className="border rounded-xl p-3 gap-2"
                  >
                    <Text style={{ color: colors.text }} className="font-space text-sm font-bold">
                      {name}
                    </Text>
                    {app.pitch ? (
                      <Text style={{ color: colors.textSecondary }} className="font-inter text-xs">
                        {app.pitch}
                      </Text>
                    ) : null}
                    <View className="flex-row gap-2 mt-1">
                      <Pressable
                        disabled={busy}
                        onPress={() =>
                          run(
                            async () => {
                              if (!meId) return { error: 'Erreur' };
                              return approveApplication({
                                applicationId: app.id,
                                missionId: String(id),
                                applicantId: app.applicant_id,
                                missionTitle: mission.title,
                                leadId: meId,
                              });
                            },
                            'Candidat accepté',
                            `${name} est assigné(e) à la mission.`
                          )
                        }
                        className="flex-1 bg-kaki h-10 rounded-xl items-center justify-center"
                      >
                        <Text className="text-malt-deep font-inter-bold text-xs font-bold">
                          Accepter
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        onPress={() =>
                          run(
                            async () => {
                              if (!meId) return { error: 'Erreur' };
                              return rejectApplication({
                                applicationId: app.id,
                                applicantId: app.applicant_id,
                                missionId: String(id),
                                missionTitle: mission.title,
                                leadId: meId,
                              });
                            },
                            'Candidature refusée',
                            'Le talent a été notifié.'
                          )
                        }
                        style={{ borderColor: colors.border, backgroundColor: colors.card }}
                        className="flex-1 border h-10 rounded-xl items-center justify-center"
                      >
                        <Text style={{ color: colors.textSecondary }} className="font-inter-bold text-xs font-bold">
                          Refuser
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {/* ── Contributeur : soumettre livrable ── */}
        {isAssignedToMe && isInProgress && (
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-4 gap-3 mb-4"
          >
            <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold">
              Soumettre le livrable
            </Text>
            <TextInput
              placeholder="Lien GitHub / Figma / Drive…"
              placeholderTextColor={colors.textSecondary}
              value={deliverableUrl}
              onChangeText={setDeliverableUrl}
              autoCapitalize="none"
              style={{
                backgroundColor: colors.deep,
                borderColor: colors.border,
                color: colors.text,
              }}
              className="border rounded-xl px-3 h-12 font-inter text-sm"
            />
            <TextInput
              placeholder="Note pour le lead (optionnel)"
              placeholderTextColor={colors.textSecondary}
              value={deliverableNote}
              onChangeText={setDeliverableNote}
              multiline
              style={{
                backgroundColor: colors.deep,
                borderColor: colors.border,
                color: colors.text,
                minHeight: 64,
              }}
              className="border rounded-xl p-3 font-inter text-sm"
            />
            <Pressable
              disabled={busy}
              onPress={() =>
                run(
                  async () => {
                    if (!meId) return { error: 'Connexion requise' };
                    return submitDeliverable({
                      missionId: String(id),
                      assigneeId: meId,
                      missionTitle: mission.title,
                      projectId: mission.projectId,
                      url: deliverableUrl,
                      note: deliverableNote,
                    });
                  },
                  'Livrable envoyé',
                  'Le lead a été notifié pour validation.'
                )
              }
              className="bg-turmeric h-12 rounded-xl flex-row justify-center items-center gap-2"
            >
              {busy ? (
                <ActivityIndicator color="#0D0B05" />
              ) : (
                <>
                  <FileUp size={16} color="#0D0B05" />
                  <Text className="text-malt-deep font-inter-bold text-sm font-bold">
                    Envoyer pour validation
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {isAssignedToMe && isReview && (
          <View className="bg-turmeric/10 border border-turmeric/25 h-14 rounded-2xl flex-row justify-center items-center gap-2 mb-3">
            <UserCheck size={18} color={colors.turmeric} />
            <Text style={{ color: colors.turmeric }} className="font-inter-bold text-sm font-bold">
              Livrable en attente de validation
            </Text>
          </View>
        )}

        {isCompleted && (
          <View className="bg-kaki/15 border border-kaki/30 h-14 rounded-2xl flex-row justify-center items-center gap-2 mb-3">
            <CheckCircle size={18} color="#7CB87A" />
            <Text className="text-kaki font-inter-bold text-base font-bold">Mission validée</Text>
          </View>
        )}

        {/* ── Lead : valider / corrections ── */}
        {isProjectLead && isReview && mission.assigneeId && (
          <View className="gap-2 mt-2">
            <Pressable
              disabled={busy}
              onPress={() =>
                run(
                  async () => {
                    if (!meId) return { error: 'Erreur' };
                    return validateMission({
                      missionId: String(id),
                      leadId: meId,
                      assigneeId: mission.assigneeId,
                      missionTitle: mission.title,
                      pointsReward: mission.rewardPoints,
                    });
                  },
                  'Mission validée !',
                  `Contributeur : ${mission.reward} + 20 Impact. Toi (lead) : +15 Impact.`
                )
              }
              className="bg-kaki h-14 rounded-2xl flex-row justify-center items-center gap-2"
            >
              {busy ? (
                <ActivityIndicator color="#0D0B05" />
              ) : (
                <>
                  <BadgeCheck size={18} color="#0D0B05" />
                  <Text className="text-malt-deep font-inter-bold text-base font-bold">
                    Valider la mission (+pts)
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() =>
                run(
                  async () => {
                    if (!meId) return { error: 'Erreur' };
                    return requestMissionChanges({
                      missionId: String(id),
                      leadId: meId,
                      assigneeId: mission.assigneeId,
                      missionTitle: mission.title,
                    });
                  },
                  'Corrections demandées',
                  'Le contributeur a été notifié.'
                )
              }
              style={{ borderColor: colors.border, backgroundColor: colors.card }}
              className="border h-12 rounded-2xl flex-row justify-center items-center"
            >
              <Text style={{ color: colors.textSecondary }} className="font-inter-bold text-sm font-bold">
                Demander des corrections
              </Text>
            </Pressable>
          </View>
        )}

        {/* Lead can also validate from in_progress without formal submit */}
        {isProjectLead && isInProgress && mission.assigneeId && (
          <Pressable
            disabled={busy}
            onPress={() =>
              run(
                async () => {
                  if (!meId) return { error: 'Erreur' };
                  return validateMission({
                    missionId: String(id),
                    leadId: meId,
                    assigneeId: mission.assigneeId,
                    missionTitle: mission.title,
                    pointsReward: mission.rewardPoints,
                  });
                },
                'Mission validée !',
                `Contributeur : ${mission.reward} + 20 Impact. Toi (lead) : +15 Impact.`
              )
            }
            className="bg-kaki/90 h-12 rounded-2xl flex-row justify-center items-center gap-2 mt-3"
          >
            <BadgeCheck size={16} color="#0D0B05" />
            <Text className="text-malt-deep font-inter-bold text-sm font-bold">
              Valider sans revue formelle
            </Text>
          </Pressable>
        )}

        {mission?.id ? (
          <View className="mt-4 mb-2">
            <ReplySection refType="mission" refId={String(mission.id || id)} />
          </View>
        ) : null}
      </ScrollView>

      {modalVisible && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center z-50 px-6">
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border p-6 rounded-3xl w-full max-w-sm gap-4 items-center"
          >
            {modalType === 'success' ? (
              <CheckCircle size={28} color="#7CB87A" />
            ) : (
              <AlertTriangle size={28} color={colors.turmeric} />
            )}
            <Text style={{ color: colors.text }} className="font-space text-lg font-bold text-center">
              {modalTitle}
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="font-inter text-xs text-center leading-5"
            >
              {modalMessage}
            </Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              className="bg-turmeric w-full py-3 rounded-xl items-center"
            >
              <Text className="text-malt-deep font-inter-bold text-sm font-bold">Compris</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
