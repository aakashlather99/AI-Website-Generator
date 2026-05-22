// Code Generator Agent — Generates actual website code from plan
import { aiProvider } from './aiProvider.js';

const frameworkPrompts = {
  html: `Generate a COMPLETE, single-file HTML website. Rules:
1. Return ONLY pure HTML starting with <!DOCTYPE html> and ending with </html>
2. ALL CSS inside <style> in <head>
3. ALL JavaScript inside <script> before </body>
4. NO external CSS/JS frameworks (no Bootstrap, jQuery, etc.)
5. Use Google Fonts (include link in head)
6. NO markdown, NO code blocks, NO backticks
7. Include Font Awesome CDN for icons: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css`,

  react: `Generate a COMPLETE React application as a single HTML file with embedded React via CDN. Rules:
1. Use React 18 via CDN (unpkg.com)
2. Use Babel standalone for JSX transformation
3. Include all component code in a single <script type="text/babel"> block
4. Use inline styles or embedded <style> for CSS
5. Return ONLY pure HTML starting with <!DOCTYPE html>
6. NO markdown, NO code blocks, NO backticks`,

  nextjs: `Generate a modern website as a COMPLETE single HTML file that mimics Next.js patterns. Rules:
1. Use clean component-based structure in vanilla JS
2. Implement client-side routing with hash-based navigation
3. Include all CSS in <style> and JS in <script>
4. Return ONLY pure HTML starting with <!DOCTYPE html>
5. NO markdown, NO code blocks, NO backticks`,
};

export const generateCode = async (plan, parsedRequirements, userPrompt, framework = 'html') => {
  const basePrompt = frameworkPrompts[framework] || frameworkPrompts.html;

  const fullPrompt = `${basePrompt}

DESIGN SYSTEM:
- Font: ${plan.designSystem?.fontFamily || 'Inter, sans-serif'}
- Font URL: ${plan.designSystem?.fontUrl || ''}
- Colors: ${JSON.stringify(plan.designSystem?.colors || {})}
- Border Radius: ${plan.designSystem?.borderRadius || '0.75rem'}
- Animations: ${JSON.stringify(plan.designSystem?.animations || [])}

SECTIONS TO BUILD:
${JSON.stringify(plan.sections || [], null, 2)}

SEO:
- Title: ${plan.seoMeta?.title || 'Website'}
- Description: ${plan.seoMeta?.description || ''}

QUALITY REQUIREMENTS:
- Modern, stunning, professional design (NOT generic/bland)
- Smooth CSS animations (fade-in on scroll, hover effects, transitions)
- Fully responsive (mobile, tablet, desktop)
- Real, relevant placeholder content (NOT lorem ipsum)
- Gradient backgrounds, subtle shadows, glassmorphism where appropriate
- Proper spacing and visual hierarchy
- Accessible color contrast
- Interactive elements (buttons, hover states, smooth scrolls)
- At least 5 sections of substantial content

User's original request: ${userPrompt}
Enhanced prompt: ${parsedRequirements.refinedPrompt || userPrompt}`;

  // Use AI provider with automatic fallback support
  const result = await aiProvider.generate(fullPrompt);
  let code = result.code;

  // Clean markdown artifacts
  code = code.replace(/```html\n?/gi, '').replace(/```jsx?\n?/gi, '').replace(/```\n?/g, '').trim();

  // Ensure it starts with DOCTYPE
  if (!code.startsWith('<!DOCTYPE') && !code.startsWith('<!doctype')) {
    const doctypeIdx = code.indexOf('<!DOCTYPE');
    const doctypeIdx2 = code.indexOf('<!doctype');
    const idx = doctypeIdx !== -1 ? doctypeIdx : doctypeIdx2;
    if (idx !== -1) {
      code = code.substring(idx);
    }
  }

  console.log(`[CodeGen] Generated code using ${result.provider} (${result.metadata.model})`);
  return code;
};
