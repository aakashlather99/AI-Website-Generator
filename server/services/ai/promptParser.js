// Prompt Parser Agent — Analyzes user intent, extracts structure
import { aiProvider } from './aiProvider.js';

export const parsePrompt = async (userPrompt, framework = 'html') => {
  try {
    const systemPrompt = `You are a prompt analysis agent. Analyze the user's website request and extract structured requirements.
Return a JSON object (no markdown, no code blocks) with:
{
  "projectType": "landing|portfolio|ecommerce|dashboard|blog|corporate|restaurant|saas|other",
  "pages": ["index"],
  "sections": ["hero", "features", "pricing", etc.],
  "colorScheme": "dark|light|colorful|minimal",
  "primaryColor": "#hex suggestion",
  "accentColor": "#hex suggestion",
  "features": ["forms", "animations", "charts", "gallery", etc.],
  "industry": "tech|food|fitness|education|etc.",
  "tone": "professional|playful|elegant|bold|minimal",
  "hasBackend": false,
  "hasEcommerce": false,
  "seoTitle": "suggested page title",
  "seoDescription": "meta description",
  "refinedPrompt": "enhanced, detailed version of the user's prompt"
}`;

    const result = await aiProvider.generate(`${systemPrompt}\n\nFramework: ${framework}\nUser prompt: ${userPrompt}`);
    const text = result.code.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.warn('[PROMPT PARSER] JSON parse failed, using fallback:', parseErr.message);
      return getFallbackRequirements(userPrompt);
    }
  } catch (error) {
    console.error('[PROMPT PARSER] Error:', error.message);
    return getFallbackRequirements(userPrompt);
  }
};

const getFallbackRequirements = (userPrompt) => ({
  projectType: 'landing',
  pages: ['index'],
  sections: ['hero', 'features', 'footer'],
  colorScheme: 'dark',
  primaryColor: '#3b82f6',
  accentColor: '#8b5cf6',
  features: ['animations'],
  industry: 'general',
  tone: 'professional',
  hasBackend: false,
  hasEcommerce: false,
  seoTitle: userPrompt.substring(0, 60),
  seoDescription: userPrompt.substring(0, 160),
  refinedPrompt: userPrompt,
});
