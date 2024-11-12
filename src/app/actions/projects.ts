'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/supabase/types';
import { revalidatePath } from 'next/cache';

type ProjectData = {
  title: string;
  summary: string;
  featuredImage: File | null;
  introVideoUrl: string;
  materials: File[];
  resources: File[];
  lessons: Array<{
    id: string;
    title: string;
    summary: string;
    description: string;
    videoUrl: string;
    imageFile: File | null;
    resources: File[];
    documentation: string;
    estimatedDuration: number;
    durationUnit: 'minutes' | 'hours';
  }>;
  subject: 'math' | 'science' | 'history' | 'geography' | 'reading' | 'art';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  durationUnit: 'minutes' | 'hours' | 'days' | 'weeks';
  learningObjectives: string;
  prerequisites: string;
};

export async function createProject(projectData: ProjectData) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Not authenticated');

    // Start a transaction
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        title: projectData.title,
        summary: projectData.summary,
        featured_image: projectData.featuredImage?.name,
        intro_video_url: projectData.introVideoUrl,
        subject: projectData.subject,
        difficulty: projectData.difficulty,
        estimated_duration: projectData.estimatedDuration,
        duration_unit: projectData.durationUnit,
        learning_objectives: projectData.learningObjectives,
        prerequisites: projectData.prerequisites,
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Insert steps
    const steps = await Promise.all(
      projectData.lessons.map(async (lesson, index) => {
        const { data: step, error: stepError } = await supabase
          .from('project_steps')
          .insert({
            project_id: project.id,
            title: lesson.title,
            summary: lesson.summary,
            description: lesson.description,
            video_url: lesson.videoUrl,
            featured_image: lesson.imageFile?.name,
            documentation: lesson.documentation,
            estimated_duration: lesson.estimatedDuration,
            duration_unit: lesson.durationUnit,
            order_index: index,
          })
          .select()
          .single();

        if (stepError) throw stepError;
        return step;
      })
    );

    // Insert resources
    await Promise.all([
      // Project materials
      ...projectData.materials.map((material: File) => 
        supabase
          .from('project_resources')
          .insert({
            project_id: project.id,
            file_path: material.name,
            file_name: material.name,
            file_type: material.type,
            resource_type: 'material',
          })
      ),
      // Project resources
      ...projectData.resources.map((resource: File) =>
        supabase
          .from('project_resources')
          .insert({
            project_id: project.id,
            file_path: resource.name,
            file_name: resource.name,
            file_type: resource.type,
            resource_type: 'resource',
          })
      ),
      // Step resources
      ...steps.flatMap((step, stepIndex) =>
        projectData.lessons[stepIndex].resources.map((resource: File) =>
          supabase
            .from('project_resources')
            .insert({
              project_id: project.id,
              step_id: step.id,
              file_path: resource.name,
              file_name: resource.name,
              file_type: resource.type,
              resource_type: 'step_resource',
            })
        )
      ),
    ]);

    revalidatePath('/dashboard/parent');
    return { project, steps };
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
} 