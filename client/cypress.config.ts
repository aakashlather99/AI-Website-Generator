module.exports = {
  projectId: 'h5x0ng',
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    testIsolation: true,
    requestTimeout: 10000,
    responseTimeout: 10000,
    defaultCommandTimeout: 5000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
};
