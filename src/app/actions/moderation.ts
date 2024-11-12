'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/supabase/types';
import { revalidatePath } from 'next/cache';

type ContentType = 'project' | 'step' | 'resource' | 'comment';
type FlagType = 'inappropriate_content' | 'copyright_violation' | 'age_inappropriate' | 'technical_inaccuracy' | 'safety_concern' | 'other';
type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
type WorkflowStepType = 'content_review' | 'resource_check' | 'age_appropriate_check' | 'technical_review' | 'final_approval';

// Content moderation functions
export async function moderateContent(
  projectId: string,
  contentType: ContentType,
  contentId: string,
  status: ModerationStatus,
  flags?: string[],
  reason?: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('content_moderation')
      .insert({
        project_id: projectId,
        content_type: contentType,
        content_id: contentId,
        status,
        moderator_id: user.id,
        moderated_at: new Date().toISOString(),
        flags,
        reason
      });

    if (error) throw error;

    // If content is rejected, create notifications
    if (status === 'rejected') {
      await createNotification(
        projectId,
        'content_rejected',
        {
          contentType,
          contentId,
          reason: reason || 'Content violates guidelines'
        }
      );
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Error moderating content:', error);
    throw error;
  }
}

// Flag content functions
export async function flagContent(
  contentType: ContentType,
  contentId: string,
  flagType: FlagType,
  description?: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('content_flags')
      .insert({
        content_type: contentType,
        content_id: contentId,
        flag_type: flagType,
        flagged_by: user.id,
        description
      });

    if (error) throw error;

    // Notify moderators
    await createNotification(
      contentId,
      'content_flagged',
      {
        contentType,
        flagType,
        description
      },
      'moderator'
    );

    return { success: true };
  } catch (error) {
    console.error('Error flagging content:', error);
    throw error;
  }
}

// Workflow step functions
export async function createWorkflowSteps(approvalId: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  const workflowSteps: Array<{
    step_type: WorkflowStepType;
    approver_role: string;
  }> = [
    { step_type: 'content_review', approver_role: 'moderator' },
    { step_type: 'resource_check', approver_role: 'teacher' },
    { step_type: 'age_appropriate_check', approver_role: 'moderator' },
    { step_type: 'technical_review', approver_role: 'teacher' },
    { step_type: 'final_approval', approver_role: 'admin' }
  ];

  try {
    await Promise.all(
      workflowSteps.map((step, index) =>
        supabase
          .from('approval_workflow_steps')
          .insert({
            approval_id: approvalId,
            step_number: index + 1,
            step_type: step.step_type,
            approver_role: step.approver_role
          })
      )
    );

    return { success: true };
  } catch (error) {
    console.error('Error creating workflow steps:', error);
    throw error;
  }
}

// Notification functions
export async function createNotification(
  targetId: string,
  eventType: string,
  data: any,
  targetRole?: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    // Get notification rules
    const { data: rules } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('event_type', eventType)
      .eq('active', true);

    if (!rules) return;

    // Process each rule
    await Promise.all(
      rules
        .filter(rule => !targetRole || rule.role === targetRole)
        .map(async (rule) => {
          // Get users to notify based on role
          const { data: users } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', rule.role);

          if (!users) return;

          // Create notifications for each user
          return Promise.all(
            users.map(user =>
              supabase
                .from('status_notifications')
                .insert({
                  user_id: user.id,
                  title: eventType,
                  message: processTemplate(rule.template, data)
                })
            )
          );
        })
    );

    return { success: true };
  } catch (error) {
    console.error('Error creating notifications:', error);
    throw error;
  }
}

function processTemplate(template: string, data: any): string {
  return template.replace(
    /\{\{([^}]+)\}\}/g,
    (match, key) => data[key.trim()] || match
  );
} 