import pool from '../config/db.js';

export const getStats = async (req, res) => {
  try {
    const [users, projects, gens] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query('SELECT COUNT(*) as total FROM projects'),
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'completed') as ok, COUNT(*) FILTER (WHERE status = 'failed') as fail FROM ai_generations"),
    ]);
    res.json({ success: true, stats: { totalUsers: +users.rows[0].total, totalProjects: +projects.rows[0].total, totalGenerations: +gens.rows[0].total, completed: +gens.rows[0].ok, failed: +gens.rows[0].fail } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed' }); }
};

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    let q = 'SELECT id, name, email, role, credits, subscription_tier, provider, is_banned, created_at, last_login FROM users';
    const p = [];
    if (search) { p.push(`%${search}%`); q += ` WHERE name ILIKE $1 OR email ILIKE $1`; }
    q += ` ORDER BY created_at DESC LIMIT $${p.length+1} OFFSET $${p.length+2}`;
    p.push(+limit, +offset);
    const result = await pool.query(q, p);
    const cnt = await pool.query('SELECT COUNT(*) FROM users');
    res.json({ success: true, users: result.rows, total: +cnt.rows[0].count, page: +page });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed' }); }
};

export const updateUser = async (req, res) => {
  try {
    const { role, credits, is_banned, subscription_tier } = req.body;
    const f = [], v = []; let i = 1;
    if (role !== undefined) { f.push(`role = $${i++}`); v.push(role); }
    if (credits !== undefined) { f.push(`credits = $${i++}`); v.push(credits); }
    if (is_banned !== undefined) { f.push(`is_banned = $${i++}`); v.push(is_banned); }
    if (subscription_tier !== undefined) { f.push(`subscription_tier = $${i++}`); v.push(subscription_tier); }
    if (!f.length) return res.status(400).json({ success: false, message: 'No fields' });
    f.push('updated_at = CURRENT_TIMESTAMP');
    v.push(req.params.id);
    const r = await pool.query(`UPDATE users SET ${f.join(', ')} WHERE id = $${i} RETURNING id, name, email, role, credits, is_banned`, v);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    await pool.query('INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5)', [req.userId, 'update_user', 'user', +req.params.id, JSON.stringify(req.body)]);
    res.json({ success: true, user: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed' }); }
};

export const getGenerations = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const r = await pool.query('SELECT g.*, u.name as user_name, u.email FROM ai_generations g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT $1 OFFSET $2', [+limit, (+page-1)*limit]);
    const cnt = await pool.query('SELECT COUNT(*) FROM ai_generations');
    res.json({ success: true, generations: r.rows, total: +cnt.rows[0].count, page: +page });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed' }); }
};

export const getAnalytics = async (req, res) => {
  try {
    const signups = await pool.query("SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date");
    const gens = await pool.query("SELECT DATE(created_at) as date, COUNT(*) as count FROM ai_generations WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date");
    const fw = await pool.query('SELECT framework, COUNT(*) as count FROM ai_generations GROUP BY framework ORDER BY count DESC');
    res.json({ success: true, analytics: { dailySignups: signups.rows, dailyGenerations: gens.rows, topFrameworks: fw.rows } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed' }); }
};

export const getAdminLogs = async (req, res) => {
  try {
    const r = await pool.query('SELECT al.*, u.name as admin_name FROM admin_logs al LEFT JOIN users u ON al.admin_id = u.id ORDER BY al.created_at DESC LIMIT 50');
    res.json({ success: true, logs: r.rows });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed' }); }
};
