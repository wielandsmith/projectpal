'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/supabase/types';
import { revalidatePath } from 'next/cache';

type VersionMetadata = {
  changedFields: string[];
  resourceChanges?: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  stepChanges?: {
    added: number[];
    removed: number[];
    modified: number[];
  };
};

export async function createVersion(
  projectId: string,
  changes: string,
  isMajorVersion: boolean = false,
  metadata: VersionMetadata
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    // Get current version number
    const { data: latestVersion } = await supabase
      .from('project_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const newVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

    // Get current project state
    const { data: project } = await supabase
      .from('projects')
      .select(`
        *,
        project_steps (*),
        project_resources (*)
      `)
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    // Create new version
    const { data: version, error: versionError } = await supabase
      .from('project_versions')
      .insert({
        project_id: projectId,
        version_number: newVersionNumber,
        changes,
        is_major_version: isMajorVersion,
        metadata,
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // Create snapshot
    const { error: snapshotError } = await supabase
      .from('project_snapshots')
      .insert({
        version_id: version.id,
        project_data: project,
      });

    if (snapshotError) throw snapshotError;

    revalidatePath(`/projects/${projectId}`);
    return { version, versionNumber: newVersionNumber };
  } catch (error) {
    console.error('Error creating version:', error);
    throw error;
  }
}

export async function getVersionHistory(projectId: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: versions, error } = await supabase
      .from('project_versions')
      .select(`
        *,
        project_snapshots (*)
      `)
      .eq('project_id', projectId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return versions;
  } catch (error) {
    console.error('Error getting version history:', error);
    throw error;
  }
}

export async function restoreVersion(projectId: string, versionId: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    // Get snapshot data
    const { data: snapshot } = await supabase
      .from('project_snapshots')
      .select('project_data')
      .eq('version_id', versionId)
      .single();

    if (!snapshot) throw new Error('Version snapshot not found');

    // Restore project data
    const { project_data } = snapshot;
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        title: project_data.title,
        summary: project_data.summary,
        featured_image: project_data.featured_image,
        intro_video_url: project_data.intro_video_url,
        subject: project_data.subject,
        difficulty: project_data.difficulty,
        estimated_duration: project_data.estimated_duration,
        duration_unit: project_data.duration_unit,
        learning_objectives: project_data.learning_objectives,
        prerequisites: project_data.prerequisites,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) throw updateError;

    // Restore steps
    await supabase
      .from('project_steps')
      .delete()
      .eq('project_id', projectId);

    await supabase
      .from('project_steps')
      .insert(
        project_data.project_steps.map((step: any) => ({
          ...step,
          project_id: projectId,
        }))
      );

    // Restore resources
    await supabase
      .from('project_resources')
      .delete()
      .eq('project_id', projectId);

    await supabase
      .from('project_resources')
      .insert(
        project_data.project_resources.map((resource: any) => ({
          ...resource,
          project_id: projectId,
        }))
      );

    // Create new version for the restoration
    await createVersion(
      projectId,
      `Restored to version ${project_data.version_number}`,
      false,
      {
        changedFields: ['all'],
        resourceChanges: {
          added: [],
          removed: [],
          modified: [],
        },
        stepChanges: {
          added: [],
          removed: [],
          modified: [],
        },
      }
    );

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Error restoring version:', error);
    throw error;
  }
}

export async function compareVersions(projectId: string, version1Id: string, version2Id: string) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const [{ data: snapshot1 }, { data: snapshot2 }] = await Promise.all([
      supabase
        .from('project_snapshots')
        .select('project_data')
        .eq('version_id', version1Id)
        .single(),
      supabase
        .from('project_snapshots')
        .select('project_data')
        .eq('version_id', version2Id)
        .single(),
    ]);

    if (!snapshot1 || !snapshot2) throw new Error('Version snapshots not found');

    // Compare the snapshots and return differences
    return {
      fieldChanges: compareFields(snapshot1.project_data, snapshot2.project_data),
      stepChanges: compareSteps(snapshot1.project_data.project_steps, snapshot2.project_data.project_steps),
      resourceChanges: compareResources(snapshot1.project_data.project_resources, snapshot2.project_data.project_resources),
    };
  } catch (error) {
    console.error('Error comparing versions:', error);
    throw error;
  }
}

function compareFields(data1: any, data2: any) {
  const changes: Record<string, { old: any; new: any }> = {};
  const fields = [
    'title',
    'summary',
    'featured_image',
    'intro_video_url',
    'subject',
    'difficulty',
    'estimated_duration',
    'duration_unit',
    'learning_objectives',
    'prerequisites',
  ];

  fields.forEach(field => {
    if (data1[field] !== data2[field]) {
      changes[field] = {
        old: data1[field],
        new: data2[field],
      };
    }
  });

  return changes;
}

function compareSteps(steps1: any[], steps2: any[]) {
  return {
    added: steps2.filter(s2 => !steps1.find(s1 => s1.id === s2.id)),
    removed: steps1.filter(s1 => !steps2.find(s2 => s2.id === s1.id)),
    modified: steps2.filter(s2 => {
      const s1 = steps1.find(s1 => s1.id === s2.id);
      return s1 && JSON.stringify(s1) !== JSON.stringify(s2);
    }),
  };
}

function compareResources(resources1: any[], resources2: any[]) {
  return {
    added: resources2.filter(r2 => !resources1.find(r1 => r1.id === r2.id)),
    removed: resources1.filter(r1 => !resources2.find(r2 => r2.id === r1.id)),
    modified: resources2.filter(r2 => {
      const r1 = resources1.find(r1 => r1.id === r2.id);
      return r1 && JSON.stringify(r1) !== JSON.stringify(r2);
    }),
  };
} 