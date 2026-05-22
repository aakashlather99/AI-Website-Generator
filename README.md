# AI Website Generator

This is a full-stack platform that lets users generate complete websites (HTML, CSS, JS) from a single prompt using an AI agent pipeline, edit them in an in-browser code editor, and download the output as a ZIP file.

It's built with Node.js/Express on the backend and React (Vite) on the frontend, using PostgreSQL for database storage and OpenRouter for the AI agent orchestration.

## Getting Started

First, make sure you have Node.js and PostgreSQL running locally.

### 1. Set up the Backend

Go to the `server` directory, install dependencies, and set up your `.env` file:

```bash
cd server
npm install
```

Create a `.env` file inside the `server` folder:
```env
PORT=5000
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/your_db
JWT_SECRET=your_jwt_secret

# OpenRouter configuration for website generation
OPENROUTER_API_KEY=your_openrouter_api_key

# OAuth configs (optional)
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
GITHUB_CLIENT_ID=your_github_id
GITHUB_CLIENT_SECRET=your_github_secret
```

Run migrations to set up the database tables:
```bash
npx knex migrate:latest
```

Start the backend server in development mode:
```bash
npm start
```
The server runs at `http://localhost:5000`.

### 2. Set up the Client

Go to the `client` directory, install dependencies, and run the development build:

```bash
cd client
npm install
npm run dev
```
The frontend will start at `http://localhost:5173`.

---

## How it works (AI Pipeline)

When you type a prompt and click "Generate", the backend starts a synchronous AI pipeline powered by OpenRouter free model rotation:

1. **Parser Agent**: Extracts structural requirements (sections, colors, features, project type) from your raw prompt.
2. **Planner Agent**: Designs the page layout and outline.
3. **Generator Agent**: Writes the complete index.html and modern responsive CSS/JS code.
4. **Debugger & Optimizer**: Checks for common HTML/JS bugs and cleans up styling before saving to the database.

The generated code is stored in the PostgreSQL database, automatically linked to your user account, and rendered directly in the client editor's preview frame.
