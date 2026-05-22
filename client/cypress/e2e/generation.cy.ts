/**
 * AI Generation E2E Tests
 * Tests website generation with async job polling
 */

describe('AI Generation', () => {
  beforeEach(() => {
    // Login first
    cy.visit('/auth');
    cy.get('input[type="email"]').type('john@example.com');
    cy.get('input[type="password"]').type('SecurePass123!');
    cy.contains('Sign In').click();

    cy.url().should('include', '/projects');
  });

  it('should create a new project and generate website', () => {
    cy.contains('New Project').click();
    cy.url().should('include', '/projects/new');

    // Enter generation prompt
    cy.get('textarea').type('Create a professional portfolio website with hero section and project grid');
    cy.contains('Generate').click();

    // Should show loading toast
    cy.contains('Generation started').should('be.visible');

    // Wait for job completion (up to 2 minutes)
    cy.contains('Website generated successfully', { timeout: 120000 }).should('be.visible');

    // Should display generated HTML
    cy.get('.preview-frame').should('be.visible');
    cy.get('.code-editor').should('contain', '<html');
  });

  it('should show generation progress', () => {
    cy.contains('New Project').click();

    const prompt = 'Build a beautiful landing page';
    cy.get('textarea').type(prompt);
    cy.contains('Generate').click();

    // Check for loading state
    cy.contains('⏳ Generating website').should('be.visible');

    // Wait for completion (with timeout)
    cy.contains('Website generated successfully', { timeout: 120000 }).should('be.visible');
  });

  it('should display error if generation fails', () => {
    cy.intercept('POST', '/api/ai/generate', {
      statusCode: 500,
      body: { success: false, message: 'Generation failed' },
    }).as('failedGeneration');

    cy.contains('New Project').click();
    cy.get('textarea').type('Generate website');
    cy.contains('Generate').click();

    cy.wait('@failedGeneration');
    cy.contains('Generation request failed').should('be.visible');
  });

  it('should show error if no credits', () => {
    // Mock user with 0 credits
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 200,
      body: { success: true, user: { id: 1, credits: 0 } },
    });

    cy.contains('New Project').click();
    cy.get('textarea').type('Generate website');
    cy.contains('Generate').click();

    cy.contains('No credits').should('be.visible');
    cy.url().should('include', '/pricing');
  });

  it('should allow setting framework', () => {
    cy.contains('New Project').click();

    // Select React framework
    cy.contains('React').click();
    cy.get('input[value="react"]').should('be.checked');

    // Select Next.js
    cy.contains('Next.js').click();
    cy.get('input[value="nextjs"]').should('be.checked');
  });

  it('should save generated project', () => {
    cy.contains('New Project').click();
    cy.get('textarea').type('Create a landing page');
    cy.contains('Generate').click();

    cy.contains('Website generated successfully', { timeout: 120000 }).should('be.visible');

    // Check that project was created and saved
    cy.url().should('match', /\/projects\/\d+/);
  });

  it('should regenerate existing project', () => {
    // Navigate to existing project
    cy.visit('/projects/1');

    // Should load project
    cy.get('textarea').should('contain', 'original prompt');

    // Generate new version
    cy.get('textarea').clear().type('Redesign with modern layout');
    cy.contains('Generate').click();

    cy.contains('Website generated successfully', { timeout: 120000 }).should('be.visible');
  });
});
