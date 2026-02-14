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

/* =========================
   CORS CONFIG (FIXED)
========================= */

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.trim().replace(/\/$/, '');

        // Allow localhost
        if (allowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }

        // Allow ALL Vercel deployments
        if (normalizedOrigin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        console.log('⚠️ Blocked by CORS:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================
   SESSION STORAGE
========================= */

const getSessionDir = (sessionId) => {
    const safeSessionId = (sessionId || 'default').replace(/[^a-z0-9_-]/gi, '_');
    const userPath = path.join(__dirname, 'uploads', safeSessionId);

    if (!fs.existsSync(userPath)) {
        fs.mkdirSync(userPath, { recursive: true });
    }

    return userPath;
};

/* =========================
   MULTER SETUP
========================= */

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

/* =========================
   DOCUMENT HELPERS
========================= */

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

/* =========================
   GROQ API
========================= */

const callGroqAPI = async (prompt) => {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
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

/* =========================
   ROUTES
========================= */

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

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            ai_engine: process.env.GROQ_API_KEY ? 'Groq Connected' : 'Missing Key'
        }
    });
});

/* Upload */
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

    res.status(201).json({
        message: 'File uploaded successfully',
        document: newDoc
    });
});

/* List */
app.get('/api/documents', (req, res) => {
    const sessionId = req.headers['x-session-id'] || 'default';
    const docs = getSessionDocuments(sessionId);
    res.json(docs);
});

/* Delete */
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

/* Ask */
app.post('/api/ask', async (req, res) => {
    const { question, targetDocIds } = req.body;

    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.status(503).json({
            error: 'AI service not configured.'
        });
    }

    try {
        const sessionId = req.headers['x-session-id'] || 'default';
        let userDocs = getSessionDocuments(sessionId);

        if (targetDocIds?.length > 0) {
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
                answer: "No documents available for analysis.",
                sources: []
            });
        }

        const questionTerms = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        const scoredChunks = allChunks.map(chunk => {
            let score = 0;
            const chunkLower = chunk.text.toLowerCase();
            questionTerms.forEach(term => {
                if (chunkLower.includes(term)) score++;
            });
            return { ...chunk, score };
        });

        const topChunks = scoredChunks
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        if (topChunks.length === 0) {
            return res.json({
                answer: "No relevant information found.",
                sources: []
            });
        }

        const contextText = topChunks
            .map((c, i) => `[Source ${i + 1} - ${c.name}]:\n${c.text}`)
            .join("\n\n");

        const prompt = `
        ROLE: You are an elite Intelligence Analyst.
        Use ONLY provided context.

        CONTEXT:
        ${contextText}

        QUESTION:
        ${question}

        ANSWER:
        `;

        const answerText = await callGroqAPI(prompt);

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
        res.status(500).json({ error: 'Internal server error' });
    }
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
