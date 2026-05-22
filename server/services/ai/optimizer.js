// Optimizer Agent — Enhances performance, SEO, and accessibility
export const optimize = (code, plan) => {
  let optimized = code;

  // 1. Add viewport meta if missing
  if (!optimized.includes('meta name="viewport"')) {
    optimized = optimized.replace(
      '<head>',
      '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    );
  }

  // 2. Add charset if missing
  if (!optimized.includes('charset')) {
    optimized = optimized.replace(
      '<head>',
      '<head>\n  <meta charset="UTF-8">'
    );
  }

  // 3. Add SEO meta tags if missing
  const seo = plan?.seoMeta || {};
  if (seo.description && !optimized.includes('meta name="description"')) {
    optimized = optimized.replace(
      '</head>',
      `  <meta name="description" content="${seo.description}">\n</head>`
    );
  }

  // 4. Add lang attribute if missing
  if (!optimized.includes('lang=')) {
    optimized = optimized.replace(/<html(?![^>]*lang\s*=)([^>]*)>/i, '<html lang="en"$1>');
  }

  // 5. Add smooth scrolling CSS if not present
  if (!optimized.includes('scroll-behavior')) {
    optimized = optimized.replace(
      '<style>',
      '<style>\n  html { scroll-behavior: smooth; }'
    );
  }

  // 6. Add basic fade-in animation if no animations present
  if (!optimized.includes('@keyframes') && !optimized.includes('animation')) {
    const fadeCSS = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in { animation: fadeInUp 0.6s ease-out forwards; }`;

    optimized = optimized.replace('</style>', `${fadeCSS}\n</style>`);
  }

  // 7. Add preconnect for Google Fonts performance
  if (optimized.includes('fonts.googleapis.com') && !optimized.includes('preconnect')) {
    optimized = optimized.replace(
      '<head>',
      `<head>\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
    );
  }

  // 8. Minify inline CSS slightly (remove excessive whitespace in style blocks)
  // Light touch — don't break anything
  optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n\n');

  return optimized;
};
