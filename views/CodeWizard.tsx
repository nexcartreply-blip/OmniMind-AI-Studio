
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Message, CodeProject, CodeVersion, ProjectFile } from '../types';

type EditorTheme = 'dark' | 'light' | 'solarized';

const CodeWizard: React.FC = () => {
  const [projects, setProjects] = useState<CodeProject[]>(() => {
    const saved = localStorage.getItem('omnimind_code_projects_vfs');
    if (!saved) return [];
    try {
      return JSON.parse(saved).map((p: any) => ({
        ...p,
        updatedAt: new Date(p.updatedAt),
        history: (p.history || []).map((v: any) => ({ ...v, timestamp: new Date(v.timestamp) })),
        messages: p.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      }));
    } catch (e) {
      return [];
    }
  });

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projects.length > 0 ? projects[0].id : null);
  const [activeFileName, setActiveFileName] = useState<string>('index.html');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [editorTheme, setEditorTheme] = useState<EditorTheme>('dark');
  const [mobileTab, setMobileTab] = useState<'directives' | 'workspace'>('workspace');
  const [attachment, setAttachment] = useState<{data: string, type: string} | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentProject = projects.find(p => p.id === currentProjectId);
  const activeFile = currentProject?.files.find(f => f.name === activeFileName) || currentProject?.files[0];

  useEffect(() => {
    localStorage.setItem('omnimind_code_projects_vfs', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentProject?.messages, loading]);

  const themeStyles = {
    dark: {
      bg: 'bg-[#020617]',
      header: 'bg-[#0f172a]',
      sidebar: 'bg-[#020617]',
      text: 'text-slate-100',
      activeTab: 'bg-[#38bdf8] text-[#020617]',
      inactiveTab: 'text-slate-500 hover:text-white',
      border: 'border-[#1e293b]'
    },
    light: {
      bg: 'bg-white',
      header: 'bg-slate-100',
      sidebar: 'bg-slate-50',
      text: 'text-slate-900',
      activeTab: 'bg-slate-900 text-white',
      inactiveTab: 'text-slate-500 hover:text-slate-800',
      border: 'border-slate-200'
    },
    solarized: {
      bg: 'bg-[#002b36]',
      header: 'bg-[#073642]',
      sidebar: 'bg-[#001f27]',
      text: 'text-[#839496]',
      activeTab: 'bg-[#b58900] text-white',
      inactiveTab: 'text-[#586e75] hover:text-[#93a1a1]',
      border: 'border-[#073642]'
    }
  };

  const compiledHtml = useMemo(() => {
    if (!currentProject) return '';
    const htmlFile = currentProject.files.find(f => f.name.endsWith('.html'));
    if (!htmlFile) return '<!-- No index.html found -->';

    let content = htmlFile.content;
    const cssFiles = currentProject.files.filter(f => f.name.endsWith('.css'));
    const cssContent = cssFiles.map(f => `<style data-name="${f.name}">${f.content}</style>`).join('\n');
    content = content.replace('</head>', `${cssContent}\n</head>`);

    const jsFiles = currentProject.files.filter(f => f.name.endsWith('.js') || f.name.endsWith('.ts'));
    const jsContent = jsFiles.map(f => `<script data-name="${f.name}">${f.content}</script>`).join('\n');
    content = content.replace('</body>', `${jsContent}\n</body>`);

    return content;
  }, [currentProject]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment({
          data: reader.result as string,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProjectTitle = (newTitle: string) => {
    if (!currentProjectId) return;
    setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, title: newTitle } : p));
  };

  const copyProject = () => {
    if (!currentProject) return;
    const newId = Date.now().toString();
    const duplicated: CodeProject = {
      ...currentProject,
      id: newId,
      title: `${currentProject.title} (Copy)`,
      updatedAt: new Date(),
      history: []
    };
    setProjects(prev => [duplicated, ...prev]);
    setCurrentProjectId(newId);
    setShowSettings(false);
  };

  const downloadProject = () => {
    if (!currentProject) return;
    const projectData = currentProject.files.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join('\n\n');
    const blob = new Blob([projectData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentProject.title.replace(/\s+/g, '_')}_source.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const startNewProject = (initialPrompt: string = '') => {
    const newId = Date.now().toString();
    const newProject: CodeProject = {
      id: newId,
      title: initialPrompt ? (initialPrompt.slice(0, 25) + '...') : 'New Architecture',
      files: [
        { name: 'index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-slate-900 flex items-center justify-center h-screen">\n  <h1 class="text-3xl font-black text-white uppercase tracking-tighter">Private Engine Ready</h1>\n</body>\n</html>', language: 'html' }
      ],
      messages: [],
      updatedAt: new Date(),
      history: []
    };
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newId);
    setActiveFileName('index.html');
    setShowProjectList(false);
    if (initialPrompt) handleSend(initialPrompt, newId);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleSend = async (customInput?: string, overrideId?: string) => {
    const textToSend = customInput || input;
    const targetId = overrideId || currentProjectId;
    if ((!textToSend.trim() && !attachment) || loading || !targetId) return;

    setLoading(true);
    setErrorMessage(null);
    setInput('');
    const currentAttachment = attachment;
    setAttachment(null);
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: textToSend, 
      timestamp: new Date(),
      parts: currentAttachment ? [{ inlineData: { data: currentAttachment.data.split(',')[1], mimeType: currentAttachment.type } }] : []
    };

    setProjects(prev => prev.map(p => p.id === targetId ? {
      ...p,
      messages: [...p.messages, userMsg],
      updatedAt: new Date()
    } : p));

    const maxRetries = 5; // Increased for "unlimited" perception
    let retryCount = 0;

    const performRequest = async (): Promise<any> => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const proj = projects.find(p => p.id === targetId);
      
      const promptParts: any[] = [{ text: `VFS ARCHITECTURE STATE: ${JSON.stringify(proj?.files)}\n\nUSER DIRECTIVE: ${textToSend}` }];
      if (userMsg.parts?.[0]) {
        promptParts.push(userMsg.parts[0]);
      }

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: [{ role: 'user', parts: promptParts }],
          config: {
            systemInstruction: `You are the OmniMind VFS Core. Operate as a private server extension. 
            Provide a JSON object containing "explanation" and a "files" array.
            Maintain a professional, high-performance architecture.`,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                  explanation: { type: Type.STRING },
                  files: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              name: { type: Type.STRING },
                              content: { type: Type.STRING },
                              language: { type: Type.STRING }
                          },
                          required: ["name", "content", "language"]
                      }
                  }
              },
              required: ["explanation", "files"]
            }
          }
        });
        return response;
      } catch (error: any) {
        if (error?.status === 429 || error?.message?.includes('429')) {
          if (retryCount < maxRetries) {
            retryCount++;
            const backoff = Math.pow(2, retryCount) * 1000;
            console.warn(`Node busy. Scaling private capacity in ${backoff}ms...`);
            await delay(backoff);
            return performRequest();
          }
          throw new Error("Local Node is at peak capacity. Refactor and try again in a few seconds.");
        }
        throw error;
      }
    };

    try {
      const response = await performRequest();
      const result = JSON.parse(response.text || '{}');
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.explanation || "Architecture updated successfully.",
        timestamp: new Date()
      };

      setProjects(prev => prev.map(p => p.id === targetId ? {
        ...p,
        files: result.files || p.files,
        messages: [...p.messages, assistantMsg],
        history: [...p.history, { id: Date.now().toString(), files: result.files, timestamp: new Date(), prompt: textToSend }],
        updatedAt: new Date(),
        title: p.messages.length === 0 ? (textToSend.slice(0, 25) || 'VFS Project') : p.title
      } : p));

      if (result.files?.[0]) setActiveFileName(result.files[0].name);

    } catch (error: any) {
      setErrorMessage(error.message || "Encryption error in private tunnel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex bg-[#020617] rounded-3xl border border-[#1e293b] overflow-hidden shadow-2xl relative select-none">
      
      {/* Sidebar - Solid Professional */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-72 bg-[#020617] border-r border-[#1e293b] flex flex-col transition-transform duration-300 transform lg:relative lg:translate-x-0 ${showProjectList ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-[#1e293b] flex items-center justify-between">
            <h4 className="text-[#94a3b8] font-black text-[11px] uppercase tracking-[0.3em]">Node Registry</h4>
            <button onClick={() => startNewProject()} className="p-2.5 bg-[#38bdf8]/10 text-[#38bdf8] hover:bg-[#38bdf8] hover:text-[#020617] rounded-xl transition-all active:scale-90"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {projects.map(p => (
                <button key={p.id} onClick={() => { setCurrentProjectId(p.id); setShowProjectList(false); }} className={`w-full text-left p-5 rounded-2xl transition-all border ${currentProjectId === p.id ? 'bg-[#0f172a] text-white border-[#38bdf8]/50 shadow-xl shadow-[#38bdf8]/5' : 'text-[#475569] border-transparent hover:bg-[#0f172a]/50 hover:text-slate-300'}`}>
                    <div className="text-xs font-black uppercase truncate tracking-widest">{p.title}</div>
                    <div className="text-[9px] opacity-60 mt-1.5 font-bold uppercase tracking-widest">{p.files.length} Source Segments</div>
                </button>
            ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative min-w-0 bg-[#020617]">
        {/* Header - No Transparency */}
        <header className="h-20 border-b border-[#1e293b] flex items-center justify-between px-8 bg-[#0f172a] relative z-50">
           <div className="flex items-center space-x-6 overflow-hidden">
              <button onClick={() => setShowProjectList(!showProjectList)} className="p-3 text-[#38bdf8] hover:bg-[#38bdf8]/10 rounded-2xl transition-all shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <div className="flex flex-col truncate">
                <h3 className="text-[15px] font-black text-white uppercase tracking-widest truncate">{currentProject?.title || "Node Initializing"}</h3>
                <div className="flex items-center space-x-2 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Drive Sync Live</span>
                </div>
              </div>
           </div>
           
           <div className="flex items-center space-x-4 shrink-0">
              <button onClick={() => { setShowHistory(true); setShowSettings(false); }} className="p-3 text-slate-500 hover:text-[#38bdf8] transition-all" title="Registry History">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
              <button onClick={() => { setShowSettings(true); setShowHistory(false); }} className="p-3 text-slate-500 hover:text-[#38bdf8] transition-all" title="Node Management">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
           </div>
        </header>

        {currentProjectId ? (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#020617]">
            
            <div className="flex lg:hidden border-b border-[#1e293b] shrink-0">
                <button onClick={() => setMobileTab('directives')} className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${mobileTab === 'directives' ? 'border-[#38bdf8] text-[#38bdf8] bg-[#0f172a]' : 'border-transparent text-slate-600'}`}>Directives</button>
                <button onClick={() => setMobileTab('workspace')} className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${mobileTab === 'workspace' ? 'border-[#38bdf8] text-[#38bdf8] bg-[#0f172a]' : 'border-transparent text-slate-600'}`}>Private Canvas</button>
            </div>

            {/* Directives Pane */}
            <div className={`w-full lg:w-[480px] lg:border-r border-[#1e293b] flex flex-col bg-[#0f172a] ${mobileTab === 'directives' ? 'flex h-full' : 'hidden lg:flex'}`}>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 md:p-10 space-y-12 custom-scrollbar">
                    {errorMessage && (
                      <div className="p-5 bg-red-600/10 border border-red-500/30 rounded-2xl text-red-400 text-[12px] font-black uppercase tracking-widest leading-relaxed text-center animate-in slide-in-from-top-4">
                        SYSTEM ALERT: {errorMessage}
                      </div>
                    )}
                    {currentProject.messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
                            <svg className="h-24 w-24 mb-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <p className="text-[12px] font-black uppercase tracking-[0.4em] text-white italic">Core Listening...</p>
                        </div>
                    )}
                    {currentProject.messages.map(m => (
                        <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-6 rounded-2xl text-[14px] leading-relaxed max-w-[95%] shadow-xl transition-all select-text font-medium ${m.role === 'user' ? 'bg-[#38bdf8] text-[#020617] rounded-br-none' : 'bg-[#1e293b] text-slate-100 border border-[#334155] rounded-bl-none'}`}>
                                {m.parts && m.parts.map((p: any, i: number) => p.inlineData && (
                                  <div key={i} className="mb-5 rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                                    <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="w-full h-auto" alt="architecture-ref" />
                                  </div>
                                ))}
                                {m.content}
                            </div>
                            <span className="text-[9px] font-black text-slate-600 uppercase mt-3 px-3 tracking-[0.3em]">{m.role === 'user' ? 'PRIMARY ARCHITECT' : 'OMNIMIND VFS CORE'}</span>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex items-center space-x-5 p-7 bg-[#38bdf8]/5 rounded-2xl border border-[#38bdf8]/10 animate-pulse">
                            <div className="h-2.5 w-2.5 bg-[#38bdf8] rounded-full animate-bounce"></div>
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#38bdf8]">Compiling Architectural Segments...</span>
                        </div>
                    )}
                </div>
                {/* Input Control - Solid Slate */}
                <div className="p-8 md:p-10 bg-[#0f172a] border-t border-[#1e293b]">
                    {attachment && (
                      <div className="mb-6 p-4 bg-[#38bdf8]/10 border border-[#38bdf8]/20 rounded-2xl flex items-center justify-between">
                         <div className="flex items-center space-x-5">
                            <img src={attachment.data} className="h-16 w-16 rounded-xl object-cover border border-white/10 shadow-lg" alt="vfs-attachment" />
                            <span className="text-[10px] font-black uppercase text-[#38bdf8] tracking-[0.2em]">Visual Data Stream Active</span>
                         </div>
                         <button onClick={() => setAttachment(null)} className="p-2.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-red-400 transition-all"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    )}
                    <div className="relative flex items-end space-x-4">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                        <button onClick={() => fileInputRef.current?.click()} className="p-5 bg-[#1e293b] border border-[#334155] text-slate-400 hover:text-[#38bdf8] rounded-2xl transition-all shrink-0 active:scale-95 shadow-lg"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>
                        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} placeholder="Deploy new code directive..." className="w-full bg-[#1e293b] border border-[#334155] text-white rounded-2xl px-7 py-5 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 min-h-[68px] md:min-h-[76px] resize-none leading-relaxed placeholder:text-slate-700 font-bold shadow-inner" />
                        <button onClick={() => handleSend()} disabled={loading || (!input.trim() && !attachment)} className="p-5 bg-[#38bdf8] text-[#020617] rounded-2xl hover:bg-[#0ea5e9] transition-all shadow-xl shadow-[#38bdf8]/10 shrink-0 active:scale-90"><svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg></button>
                    </div>
                </div>
            </div>

            {/* Canvas Workspace - Absolute Clarity */}
            <div className={`flex-1 bg-white relative flex flex-col overflow-hidden ${mobileTab === 'workspace' ? 'flex h-full' : 'hidden lg:flex'}`}>
                <div className="h-12 bg-slate-100 flex items-center px-8 border-b border-slate-200 shrink-0 select-none">
                    <div className="flex space-x-2 mr-8">
                      <div className="h-3.5 w-3.5 rounded-full bg-red-500"></div>
                      <div className="h-3.5 w-3.5 rounded-full bg-amber-500"></div>
                      <div className="h-3.5 w-3.5 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] truncate">
                        PRIVATE VFS STAGE - vfs://{currentProject?.title.toLowerCase().replace(/\s+/g, '-')}/index.html
                    </div>
                </div>
                <iframe srcDoc={compiledHtml} className="w-full flex-1 border-none bg-white" title="Private Architecture View" />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#020617] select-none">
             <div className="max-w-2xl w-full space-y-12 animate-in fade-in duration-1000">
                <div className="h-32 w-32 mx-auto bg-[#38bdf8]/5 rounded-[2.5rem] flex items-center justify-center border border-[#38bdf8]/10 shadow-2xl">
                    <svg className="h-16 w-16 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                </div>
                <div className="space-y-4">
                  <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-[0.8]">VFS<br/><span className="text-[#38bdf8]">Core.</span></h2>
                  <p className="text-slate-500 text-base md:text-xl font-bold uppercase tracking-widest max-w-lg mx-auto leading-relaxed pt-6">Establish a secure node to host your unlimited web architectures.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-5">
                    {['Enterprise SaaS', 'Node Hub', 'Web3 Matrix'].map(t => (
                        <button key={t} onClick={() => startNewProject(`Deploy an elite ${t} architecture`)} className="px-10 py-5 bg-[#0f172a] border border-[#1e293b] rounded-2xl text-[11px] md:text-[12px] font-black uppercase text-[#38bdf8] hover:border-[#38bdf8]/40 hover:bg-[#38bdf8]/5 transition-all shadow-xl active:scale-95 tracking-[0.2em]">+ {t}</button>
                    ))}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Editor Overlay - Total Clarity */}
      {showCodeEditor && currentProject && (
        <div className={`fixed inset-0 z-[300] ${themeStyles[editorTheme].bg} flex flex-col animate-in slide-in-from-bottom-5 duration-300 select-text`}>
            <header className={`h-20 border-b ${themeStyles[editorTheme].border} flex items-center justify-between px-10 ${themeStyles[editorTheme].header}`}>
                <div className="flex items-center space-x-8 overflow-x-auto no-scrollbar py-2">
                    <div className={`flex items-center space-x-4 pr-8 border-r ${themeStyles[editorTheme].border} shrink-0`}>
                        <svg className="h-7 w-7 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                        <h4 className={`text-sm font-black uppercase tracking-[0.3em] ${editorTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>Source Core</h4>
                    </div>
                    {currentProject.files.map(f => (
                        <button key={f.name} onClick={() => setActiveFileName(f.name)} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.3em] rounded-xl transition-all ${activeFileName === f.name ? themeStyles[editorTheme].activeTab : themeStyles[editorTheme].inactiveTab}`}>
                            {f.name}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center space-x-6 shrink-0">
                    <div className="flex items-center space-x-2 bg-black/30 p-1.5 rounded-2xl border border-white/5">
                        {(['dark', 'light', 'solarized'] as EditorTheme[]).map(t => (
                            <button 
                                key={t} 
                                onClick={() => setEditorTheme(t)} 
                                className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${editorTheme === t ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-white'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => setShowCodeEditor(false)} className={`p-4 bg-white/5 hover:bg-red-600 rounded-2xl transition-all ${editorTheme === 'light' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-white shadow-xl'}`}>
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </header>
            <div className="flex-1 flex overflow-hidden">
                <div className={`w-72 border-r ${themeStyles[editorTheme].border} ${themeStyles[editorTheme].sidebar} hidden lg:flex flex-col select-none`}>
                    <div className="p-8 text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">Node Segments</div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {currentProject.files.map(f => (
                            <button key={f.name} onClick={() => setActiveFileName(f.name)} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center space-x-4 transition-all border ${activeFileName === f.name ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/30' : 'text-slate-600 border-transparent hover:bg-black/10'}`}>
                                <svg className="h-5 w-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                <span className="text-[11px] font-black uppercase tracking-widest truncate">{f.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className={`flex-1 font-mono p-10 md:p-20 overflow-auto custom-scrollbar select-text ${themeStyles[editorTheme].text} text-sm md:text-base leading-relaxed`}>
                    <pre className="whitespace-pre-wrap">{activeFile?.content || "// Segment empty."}</pre>
                </div>
            </div>
        </div>
      )}

      {/* Snapshot Registry - Solid Right */}
      <div className={`fixed lg:absolute top-0 right-0 h-full w-full sm:w-[420px] bg-[#0f172a] border-l border-[#1e293b] z-[200] transition-transform duration-500 shadow-2xl ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-10 border-b border-[#1e293b] flex items-center justify-between select-none">
              <h4 className="text-white font-black text-sm uppercase tracking-[0.4em]">Historical Registry</h4>
              <button onClick={() => setShowHistory(false)} className="p-4 text-slate-500 hover:text-white transition-all"><svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-5 custom-scrollbar bg-[#0f172a]">
             {currentProject?.history.slice().reverse().map((v, i) => (
                <div key={v.id} className="p-8 bg-[#020617] border border-[#1e293b] rounded-[2.5rem] hover:border-[#38bdf8]/50 transition-all">
                    <div className="text-[10px] font-black uppercase text-[#38bdf8] mb-4 tracking-[0.3em]">REVISION v.{currentProject.history.length - i}</div>
                    <div className="text-xs text-slate-400 line-clamp-2 mb-6 font-bold leading-relaxed italic">"{v.prompt}"</div>
                    <button onClick={() => { setProjects(prev => prev.map(p => p.id === currentProjectId ? {...p, files: v.files} : p)); setShowHistory(false); }} className="w-full py-5 bg-[#38bdf8]/10 text-[#38bdf8] text-[10px] font-black uppercase rounded-2xl border border-[#38bdf8]/20 hover:bg-[#38bdf8] hover:text-[#020617] transition-all tracking-[0.3em] shadow-lg shadow-[#38bdf8]/5">Sync with node</button>
                </div>
             ))}
          </div>
      </div>

      {/* Management Suite - OPAQUE SLATE */}
      <div className={`fixed lg:absolute top-0 right-0 h-full w-full sm:w-[550px] bg-[#0f172a] border-l border-[#1e293b] z-[200] transition-transform duration-500 shadow-2xl ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-10 border-b border-[#1e293b] flex items-center justify-between bg-[#0f172a] select-none">
              <h4 className="text-white font-black text-xl uppercase tracking-[0.4em]">Management Suite</h4>
              <button onClick={() => setShowSettings(false)} className="p-4 text-slate-500 hover:text-white transition-all"><svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar bg-[#0f172a]">
              <div className="space-y-5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Node Identity</label>
                  <input type="text" value={currentProject?.title || ''} onChange={(e) => updateProjectTitle(e.target.value)} className="w-full bg-[#020617] border border-[#1e293b] text-white px-10 py-7 rounded-[2rem] text-lg font-black focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 shadow-inner tracking-widest uppercase" placeholder="NODE NAME..." />
              </div>

              <button onClick={() => { setShowCodeEditor(true); setShowSettings(false); }} className="w-full p-12 bg-[#38bdf8] text-[#020617] rounded-[3rem] shadow-2xl flex flex-col items-center justify-center space-y-5 hover:bg-[#0ea5e9] transition-all group active:scale-95 select-none">
                  <svg className="h-16 w-16 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  <div className="text-center">
                    <span className="text-[18px] font-black uppercase tracking-[0.5em] block">Source Core</span>
                    <span className="text-[10px] opacity-70 font-black uppercase tracking-[0.3em] mt-2 block">Direct VFS Manipulation</span>
                  </div>
              </button>

              <div className="space-y-5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Operational Protocol</label>
                  <div className="grid grid-cols-2 gap-5">
                      <button onClick={copyProject} className="flex flex-col items-center justify-center p-10 bg-[#020617] border border-[#1e293b] rounded-[2.5rem] hover:bg-[#1e293b] hover:border-[#38bdf8]/30 transition-all group active:scale-95">
                          <svg className="h-10 w-10 mb-5 text-[#38bdf8] group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                          <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Clone Node</span>
                      </button>
                      <button onClick={downloadProject} className="flex flex-col items-center justify-center p-10 bg-[#020617] border border-[#1e293b] rounded-[2.5rem] hover:bg-[#1e293b] hover:border-[#38bdf8]/30 transition-all group active:scale-95">
                          <svg className="h-10 w-10 mb-5 text-[#38bdf8] group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Export VFS</span>
                      </button>
                  </div>
              </div>

              <div className="bg-[#020617] border border-[#1e293b] rounded-[3rem] p-10 select-none">
                  <h5 className="text-[11px] font-black text-white uppercase mb-8 tracking-[0.5em] text-center border-b border-[#1e293b] pb-5">Operational Diagnostics</h5>
                  <div className="space-y-6">
                      <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-[11px] font-black uppercase tracking-widest">Segment Allocation</span>
                          <span className="text-[#38bdf8] font-black text-sm uppercase tracking-widest">{currentProject?.files.length || 0} SECTIONS</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-[11px] font-black uppercase tracking-widest">Snapshot Depth</span>
                          <span className="text-[#38bdf8] font-black text-sm uppercase tracking-widest">{currentProject?.history.length || 0} LAYERS</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                          <span className="text-slate-600 text-[11px] font-black uppercase tracking-widest">Encryption Key</span>
                          <span className="text-[#38bdf8] font-mono text-[11px] uppercase tracking-widest">{currentProject?.id.slice(-12)}</span>
                      </div>
                  </div>
              </div>

              <div className="pt-10 space-y-6">
                  <button onClick={() => { setProjects(prev => prev.filter(p => p.id !== currentProjectId)); setCurrentProjectId(projects[0]?.id || null); setShowSettings(false); }} className="w-full py-7 bg-red-600 hover:bg-red-700 text-white text-[12px] font-black uppercase rounded-[2rem] transition-all tracking-[0.3em] shadow-xl shadow-red-900/20 active:scale-95">
                      Wipe Private Node
                  </button>
                  <p className="text-[10px] text-slate-700 text-center font-black uppercase tracking-[0.4em] leading-relaxed">System state is encrypted and hosted in your private drive vault.</p>
              </div>
          </div>
      </div>

    </div>
  );
};

export default CodeWizard;
