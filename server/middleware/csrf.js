import csrf from 'csurf';

// CSRF protection middleware - use with cookies for storage
const csrfProtection = csrf({ cookie: true });

// Provide CSRF token endpoint
export const generateCsrfToken = (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
};

// Check if route needs CSRF protection
export const requireCsrfProtection = csrfProtection;

export default csrfProtection;
