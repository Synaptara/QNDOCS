# Private Knowledge Q&A System

A secure, private document intelligence platform that allows you to upload sensitive documents and query them using Google Gemini AI. This project implements a Retrieval-Augmented Generation (RAG) architecture to provide accurate answers with direct source citations.

## Tech Stack

- **Frontend**: React.js, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express.js, Multer (for file processing)
- **AI Engine**: Google Gemini API (REST integration)
- **Developer Tools**: Axios, Dotenv, Concurrently

  
## 📁 Project Structure

```text
├── backend/            # Express server & AI integration
│   ├── uploads/        # Document storage
│   └── server.js       # Main API logic
├── frontend/           # React SPA
│   ├── src/            # Components & Application logic
│   └── index.css       # Design system & styles
└── .gitignore          # Protected files & directories
```
## How it Works:
1. Upload a document:
- Action: Add a .txt or .md file through the upload section.
- Expected: File appears in the document list with correct name, size, and date.
2. View and manage documents:
- Action: Check the document list and try deleting one.
- Expected: Deleted file disappears, metadata updates correctly.
3. Ask a question:
 -  Action: Type a query that can be answered from the uploaded document.
- Expected: System calls Gemini API or RAG to get it responded to your query
4. Check the answer:
- Action: Look at the response.
- Expected: Answer includes citations/snippets from the source document.

5. Final:
- Running through these points will give you confidence that each feature — from upload to AI Q&A to security — is functioning as intended.
