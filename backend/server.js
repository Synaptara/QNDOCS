require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 5000;

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
    process.env.FRONTEND_URL
].map(o => o?.trim().replace(/\/$/, '')).filter(Boolean);

console.log('📡 Allowed Origins:', allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const normalizedOrigin = origin.trim().replace(/\/$/, '');
        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            console.log('⚠️ Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const getSessionDir = (sessionId) => {
    const safeSessionId = (sessionId || 'default').replace(/[^a-z0-9_-]/gi, '_');
    const userPath = path.join(__dirname, 'uploads', safeSessionId);
    if (!fs.existsSync(userPath)) {
        fs.mkdirSync(userPath, { recursive: true });
    }
    return userPath;
};

// File upload configuration using Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sessionId = req.headers['x-session-id'] || 'default';
        cb(null, getSessionDir(sessionId));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

const getSessionDocuments = (sessionId) => {
    const sessionDir = getSessionDir(sessionId);
    if (!fs.existsSync(sessionDir)) return [];

    const files = fs.readdirSync(sessionDir);
    return files
        .filter(f => f !== '.DS_Store' && f.includes('-'))
        .map(filename => {
            const filePath = path.join(sessionDir, filename);
            const stats = fs.statSync(filePath);
            const originalName = filename.substring(filename.indexOf('-') + 1);
            return {
                id: filename.split('-')[0],
                name: originalName,
                filename: filename,
                path: filePath,
                size: stats.size,
                uploadDate: stats.mtime
            };
        });
};


const readFileContent = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        console.error(`Error reading file ${filePath}:`, err);
        return "";
    }
};

// Logic to split documents into manageable chunks
const chunkDocument = (text, docId, docName) => {
    const rawChunks = text.split(/\n\s*\n/);
    return rawChunks
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 50)
        .map(chunk => ({
            id: docId,
            name: docName,
            text: chunk
        }));
};

// Groq api
const callGroqAPI = async (prompt) => {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
           
            model: "llama-3.3-70b-versatile", 
            temperature: 0.1,
            max_tokens: 1024,
        });

        return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("Groq API Error:", error);
        throw new Error("Failed to communicate with Intelligence Engine.");
    }
};

// Routes

// Root Welcome Route
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #f97316;">Private QA Backend (Groq) is Live! 🚀</h1>
            <p>The API is running and ready for connections.</p>
            <hr style="max-width: 400px; margin: 20px auto; opacity: 0.2;">
            <p style="color: #64748b; font-size: 14px;">Use <b>/api/health</b> to check status.</p>
        </div>
    `);
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            database: 'operational',
            ai_engine: process.env.GROQ_API_KEY ? 'Groq Connected' : 'Missing Key'
        }
    });
});

// Upload Document
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const sessionId = req.headers['x-session-id'] || 'default';
    const originalName = req.file.filename.substring(req.file.filename.indexOf('-') + 1);

    const newDoc = {
        id: req.file.filename.split('-')[0],
        name: originalName,
        size: req.file.size,
        uploadDate: new Date()
    };

    console.log(`📂 User [${sessionId}] uploaded: ${originalName}`);
    res.status(201).json({ message: 'File uploaded successfully', document: newDoc });
});

// List Documents
app.get('/api/documents', (req, res) => {
    const sessionId = req.headers['x-session-id'] || 'default';
    const docs = getSessionDocuments(sessionId);
    res.json(docs);
});

// Delete Document
app.delete('/api/documents/:id', (req, res) => {
    const sessionId = req.headers['x-session-id'] || 'default';
    const docId = req.params.id;
    const sessionDir = getSessionDir(sessionId);

    const files = fs.readdirSync(sessionDir);
    const targetFile = files.find(f => f.startsWith(docId));

    if (!targetFile) {
        return res.status(404).json({ error: 'Document not found' });
    }

    fs.unlinkSync(path.join(sessionDir, targetFile));
    res.json({ message: 'Document deleted successfully' });
});

// Core Q&A Endpoint
app.post('/api/ask', async (req, res) => {
    const { question, targetDocIds } = req.body;
    
    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.status(503).json({
            error: 'AI service not configured. Please add GROQ_API_KEY to .env file.'
        });
    }

    try {
        // 1. Prepare Context
        const sessionId = req.headers['x-session-id'] || 'default';
        let userDocs = getSessionDocuments(sessionId);

        if (targetDocIds && targetDocIds.length > 0) {
            userDocs = userDocs.filter(doc => targetDocIds.includes(doc.id));
        }

        let allChunks = [];
        userDocs.forEach(doc => {
            const content = readFileContent(doc.path);
            const chunks = chunkDocument(content, doc.id, doc.name);
            allChunks.push(...chunks);
        });

        if (allChunks.length === 0) {
            return res.json({
                answer: "No documents available for analysis. Please upload files.",
                sources: []
            });
        }

        // 2. Relevance Scoring
        const questionTerms = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const scoredChunks = allChunks.map(chunk => {
            let score = 0;
            const chunkLower = chunk.text.toLowerCase();
            questionTerms.forEach(term => {
                if (chunkLower.includes(term)) score += 1;
            });
            return { ...chunk, score };
        });

        // Top Chunks
        const topChunks = scoredChunks
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        if (topChunks.length === 0) {
            return res.json({
                answer: "No relevant information found in the active documents.",
                sources: []
            });
        }

        const contextText = topChunks.map((c, i) => `[Source ${i + 1} - ${c.name}]:\n${c.text}`).join("\n\n");

        // 3. Groq Prompt
        const prompt = `
        ROLE: You are an elite Intelligence Analyst for a private data console.
        TASK: Synthesize a precise answer to the user's query using ONLY the provided Context Data.

        STRICT RULES:
        1. NO HALLUCINATIONS: If the answer is not in the context, state "Insufficient intelligence in current nodes."
        2. ACCURACY: Prioritize numbers, dates, and names.
        3. FORMATTING:
           - Use **Bold** for key figures and entities.
           - Use clean paragraphs. No markdown code blocks unless requesting code.
           - Be direct. No filler words ("Here is the answer...").
        
        CONTEXT DATA:
        ${contextText}

        USER QUERY: 
        ${question}

        ANALYSIS:`;

        let answerText = "";
        try {
            console.log(`Calling Groq API...`);
            answerText = await callGroqAPI(prompt);
            console.log(`✓ Groq Success`);
        } catch (groqErr) {
            console.log(`✗ Groq failed: ${groqErr.message}`);
            answerText = "System Error: Neural Link Unstable. Please try again.";
        }

        // 4. Response
        res.json({
            answer: answerText,
            sources: topChunks.map(c => ({
                documentId: c.id,
                documentName: c.name,
                snippet: c.text.substring(0, 100) + "...",
                score: c.score
            }))
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: 'Internal processing error: ' + error.message });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n--------------------------------------`);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}`);
    console.log(`✅ Groq API: ${process.env.GROQ_API_KEY ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`--------------------------------------\n`);
});