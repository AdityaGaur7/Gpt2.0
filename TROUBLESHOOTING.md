# Troubleshooting Guide

## Chat Not Responding - Quick Fix

If the chat is not responding, follow these steps:

### 1. Check Environment Variables

First, make sure you have created a `.env.local` file in the `task` directory with all required variables:

```bash
# Required for chat functionality
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

# Required for authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Required for database
MONGODB_URI=your_mongodb_connection_string_here

# Required for file uploads
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 2. Test Individual Components

Visit these URLs to test each component:

- **Basic API**: http://localhost:3000/api/test
- **Database**: http://localhost:3000/api/test-db
- **Authentication**: http://localhost:3000/api/test-auth
- **AI Connection**: http://localhost:3000/api/test-ai

### 3. Check Console Logs

1. Open browser developer tools (F12)
2. Go to the Console tab
3. Try sending a message
4. Look for any error messages

### 4. Check Network Tab

1. Open browser developer tools (F12)
2. Go to the Network tab
3. Try sending a message
4. Look for failed requests (red entries)
5. Click on failed requests to see error details

### 5. Common Issues and Solutions

#### Issue: "No Google AI API key found"

**Solution**: Set up your Google AI API key in `.env.local`

#### Issue: "Unauthorized" error

**Solution**: Make sure you're signed in with Clerk

#### Issue: "Database connection failed"

**Solution**: Check your MongoDB URI in `.env.local`

#### Issue: "Stream error occurred"

**Solution**: Check your Google AI API key and quota

### 6. Restart Development Server

After making changes to `.env.local`:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### 7. Clear Browser Cache

Sometimes cached data can cause issues:

1. Open browser developer tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### 8. Check API Endpoints

The application uses these API endpoints:

- `/api/chat-simple` - Main chat endpoint (simplified)
- `/api/chat` - Main chat endpoint (with token management)
- `/api/upload` - File upload endpoint
- `/api/memory` - Memory management
- `/api/messages/[id]` - Message editing

### 9. Debug Mode

To enable debug logging, add this to your `.env.local`:

```bash
DEBUG=true
```

### 10. Still Not Working?

If none of the above solutions work:

1. Check the terminal where you're running `npm run dev` for error messages
2. Make sure all environment variables are set correctly
3. Verify your API keys are valid and have proper permissions
4. Check if your MongoDB cluster is running and accessible
5. Ensure your Google AI API key has sufficient quota

### Quick Test Commands

```bash
# Test if the server is running
curl http://localhost:3000/api/test

# Test database connection
curl http://localhost:3000/api/test-db

# Test AI connection (requires API key)
curl http://localhost:3000/api/test-ai
```

## Getting Help

If you're still having issues:

1. Check the browser console for error messages
2. Check the terminal for server errors
3. Verify all environment variables are set
4. Test each component individually using the test endpoints
