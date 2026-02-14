import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  Upload, FileText, ArrowUp, Loader2, Plus, Trash2, 
  Menu, X, CheckCircle2, FileWarning, Check, Github, Moon, Sun, 
  Square, CheckSquare 
} from "lucide-react";
import { API_URL, SESSION_ID } from "./config.js";
import "./styles/global.css";

const App = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [chatHistory, setChatHistory] = useState([]); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [input, setInput] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chatContainerRef = useRef(null);
  useEffect(() => { fetchDocuments(); }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chatHistory, isProcessing]);

  // --- API ACTIONS ---
  const fetchDocuments = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/documents`, {
        headers: { "x-session-id": SESSION_ID },
      });
      setDocuments(data);
    } catch (err) { console.error(err); }
  };

  const validateAndUpload = async (file) => {
    const validTypes = ['text/plain', 'text/markdown'];
    const validExtensions = ['.txt', '.md'];
    const fileExtension = file.name.slice(((file.name.lastIndexOf(".") - 1) >>> 0) + 2);

    if (!validTypes.includes(file.type) && !validExtensions.includes(`.${fileExtension}`)) {
      setUploadError({
        title: "Wrong Format, Genius.",
        message: "I only eat .txt and .md files. Feed me properly or go away."
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_URL}/api/upload`, formData, { 
        headers: { "x-session-id": SESSION_ID },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      setUploadSuccess(true);
      await fetchDocuments();
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploading(false);
        setUploadSuccess(false);
        setUploadProgress(0);
      }, 1500);
    } catch (err) {
      setUploading(false);
      setUploadProgress(0);
      console.error("Upload failed", err);
    }
  };

  const handleUploadInput = (e) => {
    const file = e.target.files[0];
    if (file) validateAndUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  };

  const handleDeleteRequest = (e, doc) => {
    e.stopPropagation();
    setFileToDelete(doc);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      await axios.delete(`${API_URL}/api/documents/${fileToDelete.id}`, {
        headers: { "x-session-id": SESSION_ID },
      });
      setDocuments(prev => prev.filter(d => d.id !== fileToDelete.id));
      setSelectedDocIds(prev => prev.filter(docId => docId !== fileToDelete.id));
      setFileToDelete(null); 
    } catch (err) { console.error("Delete failed", err); }
  };

  const toggleDocument = (id) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
    );
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsProcessing(true);
    const currentQuery = input;
    setInput("");
    setIsMobileMenuOpen(false);
    
    try {
      const { data } = await axios.post(`${API_URL}/api/ask`, { 
        question: currentQuery,
        targetDocIds: selectedDocIds 
      }, {
        headers: { "x-session-id": SESSION_ID }
      });
      
      setChatHistory(prev => [...prev, { 
        question: currentQuery, 
        answer: data.answer, 
        sources: data.sources 
      }]);
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="h-screen w-screen theme-bg-main flex flex-col relative overflow-hidden p-4 lg:p-[24px]">
      <div className="portal-frame hidden lg:block"></div>

      {/* HEADER */}
      <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-12 z-20 theme-bg-main theme-border border-b">
        <div className="flex items-center gap-4 lg:gap-6">
          <h1 className="text-sm lg:text-base font-black uppercase tracking-[0.2em] theme-text-primary">QNDOCS</h1>
          
          <div className="hidden lg:block h-4 w-px bg-[var(--border-color)]"></div>
          
          <div className="hidden lg:flex items-center gap-2">
            <div className="status-dot animate-pulse"></div>
            <span className="mono-label !text-[9px]">Active Session</span>
          </div>

          <div className="hidden lg:block h-4 w-px bg-[var(--border-color)]"></div>

          {/* SOCIAL / CODE LINKS */}
          <div className="hidden lg:flex items-center gap-4">
            <a href="https://github.com/Synaptara" target="_blank" rel="noopener noreferrer" className="theme-text-secondary hover:theme-text-primary transition-colors">
              <Github size={18} />
            </a>
            {/* UPDATED CODE BUTTON */}
            <a 
              href="https://github.com/Synaptara/QNDOCS.git"
              className="text-[10px] font-bold theme-text-primary bg-[var(--border-color)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-main)] px-3 py-1.5 rounded-md transition-all uppercase tracking-wider"
            >
              CODE
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full theme-text-secondary hover:theme-text-primary hover:bg-[var(--bg-aside)] transition-all">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 theme-text-primary">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR */}
        <aside className={`
          absolute lg:static inset-0 z-30 theme-bg-aside flex flex-col 
          w-full lg:w-[380px] lg:theme-border lg:border-r p-8 lg:p-12 gap-8 lg:gap-12 
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-black theme-text-primary tracking-tighter">Upload Files.</h2>
            <p className="text-xs font-bold theme-text-secondary uppercase tracking-wider">Only .txt and .md formats allowed.</p>
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="w-full py-4 bg-[var(--btn-bg)] text-[var(--btn-text)] rounded-xl font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
            >
              <Plus size={18} /> Initialize Upload
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-6 lg:mb-8">
              <h3 className="mono-label">Uploaded Files</h3>
              {selectedDocIds.length > 0 && (
                <span className="text-[10px] font-bold theme-text-primary bg-[var(--border-color)] px-2 py-1 rounded-full cursor-pointer hover:opacity-80" onClick={() => setSelectedDocIds([])}>
                  Clear ({selectedDocIds.length})
                </span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
              {documents.map(doc => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div 
                    key={doc.id} 
                    onClick={() => toggleDocument(doc.id)}
                    className={`
                      group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                      ${isSelected ? 'theme-border theme-bg-main shadow-sm' : 'border-transparent hover:bg-[var(--border-color)]'}
                    `}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {/* NEW CHECKBOX UI */}
                      <div className={`transition-colors ${isSelected ? 'theme-text-primary' : 'theme-text-secondary group-hover:theme-text-primary'}`}>
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      
                      <FileText size={16} className="theme-text-secondary group-hover:theme-text-primary transition-colors shrink-0" />
                      
                      <span className={`text-sm font-bold truncate transition-colors ${isSelected ? 'theme-text-primary' : 'theme-text-secondary group-hover:theme-text-primary'}`}>
                        {doc.name}
                      </span>
                    </div>
                    <button onClick={(e) => handleDeleteRequest(e, doc)} className={`p-1.5 rounded-md transition-all ${isSelected ? 'text-gray-400 hover:text-red-600' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FOOTER */}
          <div className="pt-6 border-t theme-border">
            <p className="text-[10px] font-mono theme-text-muted text-center uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
              Made in love with Karthick.
            </p>
          </div>
        </aside>

        {/* MAIN INTERFACE */}
        <main className="flex-1 flex flex-col theme-bg-main relative p-6 lg:px-24 w-full">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto scroll-mask pb-10 pt-10">
            {chatHistory.length === 0 && !isProcessing && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-4">
                <h1 className="text-5xl lg:text-8xl font-black theme-text-primary tracking-tighter leading-[0.9] opacity-20">Grill Your Data.</h1>
                <p className="text-sm font-bold theme-text-secondary uppercase tracking-widest max-w-md">Make your text files confess their secrets. No bad cop required.</p>
              </div>
            )}

            {chatHistory.map((interaction, index) => (
              <div key={index} className="flex flex-col w-full mb-16 animate-slide">
                <div className="branch-container items-end mb-6">
                  <div className="relative max-w-full lg:max-w-3xl pr-6">
                    <div className="hidden lg:block branch-vertical-line"></div>
                    <h2 className="text-2xl lg:text-4xl font-extrabold theme-text-primary tracking-tight leading-tight text-right">
                      {interaction.question}
                    </h2>
                  </div>
                </div>

                <div className="hidden lg:block relative h-[2px] w-full bg-[var(--line-color)] mb-8">
                   <div className="branch-dot"></div> 
                </div>

                <div className="max-w-full lg:max-w-4xl text-left pl-0 mt-6 lg:mt-0">
                  <div className="text-base lg:text-xl font-medium theme-text-primary leading-relaxed tracking-tight mb-6">
                    {interaction.answer}
                  </div>
                  {interaction.sources?.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--border-color)]">
                      {interaction.sources.map((s, i) => (
                        <span key={i} className="text-[10px] font-bold theme-text-secondary uppercase tracking-widest border border-[var(--border-color)] px-2 py-1 rounded cursor-default">
                          {s.documentName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex flex-col justify-center animate-slide mt-8">
                <div className="w-12 h-1 bg-[var(--text-primary)] animate-pulse mb-4"></div>
                <h2 className="text-xl font-bold theme-text-primary tracking-tight">Interrogating files...</h2>
              </div>
            )}
          </div>

          {/* INPUT BAR */}
          <div className="relative z-20 pb-4 theme-bg-main">
            <form onSubmit={handleQuery} className="max-w-4xl mx-auto flex items-center gap-4 theme-bg-main border border-[var(--border-color)] rounded-[24px] p-2 pl-6 focus-within:border-[var(--text-primary)] transition-all shadow-2xl shadow-[var(--shadow-color)]">
              <input 
                type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={selectedDocIds.length > 0 ? `Querying ${selectedDocIds.length} active node(s)...` : "Query nodes..."}
                className="flex-1 bg-transparent border-none theme-text-primary focus:ring-0 outline-none text-lg font-bold tracking-tight placeholder:text-[var(--text-muted)]"
              />
              <button type="submit" className="w-14 h-14 bg-[var(--btn-bg)] text-[var(--btn-text)] rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl">
                <ArrowUp size={24} strokeWidth={3} />
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* --- MODALS  --- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="theme-bg-main w-full max-w-lg rounded-3xl p-10 shadow-2xl relative overflow-hidden flex flex-col gap-8 animate-in zoom-in-95 duration-300 outline-none border-none">
            {!uploading && !uploadSuccess && (
              <button onClick={() => setIsUploadModalOpen(false)} className="absolute top-6 right-6 theme-text-secondary hover:theme-text-primary transition-colors"><X size={24} /></button>
            )}
            <div className="space-y-2">
              <h2 className="text-3xl font-black theme-text-primary tracking-tight">Upload Matrix.</h2>
              <p className="text-sm font-bold theme-text-secondary">Drag .txt or .md files here.</p>
            </div>
            {!uploading && !uploadSuccess && (
              <>
                <label onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={handleDrop} className="group cursor-pointer block">
                  <div className="h-48 border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center gap-4 group-hover:border-[var(--text-primary)] group-hover:bg-[var(--bg-aside)] transition-all theme-bg-main">
                    <div className="w-16 h-16 bg-[var(--bg-aside)] rounded-full flex items-center justify-center group-hover:bg-[var(--text-primary)] group-hover:text-[var(--bg-main)] transition-all theme-text-primary"><Upload size={28} /></div>
                    <span className="mono-label theme-text-primary !text-xs">Select Files</span>
                  </div>
                  <input type="file" className="hidden" onChange={handleUploadInput} accept=".txt,.md" />
                </label>
                <div className="flex gap-4">
                  <button onClick={() => setIsUploadModalOpen(false)} className="flex-1 py-4 text-sm font-bold theme-text-secondary hover:bg-[var(--bg-aside)] rounded-xl transition-all">Cancel</button>
                </div>
              </>
            )}
            {uploading && !uploadSuccess && (
              <div className="h-48 flex flex-col items-center justify-center gap-6">
                <Loader2 size={48} className="animate-spin theme-text-primary" />
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs font-bold theme-text-primary uppercase tracking-widest"><span>Encrypting...</span><span>{uploadProgress}%</span></div>
                  <div className="w-full h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--text-primary)] transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              </div>
            )}
            {uploadSuccess && (
              <div className="h-48 flex flex-col items-center justify-center gap-4 animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-900/20"><Check size={40} className="text-white" /></div>
                <span className="text-lg font-bold theme-text-primary tracking-tight">Upload Complete</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CUSTOM DELETE POPUP --- */}
      {fileToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="theme-bg-main rounded-[32px] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-200 outline-none border-none">
             <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 shadow-sm"><Trash2 size={32} /></div>
             <div><h3 className="text-xl font-black theme-text-primary">Delete Node?</h3><p className="text-xs font-bold theme-text-secondary mt-2 uppercase tracking-wide">{fileToDelete.name}</p></div>
             <div className="flex gap-3 w-full">
               <button onClick={() => setFileToDelete(null)} className="flex-1 py-3 text-sm font-bold theme-text-secondary hover:bg-[var(--bg-aside)] rounded-xl transition-all">Cancel</button>
               <button onClick={confirmDelete} className="flex-1 py-3 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20">Delete</button>
             </div>
          </div>
        </div>
      )}

      {/* --- HUMOR ERROR POPUP --- */}
      {uploadError && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
          <div className="theme-bg-aside theme-text-primary p-6 rounded-2xl shadow-2xl pointer-events-auto max-w-sm w-full animate-in slide-in-from-bottom-10 fade-in duration-300 flex items-start gap-4 border theme-border">
            <div className="bg-red-500/20 p-2 rounded-lg text-red-500 shrink-0"><FileWarning size={24} /></div>
            <div>
              <h3 className="font-bold text-lg mb-1">{uploadError.title}</h3>
              <p className="text-sm theme-text-secondary leading-relaxed mb-4">{uploadError.message}</p>
              <button onClick={() => setUploadError(null)} className="text-xs font-bold uppercase tracking-widest theme-text-primary hover:theme-text-secondary border-b border-[var(--text-primary)] pb-0.5">I Understand</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;