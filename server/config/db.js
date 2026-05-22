import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('ssl=true') || process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

export const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        avatar_url TEXT,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        provider VARCHAR(20) DEFAULT 'local' CHECK (provider IN ('local', 'google', 'github')),
        provider_id VARCHAR(255),
        credits INTEGER DEFAULT 1,
        subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
        subscription_active BOOLEAN DEFAULT false,
        stripe_customer_id VARCHAR(255),
        is_banned BOOLEAN DEFAULT false,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Refresh tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. OAuth accounts
    await client.query(`
      CREATE TABLE IF NOT EXISTS oauth_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(20) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_user_id)
      );
    `);

    // 4. Projects
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        prompt TEXT,
        html_code TEXT,
        framework VARCHAR(30) DEFAULT 'html' CHECK (framework IN ('html', 'react', 'nextjs')),
        is_published BOOLEAN DEFAULT false,
        is_multi_page BOOLEAN DEFAULT false,
        current_version INTEGER DEFAULT 1,
        thumbnail_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Project versions
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_versions (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        html_code TEXT,
        prompt TEXT,
        change_description VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Project files
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_files (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        file_path VARCHAR(500) NOT NULL,
        file_content TEXT,
        file_type VARCHAR(50),
        version_id INTEGER REFERENCES project_versions(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Prompts / conversation history
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        model VARCHAR(50) DEFAULT 'gemini-2.0-flash',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. AI generations log
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_generations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        prompt TEXT,
        framework VARCHAR(30),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        tokens_input INTEGER DEFAULT 0,
        tokens_output INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        thumbnail_url TEXT,
        html_code TEXT,
        prompt_hint TEXT,
        framework VARCHAR(30) DEFAULT 'html',
        is_premium BOOLEAN DEFAULT false,
        usage_count INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Plans
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100),
        price_cents INTEGER NOT NULL,
        credits INTEGER NOT NULL,
        features JSONB DEFAULT '[]',
        stripe_price_id VARCHAR(255),
        is_subscription BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Credit transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type VARCHAR(30) CHECK (type IN ('purchase', 'usage', 'bonus', 'refund', 'subscription')),
        description VARCHAR(255),
        balance_after INTEGER,
        stripe_session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add stripe_session_id column if it doesn't exist
    await client.query(`
      ALTER TABLE credit_transactions
      ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
    `);

    // 12. Subscriptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES plans(id),
        stripe_subscription_id VARCHAR(255),
        status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 13. Admin logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INTEGER,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Usage analytics
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_analytics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default plans
    await client.query(`
      INSERT INTO plans (name, display_name, price_cents, credits, features, is_subscription, is_active)
      VALUES 
        ('free', 'Free Tier', 0, 1, '["1 AI generation", "HTML export", "Community access"]', false, true),
        ('basic', 'Basic', 999, 50, '["50 AI generations", "All frameworks", "Download ZIP", "Email support"]', false, true),
        ('pro', 'Pro', 1999, 150, '["150 AI generations", "Priority support", "Advanced prompts", "Version history", "Templates"]', true, true),
        ('enterprise', 'Enterprise', 4999, 500, '["500 AI generations", "24/7 support", "Custom domains", "API access", "Team features"]', true, true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);
      CREATE INDEX IF NOT EXISTS idx_prompts_project_id ON prompts(project_id);
      CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_id ON usage_analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_analytics_event ON usage_analytics(event_type);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_projects_user_published ON projects(user_id, is_published);
      CREATE INDEX IF NOT EXISTS idx_ai_gen_user_status ON ai_generations(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_credit_trans_user_date ON credit_transactions(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_credit_trans_stripe_session ON credit_transactions(stripe_session_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_provider_id ON oauth_accounts(provider, provider_user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_project_versions_project ON project_versions(project_id, version_number DESC);
      CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_date ON usage_analytics(user_id, created_at DESC);
    `);

    await client.query('COMMIT');
    console.log('✅ Database tables initialized (14 tables + indexes)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
