// Planning Agent — Creates architecture plan for the website
import { aiProvider } from './aiProvider.js';

export const createPlan = async (parsedRequirements, framework = 'html') => {
  const systemPrompt = `You are an architecture planning agent. Given analyzed requirements, create a detailed implementation plan.

Return a JSON object (no markdown, no code blocks) with:
{
  "framework": "${framework}",
  "fileStructure": [
    {"path": "index.html", "purpose": "Main landing page", "sections": ["hero", "features"]}
  ],
  "designSystem": {
    "fontFamily": "Inter, sans-serif",
    "fontUrl": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap",
    "colors": {
      "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "surface": "#hex", "text": "#hex", "textMuted": "#hex"
    },
    "borderRadius": "0.75rem",
    "animations": ["fadeIn", "slideUp", "hover-scale"]
  },
  "sections": [
    {
      "name": "hero",
      "layout": "centered|split|full-width",
      "elements": ["heading", "subheading", "cta-button", "background-gradient"],
      "description": "Full viewport hero with gradient background"
    }
  ],
  "responsiveBreakpoints": ["768px", "1024px", "1280px"],
  "seoMeta": {
    "title": "Page Title", "description": "Meta description", "keywords": ["keyword1", "keyword2"]
  }
}`;

  const result = await aiProvider.generate(`${systemPrompt}\n\nRequirements: ${JSON.stringify(parsedRequirements)}`);
  const text = result.code.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    // Fallback plan
    return {
      framework,
      fileStructure: [{ path: 'index.html', purpose: 'Main page', sections: parsedRequirements.sections || ['hero', 'features'] }],
      designSystem: {
        fontFamily: 'Inter, sans-serif',
        fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
        colors: {
          primary: parsedRequirements.primaryColor || '#3b82f6',
          secondary: parsedRequirements.accentColor || '#8b5cf6',
          accent: '#f59e0b',
          background: parsedRequirements.colorScheme === 'light' ? '#ffffff' : '#0f0f0f',
          surface: parsedRequirements.colorScheme === 'light' ? '#f8f9fa' : '#1a1a2e',
          text: parsedRequirements.colorScheme === 'light' ? '#1a1a1a' : '#ffffff',
          textMuted: parsedRequirements.colorScheme === 'light' ? '#6b7280' : '#9ca3af',
        },
        borderRadius: '0.75rem',
        animations: ['fadeIn', 'slideUp'],
      },
      sections: (parsedRequirements.sections || ['hero', 'features']).map(s => ({
        name: s, layout: 'centered', elements: [], description: s,
      })),
      responsiveBreakpoints: ['768px', '1024px'],
      seoMeta: {
        title: parsedRequirements.seoTitle || 'Website',
        description: parsedRequirements.seoDescription || '',
        keywords: [],
      },
    };
  }
};
