# Private Knowledge Q&A System

A secure, private document intelligence platform that allows you to upload sensitive documents and query them using Google Gemini AI. This project implements a Retrieval-Augmented Generation (RAG) architecture to provide accurate answers with direct source citations.

## Tech Stack

- **Frontend**: React.js, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express.js, Multer (for file processing)
- **AI Engine**: `Groq Api` (REST integration)
- **Developer Tools**: Axios, Dotenv, Concurrently

## Frontend Screenshot

[![Frontend Screenshot](https://i.ibb.co/nsNsbfgp/Screenshot-2026-02-14-222512.png)](https://ibb.co/N6d6spVR)


  
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
1️⃣ Upload Documents

- Add `.txt` or `.md` files via the upload interface.
- Files are stored securely on the server.
- Each file shows its name, size, and upload date in the document list.

2️⃣ Manage Documents

- View all uploaded documents in one place.
- Delete files you no longer need; the list updates immediately.

3️⃣ Ask Questions

- Type a question related to your uploaded documents.
- The system uses `Retrieval-Augmented Generation (RAG)` to fetch relevant content from your files.
- The question and context are sent to the `Groq API` for an AI-generated answer.

4️⃣ Get Answers with Sources

- Receive answers directly from your documents.
- Each answer includes snippets or citations showing which file provided the information.
- Ensures accuracy and traceability of AI responses.
