# Building and Hosting React App with Backend

This guide explains how to build the React frontend and serve it from the Express backend.

## Steps to Build and Serve

### Option 1: Using npm scripts (Recommended)

1. **Build the React app:**
   ```bash
   cd ../frontend
   npm run build
   ```

2. **Start the backend server:**
   ```bash
   cd ../backend
   npm start
   ```

   Or use the combined command:
   ```bash
   npm run build-and-serve
   ```

### Option 2: Using build scripts

**On Windows:**
```bash
build-and-serve.bat
```

**On Linux/Mac:**
```bash
chmod +x build-and-serve.sh
./build-and-serve.sh
```

## How It Works

1. The React app is built into the `frontend/build` folder
2. The Express server serves static files from `frontend/build`
3. API routes (`/api/*`) are handled by the Express server
4. All other routes are served the React `index.html` for client-side routing

## Accessing the Application

Once the server is running:
- Frontend: `http://localhost:5253`
- API: `http://localhost:5253/api/*`

## Environment Variables Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file and add your actual values:**
   - `OPENAI_API_KEY`: Your OpenAI API key (required for AI Chatbot feature)
     - Get your API key from: https://platform.openai.com/api-keys
   - `PORT`: Server port (default: 5253)

3. **Important:** The `.env` file is already in `.gitignore` and will not be committed to version control.

## Notes

- Make sure to rebuild the React app whenever you make frontend changes
- The build folder must exist for the server to serve the React app
- API routes take precedence over static file serving
- The `.env` file must be in the `backend` directory for environment variables to load

