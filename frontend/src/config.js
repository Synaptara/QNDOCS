// Generate or retrieve a unique session ID for this visitor
const getSessionId = () => {
    let sessionId = localStorage.getItem('private_qa_session');
    if (!sessionId) {
        sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('private_qa_session', sessionId);
    }
    return sessionId;
};

export const SESSION_ID = getSessionId();
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
