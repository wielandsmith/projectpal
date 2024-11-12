'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/supabase/types';
import { revalidatePath } from 'next/cache';

type ProjectStatus = 'draft' | 'published' | 'archived';

// Add validation rules
const validationRules = {
  draft: {
    required: ['title', 'summary', 'subject'],
    optional: ['featured_image', 'intro_video_url', 'prerequisites'],
  },
  published: {
    required: [
      'title',
      'summary',
      'subject',
      'difficulty',
      'estimated_duration',
      'duration_unit',
      'learning_objectives',
      'project_steps',
      'project_resources'
    ],
    optional: ['featured_image', 'intro_video_url', 'prerequisites'],
    minimumSteps: 1,
    minimumResources: 1,
  },
};

export async function updateProjectStatus(
  projectId: string, 
  status: ProjectStatus,
  reason?: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Not authenticated');

    // Start a transaction
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('status, created_by')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;
    if (!project) throw new Error('Project not found');
    if (project.created_by !== user.id) throw new Error('Not authorized');

    // Record status change
    const { error: historyError } = await supabase
      .from('project_status_history')
      .insert({
        project_id: projectId,
        old_status: project.status,
        new_status: status,
        changed_by: user.id,
        reason: reason || null,
      });

    if (historyError) throw historyError;

    // Update project status
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateError) throw updateError;

    revalidatePath('/dashboard/parent');
    return { success: true };
  } catch (error) {
    console.error('Error updating project status:', error);
    throw error;
  }
}

export async function getProjectStatus(projectId: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('status')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data?.status;
  } catch (error) {
    console.error('Error getting project status:', error);
    throw error;
  }
}

export async function validateProjectForPublishing(projectId: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    // Get project details with related data
    const { data: project, error: projectError } = await supabase
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

    if (projectError) throw projectError;
    if (!project) throw new Error('Project not found');

    const validationErrors: string[] = [];

    // Check required fields
    validationRules.published.required.forEach(field => {
      if (!project[field]) {
        validationErrors.push(`${field.replace('_', ' ')} is required`);
      }
    });

    // Validate steps
    if (!project.project_steps?.length) {
      validationErrors.push('At least one step is required');
    } else {
      project.project_steps.forEach((step, index) => {
        if (!step.title) {
          validationErrors.push(`Step ${index + 1}: Title is required`);
        }
        if (!step.description) {
          validationErrors.push(`Step ${index + 1}: Description is required`);
        }
        if (step.estimated_duration <= 0) {
          validationErrors.push(`Step ${index + 1}: Duration must be greater than 0`);
        }
      });
    }

    // Validate resources
    const hasRequiredResources = project.project_resources?.some(
      resource => resource.resource_type === 'material'
    );
    if (!hasRequiredResources) {
      validationErrors.push('At least one project material is required');
    }

    // Validate content length
    if (project.summary.length < 50) {
      validationErrors.push('Summary should be at least 50 characters');
    }
    if (project.learning_objectives.length < 100) {
      validationErrors.push('Learning objectives should be at least 100 characters');
    }

    // Validate step sequence
    const stepOrderIndexes = project.project_steps?.map(s => s.order_index) || [];
    const hasDuplicateIndexes = new Set(stepOrderIndexes).size !== stepOrderIndexes.length;
    if (hasDuplicateIndexes) {
      validationErrors.push('Step order is invalid');
    }

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    };
  } catch (error) {
    console.error('Error validating project:', error);
    throw error;
  }
}

export async function publishProject(projectId: string) {
  try {
    // Validate project first
    const { isValid, errors } = await validateProjectForPublishing(projectId);
    if (!isValid) {
      return {
        success: false,
        errors
      };
    }

    // Update status to published
    await updateProjectStatus(projectId, 'published');

    return {
      success: true,
      errors: []
    };
  } catch (error) {
    console.error('Error publishing project:', error);
    throw error;
  }
}

export async function archiveProject(projectId: string) {
  try {
    await updateProjectStatus(projectId, 'archived');
    return { success: true };
  } catch (error) {
    console.error('Error archiving project:', error);
    throw error;
  }
}

// Add status change history retrieval
export async function getProjectStatusHistory(projectId: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data, error } = await supabase
      .from('project_status_history')
      .select(`
        *,
        changed_by:profiles!changed_by(username, full_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting status history:', error);
    throw error;
  }
}

// Add automatic draft saving
export async function saveDraft(projectId: string, draftData: any) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { error } = await supabase
      .from('project_drafts')
      .upsert({
        project_id: projectId,
        draft_data: draftData,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
}

// Add status-based access control
export async function checkProjectAccess(
  projectId: string,
  requiredStatus?: ProjectStatus[]
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return false;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('created_by, status')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;
    if (!project) return false;

    // Check if user is owner
    if (project.created_by === user.id) return true;

    // Check if project status matches required status
    if (requiredStatus && !requiredStatus.includes(project.status)) {
      return false;
    }

    // Additional role-based checks can be added here

    return true;
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
} 