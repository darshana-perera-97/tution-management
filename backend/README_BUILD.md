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

## Notes

- Make sure to rebuild the React app whenever you make frontend changes
- The build folder must exist for the server to serve the React app
- API routes take precedence over static file serving

