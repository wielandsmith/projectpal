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
type SuggestionType = 'grammar' | 'clarity' | 'engagement' | 'accessibility' | 'safety' | 'improvement';
type FeedbackCategory = 'content_quality' | 'appropriateness' | 'clarity' | 'engagement' | 'technical_accuracy' | 'accessibility';

// AI Content Improvement
export async function generateContentSuggestions(
  contentType: ContentType,
  contentId: string,
  content: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    // Generate suggestions using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an educational content improvement assistant. Analyze the content and suggest improvements for clarity, engagement, and accessibility."
        },
        {
          role: "user",
          content: content
        }
      ],
      functions: [
        {
          name: "provide_content_suggestions",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["grammar", "clarity", "engagement", "accessibility", "safety", "improvement"]
                    },
                    original: { type: "string" },
                    suggested: { type: "string" },
                    confidence: { type: "number" },
                    explanation: { type: "string" }
                  }
                }
              }
            }
          }
        }
      ]
    });

    const suggestions = JSON.parse(response.choices[0].message.function_call?.arguments || '{}');

    // Store suggestions in database
    await Promise.all(
      suggestions.suggestions.map((suggestion: any) =>
        supabase
          .from('ai_content_suggestions')
          .insert({
            content_type: contentType,
            content_id: contentId,
            original_content: suggestion.original,
            suggested_content: suggestion.suggested,
            suggestion_type: suggestion.type,
            confidence_score: suggestion.confidence,
          })
      )
    );

    return suggestions;
  } catch (error) {
    console.error('Error generating content suggestions:', error);
    throw error;
  }
}

// User Feedback Collection
export async function submitFeedback(
  contentType: ContentType,
  contentId: string,
  rating: number,
  category: FeedbackCategory,
  feedbackText?: string
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_feedback')
      .insert({
        content_type: contentType,
        content_id: contentId,
        user_id: user.id,
        rating,
        category,
        feedback_text: feedbackText,
      });

    if (error) throw error;

    // Update analytics
    await updateAnalytics(contentType, {
      feedback_count: 1,
      feedback_score: rating,
    });

    return { success: true };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
}

// Moderation Analytics
async function updateAnalytics(
  contentType: ContentType,
  data: {
    total_content?: number;
    flagged_content?: number;
    approved_content?: number;
    rejected_content?: number;
    review_time?: number;
    appeals?: number;
    successful_appeals?: number;
    ai_suggestions?: number;
    ai_suggestions_applied?: number;
    feedback_count?: number;
    feedback_score?: number;
  }
) {
  const supabase = createServerComponentClient<Database>({ cookies });
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: analytics, error: fetchError } = await supabase
      .from('moderation_analytics')
      .select('*')
      .eq('date', today)
      .eq('content_type', contentType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    const updates: any = {};
    
    if (data.total_content) updates.total_content = (analytics?.total_content || 0) + data.total_content;
    if (data.flagged_content) updates.flagged_content = (analytics?.flagged_content || 0) + data.flagged_content;
    if (data.approved_content) updates.approved_content = (analytics?.approved_content || 0) + data.approved_content;
    if (data.rejected_content) updates.rejected_content = (analytics?.rejected_content || 0) + data.rejected_content;
    if (data.review_time) {
      const totalTime = (analytics?.average_review_time || 0) * (analytics?.total_content || 0) + data.review_time;
      updates.average_review_time = totalTime / ((analytics?.total_content || 0) + 1);
    }
    if (data.appeals) updates.total_appeals = (analytics?.total_appeals || 0) + data.appeals;
    if (data.successful_appeals) updates.successful_appeals = (analytics?.successful_appeals || 0) + data.successful_appeals;
    if (data.ai_suggestions) updates.ai_suggestions_count = (analytics?.ai_suggestions_count || 0) + data.ai_suggestions;
    if (data.ai_suggestions_applied) updates.ai_suggestions_applied = (analytics?.ai_suggestions_applied || 0) + data.ai_suggestions_applied;
    if (data.feedback_score) {
      const totalScore = (analytics?.feedback_score_avg || 0) * (analytics?.total_content || 0) + data.feedback_score;
      updates.feedback_score_avg = totalScore / ((analytics?.total_content || 0) + 1);
    }

    const { error: upsertError } = await supabase
      .from('moderation_analytics')
      .upsert({
        date: today,
        content_type: contentType,
        ...updates,
      });

    if (upsertError) throw upsertError;
  } catch (error) {
    console.error('Error updating analytics:', error);
    throw error;
  }
}

// AI Training Data Collection
export async function collectTrainingData(
  contentType: ContentType,
  originalContent: string,
  moderatedContent: string | null,
  moderationResult: 'approved' | 'rejected' | 'flagged',
  moderatorNotes?: string,
  confidenceScore?: number
) {
  const supabase = createServerComponentClient<Database>({ cookies });

  try {
    const { error } = await supabase
      .from('ai_training_data')
      .insert({
        content_type: contentType,
        original_content: originalContent,
        moderated_content: moderatedContent,
        moderation_result: moderationResult,
        moderator_notes: moderatorNotes,
        confidence_score: confidenceScore,
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error collecting training data:', error);
    throw error;
  }
} 