# Setup Guide for ChatGPT Clone

## Quick Start

1. **Get a Gemini API Key**

   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key for the next step

2. **Set up Environment Variables**
   Create a `.env.local` file in the root directory with:

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   NEXT_PUBLIC_APP_NAME=ChatGPT Clone
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Run the Development Server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Required Services

### Google Gemini AI

- **Why**: Powers the AI chat responses
- **Setup**: Get free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Cost**: Free tier available with generous limits

### MongoDB (Optional for Demo)

- **Why**: Stores messages and user memories
- **Setup**: Create free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Alternative**: For demo, you can comment out database calls

### Cloudinary (Optional)

- **Why**: Handles file uploads and image storage
- **Setup**: Create free account at [Cloudinary](https://cloudinary.com/)
- **Alternative**: For demo, file uploads will show placeholder text

## Demo Mode

If you want to test without setting up all services:

1. **Minimal Setup** (Gemini API only):

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_APP_NAME=ChatGPT Clone
   ```

2. **Comment out database calls** in the API routes for a simpler demo

## Features Available

✅ **Real-time streaming chat** with Gemini AI  
✅ **Message editing** and regeneration  
✅ **Modern UI** with Tailwind CSS and ShadCN  
✅ **File upload interface** (requires Cloudinary for full functionality)  
✅ **Memory system** (requires MongoDB for persistence)  
✅ **Responsive design** for mobile and desktop

## Troubleshooting

### "No AI API key found" Error

- Make sure you've set `GEMINI_API_KEY` in your `.env.local` file
- Restart your development server after adding environment variables

### Database Connection Errors

- For demo purposes, you can comment out database operations
- Or set up a free MongoDB Atlas cluster

### File Upload Issues

- File uploads require Cloudinary setup
- Without Cloudinary, files will be listed but not processed

## Next Steps

1. **Add Authentication**: Integrate Clerk for user management
2. **Enable Database**: Set up MongoDB for message persistence
3. **Enable File Uploads**: Configure Cloudinary for file storage
4. **Deploy**: Deploy to Vercel or your preferred platform

## Support

If you encounter issues:

1. Check that all environment variables are set correctly
2. Ensure you're using the latest Node.js version
3. Try clearing your `.next` cache: `rm -rf .next && npm run dev`
