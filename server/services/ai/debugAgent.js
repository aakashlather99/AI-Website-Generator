// Debug/Repair Agent — Validates and fixes generated code
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Quick structural validation
const validateHTML = (code) => {
  const issues = [];

  if (!code.includes('<!DOCTYPE html>') && !code.includes('<!doctype html>')) {
    issues.push('Missing DOCTYPE declaration');
  }
  if (!code.includes('<html')) issues.push('Missing <html> tag');
  if (!code.includes('<head')) issues.push('Missing <head> tag');
  if (!code.includes('<body')) issues.push('Missing <body> tag');
  if (!code.includes('</html>')) issues.push('Missing closing </html> tag');
  if (!code.includes('<meta name="viewport"')) issues.push('Missing viewport meta tag');
  if (!code.includes('<title')) issues.push('Missing <title> tag');

  // Check for unclosed tags — expanded list to cover common elements
  const tagNames = 'div|section|header|footer|nav|main|article|aside|p|span|ul|ol|li|table|form';
  const openRegex = new RegExp(`<(${tagNames})\\b`, 'gi');
  const closeRegex = new RegExp(`</(${tagNames})>`, 'gi');
  const openTags = (code.match(openRegex) || []).length;
  const closeTags = (code.match(closeRegex) || []).length;
  if (Math.abs(openTags - closeTags) > 3) {
    issues.push(`Potential unclosed tags: ${openTags} opens vs ${closeTags} closes`);
  }

  // Check for responsive design — detect media queries, flex, grid, clamp, viewport units
  const hasResponsive =
    code.includes('@media') ||
    code.includes('display: flex') || code.includes('display:flex') ||
    code.includes('display: grid') || code.includes('display:grid') ||
    code.includes('clamp(') ||
    /\d+v[wh]/.test(code);

  if (!hasResponsive) {
    issues.push('No responsive design techniques detected (no @media, flex, grid, or viewport units)');
  }

  return issues;
};

export const debugAndRepair = async (code, plan) => {
  const issues = validateHTML(code);

  // If no major issues, return as-is
  if (issues.length === 0) {
    return { code, fixed: false, issues: [] };
  }

  // Attempt repair for critical issues only
  const criticalIssues = issues.filter(i =>
    i.includes('DOCTYPE') || i.includes('<html>') ||
    i.includes('<head>') || i.includes('<body>') || i.includes('unclosed')
  );

  if (criticalIssues.length === 0) {
    return { code, fixed: false, issues };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const repairPrompt = `You are a code repair agent. Fix the following HTML code issues WITHOUT changing the design.

Issues found:
${criticalIssues.map(i => `- ${i}`).join('\n')}

Rules:
1. Return ONLY the fixed HTML code
2. Do NOT change the visual design
3. Fix structural HTML issues only
4. Ensure proper DOCTYPE, html, head, body structure
5. Add viewport meta if missing
6. NO markdown, NO code blocks, NO backticks

Code to fix:
${code.substring(0, 15000)}`;

    const result = await model.generateContent(repairPrompt);
    let fixedCode = result.response.text();
    fixedCode = fixedCode.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();

    // Verify the fix is reasonable: must end with </html> and be at least 1000 chars
    if (fixedCode.includes('</html>') && fixedCode.length >= 1000) {
      if (fixedCode.length < code.length * 0.5) {
        console.warn('[DEBUG AGENT] Fixed code suspiciously short — kept original. Fixed length:', fixedCode.length, 'Original:', code.length);
        return { code, fixed: false, issues: criticalIssues };
      }
      return { code: fixedCode, fixed: true, issues: criticalIssues };
    }
  } catch (err) {
    console.warn('Debug agent repair failed:', err.message);
  }

  return { code, fixed: false, issues };
};
