// Input validation & sanitization middleware

// Sanitize string to prevent XSS
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Prompt injection defense — strip dangerous patterns
const sanitizePrompt = (prompt) => {
  if (typeof prompt !== 'string') return '';
  // Remove attempts to override system prompts
  const dangerousPatterns = [
    /ignore\s+(previous|all|above)\s+(instructions|prompts)/gi,
    /system\s*:\s*/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|.*?\|>/gi,
    /```(system|admin)/gi,
  ];
  let clean = prompt;
  dangerousPatterns.forEach(pattern => {
    clean = clean.replace(pattern, '');
  });
  return clean.trim().substring(0, 5000); // Max 5000 chars
};

// Validate registration input
export const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ success: false, message: 'Name must be 2-100 characters' });
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid email is required' });
  }

  if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Password must be 6-128 characters' });
  }

  req.body.name = sanitize(name.trim());
  req.body.email = email.trim().toLowerCase();
  next();
};

// Validate login input
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

// Validate AI prompt input
export const validatePrompt = (req, res, next) => {
  const { prompt, framework } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
    return res.status(400).json({ success: false, message: 'Prompt must be at least 5 characters' });
  }

  const allowedFrameworks = ['html', 'react', 'nextjs'];
  if (framework && !allowedFrameworks.includes(framework)) {
    return res.status(400).json({ success: false, message: 'Invalid framework selection' });
  }

  req.body.prompt = sanitizePrompt(prompt);
  req.body.framework = framework || 'html';
  next();
};

// Validate project update
export const validateProjectUpdate = (req, res, next) => {
  const { title, html_code } = req.body;

  if (title && (typeof title !== 'string' || title.trim().length > 255)) {
    return res.status(400).json({ success: false, message: 'Title must be under 255 characters' });
  }

  if (title) req.body.title = sanitize(title.trim());
  next();
};

// Generic ID parameter validator
export const validateId = (req, res, next) => {
  const id = parseInt(req.params.id || req.params.projectId || req.params.versionId);
  if (isNaN(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid ID parameter' });
  }
  next();
};

export default { validateRegister, validateLogin, validatePrompt, validateProjectUpdate, validateId };
