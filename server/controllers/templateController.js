import pool from '../config/db.js';

// GET /api/templates
export const getTemplates = async (req, res) => {
  try {
    const { category, framework } = req.query;
    let query = 'SELECT id, title, description, category, thumbnail_url, framework, is_premium, usage_count, prompt_hint FROM templates WHERE 1=1';
    const params = [];

    if (category) { params.push(category); query += ` AND category = $${params.length}`; }
    if (framework) { params.push(framework); query += ` AND framework = $${params.length}`; }

    query += ' ORDER BY usage_count DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, templates: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
};

// GET /api/templates/:id
export const getTemplate = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Increment usage count
    await pool.query('UPDATE templates SET usage_count = usage_count + 1 WHERE id = $1', [req.params.id]);

    res.json({ success: true, template: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch template' });
  }
};

// POST /api/templates (admin only)
export const createTemplate = async (req, res) => {
  try {
    const { title, description, category, thumbnail_url, html_code, prompt_hint, framework, is_premium } = req.body;

    if (!title || !html_code) {
      return res.status(400).json({ success: false, message: 'Title and HTML code are required' });
    }

    const result = await pool.query(
      `INSERT INTO templates (title, description, category, thumbnail_url, html_code, prompt_hint, framework, is_premium, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, description, category || 'general', thumbnail_url, html_code, prompt_hint, framework || 'html', is_premium || false, req.userId]
    );

    res.status(201).json({ success: true, template: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create template' });
  }
};

// GET /api/templates/categories
export const getCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM templates WHERE category IS NOT NULL ORDER BY category');
    res.json({ success: true, categories: result.rows.map(r => r.category) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};
