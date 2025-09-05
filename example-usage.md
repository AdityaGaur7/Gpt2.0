# File Upload Usage Example

## Proper AI SDK Format

Your implementation now correctly handles file uploads using the Vercel AI SDK format:

```typescript
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

// Example usage in your chat API
const result = await streamText({
  model: google("gemini-2.5-flash"),
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "What is an embedding model according to this document?",
        },
        {
          type: "file",
          data: Buffer.from(fileData), // File buffer
          mediaType: "application/pdf", // MIME type
        },
      ],
    },
  ],
});
```

## Supported File Types

- **Images**: JPEG, PNG, GIF, WebP (sent as binary data)
- **PDFs**: Extracted as text + sent as binary for better processing
- **Text files**: Extracted as text content
- **Documents**: DOCX, DOC (processed as binary)

## How It Works

1. **File Upload**: Files are uploaded to Cloudinary and stored
2. **Processing**: Files are fetched and processed using `processFileForAI()`
3. **AI SDK Format**: Files are sent in the proper format with `type: "file"`, `data: Buffer`, and `mediaType`
4. **Streaming**: Responses are streamed back to the client

## Key Features

- ✅ Proper AI SDK integration
- ✅ Mixed content support (text + files)
- ✅ PDF text extraction
- ✅ Image processing
- ✅ Error handling
- ✅ Streaming responses
