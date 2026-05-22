import pool from '../config/db.js';
import { generateZip } from '../services/zipService.js';

// GET /api/projects
export const getProjects = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, prompt, framework, is_published, current_version, updated_at, created_at FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.userId]
    );
    res.json({ success: true, projects: result.rows });
  } catch (error) {
    console.error('GetProjects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

// GET /api/projects/:id
export const getProject = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Get conversation history
    const prompts = await pool.query(
      'SELECT id, role, content, created_at FROM prompts WHERE project_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    // Get versions
    const versions = await pool.query(
      'SELECT id, version_number, change_description, created_at FROM project_versions WHERE project_id = $1 ORDER BY version_number DESC',
      [req.params.id]
    );

    // Get files
    const files = await pool.query(
      'SELECT id, file_path, file_type, updated_at FROM project_files WHERE project_id = $1 ORDER BY file_path',
      [req.params.id]
    );

    res.json({
      success: true,
      project: {
        ...result.rows[0],
        conversation: prompts.rows,
        versions: versions.rows,
        files: files.rows,
      },
    });
  } catch (error) {
    console.error('GetProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
};

// PUT /api/projects/:id
export const updateProject = async (req, res) => {
  try {
    const { title, html_code, is_published } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
    if (html_code !== undefined) { fields.push(`html_code = $${idx++}`); values.push(html_code); }
    if (is_published !== undefined) { fields.push(`is_published = $${idx++}`); values.push(is_published); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id, req.userId);

    const result = await pool.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, project: result.rows[0] });
  } catch (error) {
    console.error('UpdateProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to update project' });
  }
};

// DELETE /api/projects/:id
export const deleteProject = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('DeleteProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete project' });
  }
};

// GET /api/projects/:id/versions
export const getVersions = async (req, res) => {
  try {
    // Verify ownership
    const project = await pool.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (project.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const result = await pool.query(
      'SELECT id, version_number, change_description, created_at FROM project_versions WHERE project_id = $1 ORDER BY version_number DESC',
      [req.params.id]
    );
    res.json({ success: true, versions: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch versions' });
  }
};

// POST /api/projects/:id/rollback/:versionId
export const rollbackVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;

    const project = await pool.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (project.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const version = await pool.query(
      'SELECT * FROM project_versions WHERE id = $1 AND project_id = $2',
      [versionId, id]
    );
    if (version.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }

    // Save current as a version before rollback
    const cp = project.rows[0];
    await pool.query(
      'INSERT INTO project_versions (project_id, version_number, html_code, prompt, change_description) VALUES ($1, $2, $3, $4, $5)',
      [id, cp.current_version, cp.html_code, cp.prompt, 'Before rollback']
    );

    // Apply rollback
    const v = version.rows[0];
    await pool.query(
      'UPDATE projects SET html_code = $1, prompt = $2, current_version = current_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [v.html_code, v.prompt || cp.prompt, id]
    );

    res.json({ success: true, message: 'Rolled back successfully', htmlCode: v.html_code });
  } catch (error) {
    console.error('Rollback error:', error);
    res.status(500).json({ success: false, message: 'Rollback failed' });
  }
};

// GET /api/projects/:id/download
export const downloadProject = async (req, res) => {
  try {
    const project = await pool.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (project.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const files = await pool.query('SELECT file_path, file_content FROM project_files WHERE project_id = $1', [req.params.id]);

    const zipBuffer = await generateZip(project.rows[0], files.rows);

    const filename = (project.rows[0].title || 'website').replace(/[^a-zA-Z0-9-_]/g, '-').substring(0, 50);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}.zip"`,
      'Content-Length': zipBuffer.length,
    });
    res.send(zipBuffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ success: false, message: 'Download failed' });
  }
};

// POST /api/projects/:id/publish
export const publishProject = async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE projects SET is_published = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING id, title',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, message: 'Project published to community' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Publish failed' });
  }
};

// GET /api/projects/community (public)
export const getCommunityProjects = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.title, p.prompt, p.framework, p.created_at, u.name as author, u.avatar_url
      FROM projects p JOIN users u ON p.user_id = u.id
      WHERE p.is_published = true ORDER BY p.created_at DESC LIMIT 30
    `);
    res.json({ success: true, projects: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch community projects' });
  }
};

// GET /api/projects/community/:id (public — view a single published project)
export const getCommunityProjectById = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, prompt, html_code, framework, created_at FROM projects WHERE id = $1 AND is_published = true',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found or not published' });
    }
    res.json({ success: true, project: result.rows[0] });
  } catch (error) {
    console.error('GetCommunityProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
};

