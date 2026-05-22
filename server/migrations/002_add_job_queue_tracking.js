/**
 * Add AI Job Queue Tracking
 * Creates table to track BullMQ job metadata for long-running AI operations
 */

export async function up(knex) {
  await knex.schema.createTable('ai_job_queue', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');
    table.string('job_id', 255).notNullable().unique(); // BullMQ job ID
    table.integer('project_id').unsigned().references('projects.id').onDelete('SET NULL');
    table.text('prompt');
    table.enum('status', ['queued', 'processing', 'completed', 'failed']).defaultTo('queued');
    table.integer('progress').defaultTo(0); // 0-100%
    table.text('result_data'); // Stores generated HTML/result
    table.text('error_message');
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.integer('duration_ms'); // Time taken to complete
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create indices
  await knex.schema.table('ai_job_queue', (table) => {
    table.index('user_id');
    table.index('job_id');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ai_job_queue');
}
