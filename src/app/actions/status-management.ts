'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/supabase/types';
import { revalidatePath } from 'next/cache';

// Draft conflict resolution
export async function checkForDraftConflicts(projectId: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: conflicts } = await supabase
      .from('draft_conflicts')
      .select('*')
      .eq('project_id', projectId)
      .eq('resolved', false);

    return conflicts || [];
  } catch (error) {
    console.error('Error checking draft conflicts:', error);
    throw error;
  }
}

export async function resolveDraftConflict(
  conflictId: string,
  resolution: 'keep' | 'discard'
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: conflict } = await supabase
      .from('draft_conflicts')
      .select('*')
      .eq('id', conflictId)
      .single();

    if (!conflict) throw new Error('Conflict not found');

    if (resolution === 'keep') {
      // Update project with conflict data
      await supabase
        .from('projects')
        .update({ 
          ...conflict.draft_data,
          updated_at: new Date().toISOString()
        })
        .eq('id', conflict.project_id);
    }

    // Mark conflict as resolved
    await supabase
      .from('draft_conflicts')
      .update({
        resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', conflictId);

    revalidatePath(`/projects/${conflict.project_id}`);
    return { success: true };
  } catch (error) {
    console.error('Error resolving draft conflict:', error);
    throw error;
  }
}

// Status change notifications
export async function createStatusNotification(
  projectId: string,
  userId: string,
  title: string,
  message: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    await supabase
      .from('status_notifications')
      .insert({
        project_id: projectId,
        user_id: userId,
        title,
        message
      });

    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    await supabase
      .from('status_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Status change approval workflow
export async function requestStatusChange(
  projectId: string,
  requestedStatus: string,
  reason?: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: project } = await supabase
      .from('projects')
      .select('status, created_by')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    // Create approval request
    await supabase
      .from('status_change_approvals')
      .insert({
        project_id: projectId,
        requested_by: user.id,
        requested_status: requestedStatus,
        current_status: project.status,
        reason
      });

    // Notify project owner
    await createStatusNotification(
      projectId,
      project.created_by,
      'Status Change Request',
      `A request to change project status to ${requestedStatus} is pending approval.`
    );

    return { success: true };
  } catch (error) {
    console.error('Error requesting status change:', error);
    throw error;
  }
}

export async function handleStatusChangeApproval(
  approvalId: string,
  approved: boolean,
  reason?: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: approval } = await supabase
      .from('status_change_approvals')
      .select('*, projects!inner(*)')
      .eq('id', approvalId)
      .single();

    if (!approval) throw new Error('Approval request not found');

    if (approved) {
      // Update project status
      await supabase
        .from('projects')
        .update({ 
          status: approval.requested_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', approval.project_id);

      // Update approval record
      await supabase
        .from('status_change_approvals')
        .update({
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          status: 'approved'
        })
        .eq('id', approvalId);

      // Notify requester
      await createStatusNotification(
        approval.project_id,
        approval.requested_by,
        'Status Change Approved',
        `Your request to change project status to ${approval.requested_status} has been approved.`
      );
    } else {
      // Update approval record as rejected
      await supabase
        .from('status_change_approvals')
        .update({
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          status: 'rejected'
        })
        .eq('id', approvalId);

      // Notify requester
      await createStatusNotification(
        approval.project_id,
        approval.requested_by,
        'Status Change Rejected',
        `Your request to change project status to ${approval.requested_status} has been rejected.${
          reason ? ` Reason: ${reason}` : ''
        }`
      );
    }

    revalidatePath(`/projects/${approval.project_id}`);
    return { success: true };
  } catch (error) {
    console.error('Error handling status change approval:', error);
    throw error;
  }
}

// Status-based content visibility
export async function getVisibleContent(projectId: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: project } = await supabase
      .from('projects')
      .select(`
        *,
        project_steps (
          *,
          project_resources (*)
        ),
        project_resources (*)
      `)
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    // Check if user is owner
    const isOwner = project.created_by === user.id;

    // Apply visibility rules based on status
    if (!isOwner && project.status !== 'published') {
      throw new Error('Project not available');
    }

    // Filter content based on status and user role
    const visibleContent = {
      ...project,
      project_steps: project.project_steps.map(step => ({
        ...step,
        // Only show resources for published projects or to owner
        project_resources: project.status === 'published' || isOwner 
          ? step.project_resources 
          : []
      })),
      // Only show resources for published projects or to owner
      project_resources: project.status === 'published' || isOwner
        ? project.project_resources
        : []
    };

    return visibleContent;
  } catch (error) {
    console.error('Error getting visible content:', error);
    throw error;
  }
} 