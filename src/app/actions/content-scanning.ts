'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/supabase/types';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ContentType = 'project' | 'step' | 'resource' | 'comment';
type ScanType = 'text_analysis' | 'image_analysis' | 'file_scan' | 'link_check' | 'ai_moderation';
type ScanStatus = 'clean' | 'flagged' | 'error';

// Content scanning functions
export async function scanContent(
  contentType: ContentType,
  contentId: string,
  content: any
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    // Get AI moderation settings
    const { data: settings } = await supabase
      .from('ai_moderation_settings')
      .select('*')
      .eq('content_type', contentType)
      .single();

    if (!settings?.enabled) {
      return { status: 'clean' as ScanStatus };
    }

    // Perform different types of scans based on content type
    const scanResults = await Promise.all([
      scanText(content.text),
      content.images?.length > 0 ? scanImages(content.images) : null,
      content.files?.length > 0 ? scanFiles(content.files) : null,
      content.links?.length > 0 ? checkLinks(content.links) : null,
    ]);

    // Aggregate results
    const aggregatedResults = {
      status: 'clean' as ScanStatus,
      confidence_score: 0,
      detected_issues: {},
      scan_metadata: {
        text_analysis: scanResults[0],
        image_analysis: scanResults[1],
        file_scan: scanResults[2],
        link_check: scanResults[3],
      }
    };

    // Calculate overall confidence score
    const validScores = scanResults
      .filter(result => result?.confidence_score !== undefined)
      .map(result => result?.confidence_score);
    
    if (validScores.length > 0) {
      aggregatedResults.confidence_score = validScores.reduce((a, b) => a + b) / validScores.length;
    }

    // Determine if content should be flagged
    if (aggregatedResults.confidence_score > settings.confidence_threshold) {
      aggregatedResults.status = 'flagged';
    }

    // Store scan results
    const { error } = await supabase
      .from('content_scan_results')
      .insert({
        content_type: contentType,
        content_id: contentId,
        scan_type: 'ai_moderation',
        ...aggregatedResults
      });

    if (error) throw error;

    // Auto-moderate based on thresholds
    if (aggregatedResults.confidence_score >= settings.auto_reject_threshold) {
      await moderateContent(contentId, contentType, 'rejected', 'Automated rejection based on scan results');
    } else if (aggregatedResults.confidence_score <= settings.auto_approve_threshold) {
      await moderateContent(contentId, contentType, 'approved', 'Automated approval based on scan results');
    }

    return aggregatedResults;
  } catch (error) {
    console.error('Error scanning content:', error);
    throw error;
  }
}

// Text analysis using AI
async function scanText(text: string) {
  try {
    const response = await openai.moderations.create({
      input: text,
    });

    return {
      confidence_score: response.results[0].category_scores.hate,
      detected_issues: response.results[0].categories,
      flagged: response.results[0].flagged,
    };
  } catch (error) {
    console.error('Error analyzing text:', error);
    return null;
  }
}

// Image analysis
async function scanImages(images: string[]) {
  try {
    const results = await Promise.all(
      images.map(async (image) => {
        const response = await openai.moderations.create({
          input: image,
        });
        return response.results[0];
      })
    );

    return {
      confidence_score: Math.max(...results.map(r => r.category_scores.hate)),
      detected_issues: results.map(r => r.categories),
      flagged: results.some(r => r.flagged),
    };
  } catch (error) {
    console.error('Error analyzing images:', error);
    return null;
  }
}

// File scanning
async function scanFiles(files: any[]) {
  // Implement file scanning logic
  return null;
}

// Link checking
async function checkLinks(links: string[]) {
  // Implement link checking logic
  return null;
}

// Reputation management
export async function updateUserReputation(
  userId: string,
  action: 'contribution' | 'flag' | 'approval' | 'rejection',
  value: number = 1
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: reputation } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!reputation) {
      // Create new reputation record
      await supabase
        .from('user_reputation')
        .insert({
          user_id: userId,
          reputation_score: 0,
          trust_level: 'new',
          total_contributions: 0,
          total_flags: 0,
          total_approved: 0,
          total_rejected: 0,
        });
    }

    // Update reputation based on action
    const updates: any = {
      reputation_score: reputation.reputation_score + value,
    };

    switch (action) {
      case 'contribution':
        updates.total_contributions = reputation.total_contributions + 1;
        break;
      case 'flag':
        updates.total_flags = reputation.total_flags + 1;
        break;
      case 'approval':
        updates.total_approved = reputation.total_approved + 1;
        break;
      case 'rejection':
        updates.total_rejected = reputation.total_rejected + 1;
        break;
    }

    // Update trust level based on reputation score
    updates.trust_level = calculateTrustLevel(updates.reputation_score);

    await supabase
      .from('user_reputation')
      .update(updates)
      .eq('user_id', userId);

    return { success: true };
  } catch (error) {
    console.error('Error updating reputation:', error);
    throw error;
  }
}

function calculateTrustLevel(score: number): string {
  if (score >= 1000) return 'moderator';
  if (score >= 500) return 'trusted';
  if (score >= 100) return 'basic';
  return 'new';
}

// Appeal process
export async function submitAppeal(
  contentType: ContentType,
  contentId: string,
  reason: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('content_appeals')
      .insert({
        content_type: contentType,
        content_id: contentId,
        user_id: user.id,
        reason,
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error submitting appeal:', error);
    throw error;
  }
}

export async function reviewAppeal(
  appealId: string,
  approved: boolean,
  notes?: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: appeal } = await supabase
      .from('content_appeals')
      .select('*')
      .eq('id', appealId)
      .single();

    if (!appeal) throw new Error('Appeal not found');

    // Update appeal status
    await supabase
      .from('content_appeals')
      .update({
        status: approved ? 'approved' : 'rejected',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
      })
      .eq('id', appealId);

    // If approved, update content moderation status
    if (approved) {
      await moderateContent(
        appeal.content_id,
        appeal.content_type,
        'approved',
        'Approved through appeal process'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error reviewing appeal:', error);
    throw error;
  }
} 