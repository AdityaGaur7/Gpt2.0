# Environment Setup Guide

To fix the chat functionality, you need to set up the following environment variables:

## 1. Create `.env.local` file in the task directory

```bash
# Google AI API Key (Required for chat functionality)
# Get from: https://makersuite.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

# Clerk Authentication (Required for user authentication)
# Get from: https://clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# MongoDB (Required for memory storage)
# Get from: https://mongodb.com
MONGODB_URI=your_mongodb_connection_string_here

# Cloudinary (Required for file storage)
# Get from: https://cloudinary.com
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Uploadcare (Optional - for alternative file upload)
# Get from: https://uploadcare.com
NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY=your_uploadcare_public_key
UPLOADCARE_SECRET_KEY=your_uploadcare_secret_key

# File Upload Configuration
# Maximum file size for uploads (in bytes)
MAX_FILE_SIZE=20971520  # 20MB
```

## 2. Get API Keys

### Google AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env.local` file

### Clerk Authentication

1. Go to [Clerk Dashboard](https://clerk.com)
2. Create a new application
3. Copy the publishable key and secret key
4. Add them to your `.env.local` file

### MongoDB

1. Go to [MongoDB Atlas](https://mongodb.com)
2. Create a free cluster
3. Get the connection string
4. Add it to your `.env.local` file

### Cloudinary

1. Go to [Cloudinary Dashboard](https://cloudinary.com)
2. Sign up for a free account
3. Copy your cloud name, API key, and API secret
4. Add them to your `.env.local` file

### Uploadcare (Optional)

1. Go to [Uploadcare Dashboard](https://uploadcare.com)
2. Create a free account
3. Get your public key and secret key
4. Add them to your `.env.local` file

## Supported File Types

The chat application supports the following file types for upload:

### Images

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### Documents

- PDF (.pdf)
- Text files (.txt)
- Microsoft Word (.doc, .docx)

### File Size Limits

- Maximum file size: 20MB per file
- Multiple files can be attached to a single message

## 3. Restart the development server

After setting up the environment variables:

```bash
npm run dev
```

## Troubleshooting

- Make sure all environment variables are set correctly
- Check the browser console for any error messages
- Verify that your API keys have the correct permissions
- Ensure MongoDB connection is working
