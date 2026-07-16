/**
 * Invitations projet — lead invite → talent accepte / refuse.
 */
import { notifyUser } from './activity';
import { IMPACT_POINTS } from './impact';
import { supabase } from './supabase';

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export interface ProjectInvite {
  id: string;
  project_id: string;
  invitee_id: string;
  inviter_id: string;
  status: InviteStatus;
  created_at: string;
  project?: { id: string; name: string } | null;
  inviter?: { id: string; full_name: string | null } | null;
}

/** Lead invite un talent */
export async function sendProjectInvite(params: {
  projectId: string;
  projectName: string;
  inviteeId: string;
  inviterId: string;
}): Promise<{ error?: string; inviteId?: string }> {
  const { projectId, projectName, inviteeId, inviterId } = params;
  if (inviteeId === inviterId) return { error: 'Tu ne peux pas t’inviter toi-même.' };

  // Déjà membre ?
  const { data: existing } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', inviteeId)
    .maybeSingle();
  if (existing) return { error: 'Cette personne est déjà dans le projet.' };

  // Invite pending existante
  const { data: pending } = await supabase
    .from('project_invites')
    .select('id')
    .eq('project_id', projectId)
    .eq('invitee_id', inviteeId)
    .eq('status', 'pending')
    .maybeSingle();
  if (pending) return { error: 'Invitation déjà en attente.' };

  const { data: invite, error } = await supabase
    .from('project_invites')
    .insert({
      project_id: projectId,
      invitee_id: inviteeId,
      inviter_id: inviterId,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    // Table absente → notif seule (soft)
    if (error.message?.includes('project_invites') || error.code === '42P01') {
      await notifyUser({
        userId: inviteeId,
        actorId: inviterId,
        type: 'project_invite',
        title: 'Invitation projet',
        body: `Tu es invité(e) à rejoindre « ${projectName} ».`,
        route: `/project/${projectId}`,
        refId: projectId,
        refType: 'project',
      });
      return { inviteId: 'notif-only' };
    }
    return { error: error.message };
  }

  await notifyUser({
    userId: inviteeId,
    actorId: inviterId,
    type: 'project_invite',
    title: 'Invitation projet',
    body: `Tu es invité(e) à rejoindre « ${projectName} ». Accepte depuis la fiche projet.`,
    route: `/project/${projectId}`,
    refId: projectId,
    refType: 'project',
  });

  return { inviteId: invite.id };
}

export async function getPendingInviteForMe(
  projectId: string,
  userId: string
): Promise<ProjectInvite | null> {
  const { data, error } = await supabase
    .from('project_invites')
    .select(
      `
      id, project_id, invitee_id, inviter_id, status, created_at,
      project:projects(id, name),
      inviter:profiles!inviter_id(id, full_name)
    `
    )
    .eq('project_id', projectId)
    .eq('invitee_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}

export async function respondProjectInvite(params: {
  inviteId: string;
  userId: string;
  accept: boolean;
}): Promise<{ error?: string }> {
  const { inviteId, userId, accept } = params;

  const { data: invite, error: fetchErr } = await supabase
    .from('project_invites')
    .select('id, project_id, invitee_id, inviter_id, status, project:projects(id, name)')
    .eq('id', inviteId)
    .single();

  if (fetchErr || !invite) return { error: 'Invitation introuvable.' };
  if (invite.invitee_id !== userId) return { error: 'Cette invitation ne t’est pas destinée.' };
  if (invite.status !== 'pending') return { error: 'Invitation déjà traitée.' };

  const project = Array.isArray(invite.project) ? invite.project[0] : invite.project;
  const projectName = project?.name || 'le projet';

  if (!accept) {
    const { error } = await supabase
      .from('project_invites')
      .update({ status: 'declined' })
      .eq('id', inviteId);
    if (error) return { error: error.message };

    await notifyUser({
      userId: invite.inviter_id,
      actorId: userId,
      type: 'project_invite',
      title: 'Invitation refusée',
      body: `Invitation déclinée pour « ${projectName} ».`,
      route: `/project/${invite.project_id}`,
      refId: invite.project_id,
      refType: 'project',
    });
    return {};
  }

  // Accept → member + status
  const { error: memErr } = await supabase.from('project_members').upsert(
    {
      project_id: invite.project_id,
      user_id: userId,
      role: 'contributor',
    },
    { onConflict: 'project_id,user_id' }
  );
  if (memErr) return { error: memErr.message };

  const { error: updErr } = await supabase
    .from('project_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId);
  if (updErr) return { error: updErr.message };

  // Impact join (best-effort)
  try {
    await supabase.from('reputation_logs').insert({
      user_id: userId,
      points_changed: IMPACT_POINTS.joinProject,
      reason: `A rejoint le projet « ${projectName} » (invitation)`,
    });
  } catch {
    /* ignore */
  }

  await notifyUser({
    userId: invite.inviter_id,
    actorId: userId,
    type: 'project_joined',
    title: 'Invitation acceptée',
    body: `Quelqu’un a rejoint « ${projectName} ».`,
    route: `/project/${invite.project_id}`,
    refId: invite.project_id,
    refType: 'project',
  });

  return {};
}
