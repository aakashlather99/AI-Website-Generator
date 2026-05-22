

import { aiProvider } from './aiProvider.js';

export const enhancePrompt = async (userPrompt, framework = 'html') => {
  try {
    // Check if prompt is already detailed (min 50 chars) - skip enhancement if so
    if (userPrompt.length > 100) {
      console.log('📝 Prompt already detailed, skipping enhancement');
      return {
        enhanced: false,
        original: userPrompt,
        expanded: userPrompt,
      };
    }

    console.log('✨ Enhancing minimal prompt...');

    const systemPrompt = `You are a professional web design consultant. The user has provided a minimal project description.
Your task: Expand this into a comprehensive, detailed brief for a website designer.

Include:
1. Project Overview (what, who it's for, main purpose)
2. Key Sections (hero, about, features, testimonials, contact, etc.)
3. Design Style (modern, minimal, bold, corporate, playful)
4. Color Palette (suggest 2-3 colors with purposes)
5. Key Features (forms, galleries, animations, social links, etc.)
6. Call-to-Action (main conversion goal)
7. Target Audience (who visits, what they want)
8. Special Requirements (any unique needs?)

Make it specific, actionable, and inspiring for the code generation.`;

    const prompt = `Framework: ${framework}\n\nUser's brief: "${userPrompt}"\n\nExpand this into a detailed website brief:`;

    const result = await aiProvider.generate(prompt, systemPrompt);
    const expandedPrompt = result.code.trim();

    console.log(`✅ Prompt enhanced: ${userPrompt.length} chars → ${expandedPrompt.length} chars`);

    return {
      enhanced: true,
      original: userPrompt,
      expanded: expandedPrompt,
      provider: result.provider,
    };
  } catch (error) {
    console.error('[PROMPT ENHANCER] Error:', error.message);
    // If enhancement fails, return original prompt
    return {
      enhanced: false,
      original: userPrompt,
      expanded: userPrompt,
      error: error.message,
    };
  }
};

/**
 * Intelligent enhancement - only enhances if needed
 */
export const intelligentEnhance = async (userPrompt, framework = 'html') => {
  // Check prompt length and complexity
  const lines = userPrompt.split('\n').length;
  const avgLineLength = userPrompt.length / lines;
  const hasProperDetail = userPrompt.length > 100 && lines > 2 && avgLineLength > 20;

  if (hasProperDetail) {
    console.log('📋 Prompt has sufficient detail, no enhancement needed');
    return {
      enhanced: false,
      original: userPrompt,
      expanded: userPrompt,
    };
  }

  return enhancePrompt(userPrompt, framework);
};

/**
 * Get enhancement summary for user feedback
 */
export const getEnhancementSummary = (enhancementResult) => {
  if (!enhancementResult.enhanced) {
    return null;
  }

  return {
    originalLength: enhancementResult.original.length,
    expandedLength: enhancementResult.expanded.length,
    expansionRatio: `${Math.round((enhancementResult.expanded.length / enhancementResult.original.length) * 100 / 10) * 10}%`,
    message: `Your brief has been expanded ${Math.round((enhancementResult.expanded.length / enhancementResult.original.length) * 10) / 10}x for richer generation`,
  };
};
