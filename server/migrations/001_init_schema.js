/**
 * Initial Schema Migration
 * Creates all base tables for the WebTech application
 */

export async function up(knex) {
  // 1. Users table
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password', 255);
    table.text('avatar_url');
    table.enum('role', ['user', 'admin']).defaultTo('user');
    table.enum('provider', ['local', 'google', 'github']).defaultTo('local');
    table.string('provider_id', 255);
    table.integer('credits').defaultTo(1);
    table.enum('subscription_tier', ['free', 'pro', 'enterprise']).defaultTo('free');
    table.boolean('subscription_active').defaultTo(false);
    table.string('stripe_customer_id', 255);
    table.boolean('is_banned').defaultTo(false);
    table.timestamp('last_login');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 2. Refresh tokens table
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.string('token', 500).notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 3. OAuth accounts table
  await knex.schema.createTable('oauth_accounts', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.string('provider', 20).notNullable();
    table.string('provider_user_id', 255).notNullable();
    table.text('access_token');
    table.text('refresh_token');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['provider', 'provider_user_id']);
  });

  // 4. Projects table
  await knex.schema.createTable('projects', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description');
    table.text('prompt');
    table.text('html_code');
    table.enum('framework', ['html', 'react', 'nextjs']).defaultTo('html');
    table.boolean('is_published').defaultTo(false);
    table.boolean('is_multi_page').defaultTo(false);
    table.integer('current_version').defaultTo(1);
    table.text('thumbnail_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 5. Project versions table
  await knex.schema.createTable('project_versions', (table) => {
    table.increments('id').primary();
    table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE');
    table.integer('version_number').notNullable();
    table.text('html_code');
    table.text('prompt');
    table.string('change_description', 500);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 6. Project files table (for multi-file projects)
  await knex.schema.createTable('project_files', (table) => {
    table.increments('id').primary();
    table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE');
    table.string('file_path', 500).notNullable();
    table.text('file_content');
    table.string('file_type', 50);
    table.integer('version_id').unsigned().references('project_versions.id').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 7. Prompts / conversation history table
  await knex.schema.createTable('prompts', (table) => {
    table.increments('id').primary();
    table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE');
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.enum('role', ['user', 'assistant', 'system']).defaultTo('user');
    table.text('content').notNullable();
    table.integer('tokens_used').defaultTo(0);
    table.string('model', 50).defaultTo('gemini-2.0-flash');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 8. AI generations log table
  await knex.schema.createTable('ai_generations', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.integer('project_id').unsigned().references('projects.id').onDelete('SET NULL');
    table.text('prompt');
    table.string('framework', 30);
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
    table.integer('tokens_input').defaultTo(0);
    table.integer('tokens_output').defaultTo(0);
    table.integer('duration_ms').defaultTo(0);
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 9. Templates table
  await knex.schema.createTable('templates', (table) => {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.text('description');
    table.string('category', 50);
    table.text('thumbnail_url');
    table.text('html_code');
    table.text('prompt_hint');
    table.enum('framework', ['html', 'react', 'nextjs']).defaultTo('html');
    table.boolean('is_premium').defaultTo(false);
    table.integer('usage_count').defaultTo(0);
    table.integer('created_by').unsigned().references('users.id').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 10. Plans table
  await knex.schema.createTable('plans', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.string('display_name', 100);
    table.integer('price_cents').notNullable();
    table.integer('credits').notNullable();
    table.jsonb('features').defaultTo('[]');
    table.string('stripe_price_id', 255);
    table.boolean('is_subscription').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 11. Credit transactions table
  await knex.schema.createTable('credit_transactions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.integer('amount').notNullable();
    table.enum('type', ['purchase', 'usage', 'bonus', 'refund', 'subscription']).notNullable();
    table.string('description', 255);
    table.integer('balance_after');
    table.string('stripe_session_id', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 12. Subscriptions table
  await knex.schema.createTable('subscriptions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.integer('plan_id').unsigned().references('plans.id');
    table.string('stripe_subscription_id', 255);
    table.enum('status', ['active', 'canceled', 'past_due', 'trialing']).defaultTo('active');
    table.timestamp('current_period_start');
    table.timestamp('current_period_end');
    table.timestamp('canceled_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 13. Orders table
  await knex.schema.createTable('orders', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.integer('plan_id').unsigned().references('plans.id');
    table.integer('amount_cents').notNullable();
    table.enum('status', ['pending', 'completed', 'failed', 'refunded']).defaultTo('pending');
    table.string('stripe_session_id', 255);
    table.string('stripe_payment_id', 255);
    table.text('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 14. Usage analytics table
  await knex.schema.createTable('usage_analytics', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.string('event_type', 50).notNullable();
    table.jsonb('event_data');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 15. Create indices for better query performance
  await knex.schema.table('users', (table) => {
    table.index('email');
    table.index('created_at');
  });

  await knex.schema.table('projects', (table) => {
    table.index('user_id');
    table.index('is_published');
    table.index('created_at');
  });

  await knex.schema.table('credit_transactions', (table) => {
    table.index('user_id');
    table.index('created_at');
  });

  await knex.schema.table('prompts', (table) => {
    table.index('project_id');
    table.index('user_id');
  });
}

export async function down(knex) {
  // Drop tables in reverse order of dependencies
  await knex.schema.dropTableIfExists('usage_analytics');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('credit_transactions');
  await knex.schema.dropTableIfExists('plans');
  await knex.schema.dropTableIfExists('templates');
  await knex.schema.dropTableIfExists('ai_generations');
  await knex.schema.dropTableIfExists('prompts');
  await knex.schema.dropTableIfExists('project_files');
  await knex.schema.dropTableIfExists('project_versions');
  await knex.schema.dropTableIfExists('projects');
  await knex.schema.dropTableIfExists('oauth_accounts');
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('users');
}
