/**
 * Boucle hub : candidature → approbation → livrable → validation
 * + progression de statut projet + Impact.
 */
import { notifyUser } from './activity';
import { IMPACT_POINTS } from './impact';
import { supabase } from './supabase';

export type MissionStatus = 'open' | 'in_progress' | 'review' | 'completed' | 'cancelled';

export async function getProjectLeadIds(projectId: string): Promise<string[]> {
  const ids = new Set<string>();
  const { data: project } = await supabase
    .from('projects')
    .select('creator_id')
    .eq('id', projectId)
    .maybeSingle();
  if (project?.creator_id) ids.add(project.creator_id);

  const { data: members } = await supabase
    .from('project_members')
    .select('user_id, role')
    .eq('project_id', projectId);

  (members || []).forEach((m) => {
    const r = (m.role || '').toLowerCase();
    if (r.includes('founder') || r.includes('lead') || r.includes('creator')) {
      ids.add(m.user_id);
    }
  });

  return Array.from(ids);
}

/** Postuler (candidature pending) — ne claim pas tout de suite */
export async function applyToMission(params: {
  missionId: string;
  applicantId: string;
  missionTitle: string;
  projectId: string;
  pitch?: string;
}): Promise<{ error?: string }> {
  const { missionId, applicantId, missionTitle, projectId, pitch } = params;

  const { data: mission } = await supabase
    .from('missions')
    .select('status, assignee_id')
    .eq('id', missionId)
    .single();

  if (!mission || mission.status !== 'open') {
    return { error: 'Cette mission n’est plus ouverte aux candidatures.' };
  }

  const { error } = await supabase.from('mission_applications').upsert(
    {
      mission_id: missionId,
      applicant_id: applicantId,
      status: 'pending',
      pitch: pitch || null,
    },
    { onConflict: 'mission_id,applicant_id' }
  );

  if (error) return { error: error.message };

  const leads = await getProjectLeadIds(projectId);
  await Promise.all(
    leads
      .filter((id) => id !== applicantId)
      .map((leadId) =>
        notifyUser({
          userId: leadId,
          actorId: applicantId,
          type: 'mission_applied',
          title: 'Nouvelle candidature',
          body: `Quelqu’un a postulé à « ${missionTitle} ».`,
          route: `/mission/${missionId}`,
          refId: missionId,
          refType: 'mission',
        })
      )
  );

  return {};
}

/** Lead approuve une candidature → assigne + in_progress */
export async function approveApplication(params: {
  applicationId: string;
  missionId: string;
  applicantId: string;
  missionTitle: string;
  leadId: string;
}): Promise<{ error?: string }> {
  const { applicationId, missionId, applicantId, missionTitle, leadId } = params;

  const { error: appErr } = await supabase
    .from('mission_applications')
    .update({ status: 'approved' })
    .eq('id', applicationId);

  if (appErr) return { error: appErr.message };

  // Reject other pending
  await supabase
    .from('mission_applications')
    .update({ status: 'rejected' })
    .eq('mission_id', missionId)
    .eq('status', 'pending')
    .neq('id', applicationId);

  const { error } = await supabase
    .from('missions')
    .update({ assignee_id: applicantId, status: 'in_progress' })
    .eq('id', missionId)
    .eq('status', 'open');

  if (error) return { error: error.message };

  await supabase.from('reputation_logs').insert({
    user_id: applicantId,
    points_changed: IMPACT_POINTS.applicationAccepted,
    reason: `Candidature acceptée : ${missionTitle}`,
  });

  await notifyUser({
    userId: applicantId,
    actorId: leadId,
    type: 'mission_approved',
    title: 'Candidature acceptée 🎉',
    body: `Tu es assigné(e) sur « ${missionTitle} ». À toi de jouer !`,
    route: `/mission/${missionId}`,
    refId: missionId,
    refType: 'mission',
  });

  return {};
}

export async function rejectApplication(params: {
  applicationId: string;
  applicantId: string;
  missionId: string;
  missionTitle: string;
  leadId: string;
}): Promise<{ error?: string }> {
  const { applicationId, applicantId, missionId, missionTitle, leadId } = params;
  const { error } = await supabase
    .from('mission_applications')
    .update({ status: 'rejected' })
    .eq('id', applicationId);

  if (error) return { error: error.message };

  await notifyUser({
    userId: applicantId,
    actorId: leadId,
    type: 'mission_rejected',
    title: 'Candidature non retenue',
    body: `Ta candidature pour « ${missionTitle} » n’a pas été retenue.`,
    route: `/mission/${missionId}`,
    refId: missionId,
    refType: 'mission',
  });

  return {};
}

/** Contributeur soumet le livrable → review */
export async function submitDeliverable(params: {
  missionId: string;
  assigneeId: string;
  missionTitle: string;
  projectId: string;
  url: string;
  note?: string;
}): Promise<{ error?: string }> {
  const { missionId, assigneeId, missionTitle, projectId, url, note } = params;

  if (!url.trim()) return { error: 'Ajoute un lien de livrable (GitHub, Figma, Drive…).' };

  const { error } = await supabase
    .from('missions')
    .update({
      status: 'review',
      deliverable_url: url.trim(),
      deliverable_note: note?.trim() || null,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', missionId)
    .eq('assignee_id', assigneeId)
    .eq('status', 'in_progress');

  if (error) return { error: error.message };

  const leads = await getProjectLeadIds(projectId);
  await Promise.all(
    leads
      .filter((id) => id !== assigneeId)
      .map((leadId) =>
        notifyUser({
          userId: leadId,
          actorId: assigneeId,
          type: 'mission_submitted',
          title: 'Livrable à valider',
          body: `Livrable soumis pour « ${missionTitle} ».`,
          route: `/mission/${missionId}`,
          refId: missionId,
          refType: 'mission',
        })
      )
  );

  return {};
}

/** Lead valide → completed + points */
export async function validateMission(params: {
  missionId: string;
  leadId: string;
  assigneeId: string;
  missionTitle: string;
  pointsReward: number;
}): Promise<{ error?: string }> {
  const { missionId, leadId, assigneeId, missionTitle, pointsReward } = params;

  const { error } = await supabase
    .from('missions')
    .update({ status: 'completed' })
    .eq('id', missionId)
    .in('status', ['review', 'in_progress']);

  if (error) return { error: error.message };

  const reward = pointsReward || 50;
  const bonus = IMPACT_POINTS.missionValidationBonus;
  const leadPts = IMPACT_POINTS.leadValidatesMission;

  const logs: { user_id: string; points_changed: number; reason: string }[] = [
    {
      user_id: assigneeId,
      points_changed: reward,
      reason: `Mission validée : ${missionTitle}`,
    },
    {
      user_id: assigneeId,
      points_changed: bonus,
      reason: `Bonus validation — ${missionTitle}`,
    },
  ];
  if (leadId !== assigneeId) {
    logs.push({
      user_id: leadId,
      points_changed: leadPts,
      reason: `Lead a validé : ${missionTitle}`,
    });
  }

  await supabase.from('reputation_logs').insert(logs);

  await notifyUser({
    userId: assigneeId,
    actorId: leadId,
    type: 'mission_validated',
    title: 'Mission validée ✅',
    body: `+${reward + bonus} Impact pour « ${missionTitle} ».`,
    route: `/mission/${missionId}`,
    refId: missionId,
    refType: 'mission',
  });

  return {};
}

/** Lead demande des corrections → in_progress */
export async function requestMissionChanges(params: {
  missionId: string;
  leadId: string;
  assigneeId: string;
  missionTitle: string;
}): Promise<{ error?: string }> {
  const { missionId, leadId, assigneeId, missionTitle } = params;

  const { error } = await supabase
    .from('missions')
    .update({ status: 'in_progress' })
    .eq('id', missionId)
    .eq('status', 'review');

  if (error) return { error: error.message };

  await notifyUser({
    userId: assigneeId,
    actorId: leadId,
    type: 'mission_changes',
    title: 'Corrections demandées',
    body: `Le lead a demandé des ajustements sur « ${missionTitle} ».`,
    route: `/mission/${missionId}`,
    refId: missionId,
    refType: 'mission',
  });

  return {};
}

/** Rejoindre un projet + notif créateur */
export async function joinProject(params: {
  projectId: string;
  userId: string;
  projectName: string;
  creatorId: string;
}): Promise<{ error?: string }> {
  const { projectId, userId, projectName, creatorId } = params;

  const { error } = await supabase.from('project_members').insert({
    project_id: projectId,
    user_id: userId,
    role: 'Collaborateur',
  });

  if (error) return { error: error.message };

  await supabase.from('reputation_logs').insert({
    user_id: userId,
    points_changed: IMPACT_POINTS.joinProject,
    reason: `A rejoint le projet : ${projectName}`,
  });

  if (creatorId && creatorId !== userId) {
    await notifyUser({
      userId: creatorId,
      actorId: userId,
      type: 'project_joined',
      title: 'Nouveau membre',
      body: `Quelqu’un a rejoint « ${projectName} ».`,
      route: `/project/${projectId}`,
      refId: projectId,
      refType: 'project',
    });
  }

  return {};
}

/** Lead change le statut du projet → Impact équipe (1× par statut via project_status_rewards) */
export async function updateProjectStatus(params: {
  projectId: string;
  leadId: string;
  projectName: string;
  newStatus: string;
}): Promise<{ error?: string }> {
  const { projectId, leadId, projectName, newStatus } = params;

  const { error } = await supabase
    .from('projects')
    .update({ status: newStatus })
    .eq('id', projectId)
    .eq('creator_id', leadId);

  if (error) return { error: error.message };

  const pts = IMPACT_POINTS.projectStatus[newStatus] || 0;
  if (pts <= 0) return {};

  // Anti-farm : une seule récompense par (projet, statut)
  const { data: already } = await supabase
    .from('project_status_rewards')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', newStatus)
    .maybeSingle();

  if (already) return {};

  const { error: grantErr } = await supabase.from('project_status_rewards').insert({
    project_id: projectId,
    status: newStatus,
    points_awarded: pts,
  });
  if (grantErr) {
    // unique race → déjà attribué
    return {};
  }

  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);

  const memberIds = (members || []).map((m) => m.user_id);
  if (memberIds.length === 0) memberIds.push(leadId);

  await supabase.from('reputation_logs').insert(
    memberIds.map((uid) => ({
      user_id: uid,
      points_changed: pts,
      reason: `Impact projet « ${projectName} » → ${newStatus}`,
    }))
  );

  await Promise.all(
    memberIds
      .filter((uid) => uid !== leadId)
      .map((uid) =>
        notifyUser({
          userId: uid,
          actorId: leadId,
          type: 'project_status',
          title: 'Projet mis à jour',
          body: `« ${projectName} » est passé en ${newStatus}. +${pts} Impact.`,
          route: `/project/${projectId}`,
          refId: projectId,
          refType: 'project',
        })
      )
  );

  return {};
}

/** +Impact création projet (1× à la création) */
export async function grantCreateProjectImpact(
  userId: string,
  projectName: string
): Promise<void> {
  await supabase.from('reputation_logs').insert({
    user_id: userId,
    points_changed: IMPACT_POINTS.createProject,
    reason: `Création du projet : ${projectName}`,
  });
}

/** +Impact création mission */
export async function grantCreateMissionImpact(
  userId: string,
  missionTitle: string
): Promise<void> {
  await supabase.from('reputation_logs').insert({
    user_id: userId,
    points_changed: IMPACT_POINTS.createMission,
    reason: `Création de la mission : ${missionTitle}`,
  });
}

/**
 * +20 Impact si profil complet (1×).
 * Ordre : vérif → log points → flag (évite flag sans crédit).
 */
export async function tryGrantProfileCompleteBonus(userId: string): Promise<boolean> {
  if (!userId) return false;

  const { data: profile, error: fetchErr } = await supabase
    .from('profiles')
    .select('full_name, bio, avatar_url, skills, portfolio, impact_profile_bonus')
    .eq('id', userId)
    .maybeSingle();

  if (fetchErr || !profile) {
    console.warn('[profile-bonus] fetch:', fetchErr?.message);
    return false;
  }
  if (profile.impact_profile_bonus) return false;

  const { isProfileCompleteForBonus } = await import('./impact');
  if (!isProfileCompleteForBonus(profile)) return false;

  // Crédit d’abord (trigger met à jour reputation_points)
  const { error: logErr } = await supabase.from('reputation_logs').insert({
    user_id: userId,
    points_changed: IMPACT_POINTS.profileComplete,
    reason: 'Profil & portfolio complets',
  });
  if (logErr) {
    console.warn('[profile-bonus] reputation_logs:', logErr.message);
    return false;
  }

  // Marque 1× (si race concurrente, unique logique via eq false)
  const { error: flagErr } = await supabase
    .from('profiles')
    .update({ impact_profile_bonus: true })
    .eq('id', userId)
    .eq('impact_profile_bonus', false);

  if (flagErr) {
    console.warn('[profile-bonus] flag:', flagErr.message);
    // Points déjà crédités — on considère le bonus donné
  }

  return true;
}
