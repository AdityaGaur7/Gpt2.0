# ChatGPT Clone

A pixel-perfect ChatGPT clone built with Next.js, TypeScript, Tailwind CSS, and ShadCN UI components.
<img width="865" height="495" alt="Screenshot 2025-09-05 231906" src="https://github.com/user-attachments/assets/fb6243f0-f56f-4311-8c8f-ee709060a4bb" />


https://github.com/user-attachments/assets/ebd9d128-fe53-47ae-aff4-20817c39f8d6


## Features

- **Real-time Streaming**: Live AI responses with streaming from Vercel AI SDK
- **Message Editing**: Edit and regenerate messages with full conversation context
- **Memory System**: Persistent memory (mem0) for conversation continuity
- **File Uploads**: Support for images and documents via Cloudinary
- **Modern UI**: Beautiful, responsive interface with Tailwind CSS and ShadCN
- **Authentication Ready**: Clerk integration for user management
- **Database**: MongoDB for message and memory storage

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, ShadCN UI
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **AI**: Google Gemini API
- **File Storage**: Cloudinary
- **Authentication**: Clerk (ready to integrate)

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd task
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here

   # MongoDB
   MONGODB_URI=mongodb+srv://<user>:<pw>@cluster0.mongodb.net/mydb

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Clerk (for authentication)
   CLERK_FRONTEND_API=your_clerk_frontend_api
   CLERK_API_KEY=your_clerk_api_key

   # App
   NEXT_PUBLIC_APP_NAME=ChatGPT Clone
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

- `POST /api/chat` - Stream chat responses with memory integration
- `PATCH /api/messages/[id]` - Edit and regenerate messages
- `POST /api/upload` - File upload to Cloudinary
- `GET/POST/PUT /api/memory` - Memory (mem0) operations
- `POST /api/webhook` - Webhook receiver for external services

## Project Structure

```
task/
├── app/
│   ├── chat/
│   │   └── page.tsx          # Main chat interface
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/
│   ├── chat-container.tsx    # Main chat component
│   ├── composer.tsx          # Message input
│   ├── message-bubble.tsx    # Individual messages
│   ├── sidebar.tsx           # Chat sidebar
│   └── ui/                   # ShadCN components
├── lib/
│   ├── db.ts                 # MongoDB connection
│   ├── models.ts             # Database types
│   ├── utils.ts              # Utility functions
│   └── vercelAI.ts           # AI SDK wrapper
├── pages/api/                # API routes
│   ├── chat.ts               # Chat streaming
│   ├── memory.ts             # Memory operations
│   ├── upload.ts             # File uploads
│   ├── webhook.ts            # Webhooks
│   └── messages/[id].ts      # Message editing
└── public/                   # Static assets
```

## Key Features Implementation

### Streaming Responses
The chat uses Server-Sent Events (SSE) to stream AI responses in real-time, providing a smooth user experience similar to ChatGPT.

### Message Editing
Users can edit their messages, and the system will regenerate the assistant's response based on the updated context.

### Memory System
The application maintains conversation memory using MongoDB, allowing the AI to remember previous interactions and provide more contextual responses.

### File Uploads
Files are uploaded to Cloudinary and can be referenced in conversations. The system supports images, documents, and other file types.

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production
Make sure to set all required environment variables in your deployment platform:
- `GEMINI_API_KEY`
- `MONGODB_URI`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Development

### Adding New Features
1. Create new API routes in `pages/api/`
2. Add corresponding frontend components
3. Update types in `lib/models.ts` if needed
4. Test thoroughly

### Styling
The project uses Tailwind CSS with ShadCN UI components. Custom styles can be added in `app/globals.css`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
