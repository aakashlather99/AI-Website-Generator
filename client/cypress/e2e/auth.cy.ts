/**
 * Authentication E2E Tests
 * Tests user registration, login, and OAuth flow
 */

describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/auth');
  });

  it('should display auth page', () => {
    cy.contains('Welcome').should('be.visible');
    cy.contains('Sign In').should('be.visible');
    cy.contains('Create Account').should('be.visible');
  });

  it('should register a new user', () => {
    cy.contains('Create Account').click();

    cy.get('input[type="text"]').first().type('John Doe');
    cy.get('input[type="email"]').type('john@example.com');
    cy.get('input[type="password"]').first().type('SecurePass123!');
    cy.get('input[type="password"]').last().type('SecurePass123!');

    cy.contains('Register').click();

    // Should redirect to projects after successful registration
    cy.url().should('include', '/projects');
    cy.contains('Welcome').should('not.exist'); // Auth page should be gone
  });

  it('should login with credentials', () => {
    cy.get('input[type="email"]').type('john@example.com');
    cy.get('input[type="password"]').type('SecurePass123!');

    cy.contains('Sign In').click();

    // Should redirect to dashboard
    cy.url().should('include', '/projects');
  });

  it('should show error with invalid credentials', () => {
    cy.get('input[type="email"]').type('wrong@example.com');
    cy.get('input[type="password"]').type('wrongpass');

    cy.contains('Sign In').click();

    // Should show error toast
    cy.contains('Login failed').should('be.visible');
  });

  it('should logout user', () => {
    // Login first
    cy.get('input[type="email"]').type('john@example.com');
    cy.get('input[type="password"]').type('SecurePass123!');
    cy.contains('Sign In').click();

    cy.url().should('include', '/projects');

    // Click logout
    cy.contains('Logout').click();

    // Should redirect back to auth
    cy.url().should('include', '/auth');
  });

  it('should show Google OAuth button', () => {
    cy.contains('Continue with Google').should('be.visible');
  });

  it('should show GitHub OAuth button', () => {
    cy.contains('Continue with GitHub').should('be.visible');
  });
});
