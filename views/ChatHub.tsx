
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Message, ChatSession } from '../types';

const ChatHub: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('omnimind_chat_sessions');
    return saved ? JSON.parse(saved).map((s: any) => ({
      ...s,
      updatedAt: new Date(s.updatedAt),
      messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
    })) : [];
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [useSearch, setUseSearch] = useState(true);
  const [attachment, setAttachment] = useState<{data: string, type: string} | null>(null);
  const [showMobileSessions, setShowMobileSessions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    localStorage.setItem('omnimind_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const startNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      messages: [],
      updatedAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setInput('');
    setShowMobileSessions(false);
    setErrorMessage(null);
  };

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

  const decodeAudio = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const createWavBlob = (pcmData: Uint8Array, sampleRate: number) => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, 36 + pcmData.length, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, pcmData.length, true);
    return new Blob([header, pcmData], { type: 'audio/wav' });
  };

  const speakMessage = async (msg: Message) => {
    if (speakingMsgId) return;
    setSpeakingMsgId(msg.id);

    const maxRetries = 2;
    let retryCount = 0;

    const performTts = async (): Promise<any> => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: msg.content }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Zephyr' },
              },
            },
          },
        });
        return response;
      } catch (error: any) {
        if (error?.status === 429 || error?.message?.includes('429')) {
          if (retryCount < maxRetries) {
            retryCount++;
            await delay(1000 * Math.pow(2, retryCount));
            return performTts();
          }
        }
        throw error;
      }
    };

    try {
      const response = await performTts();
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const pcmBytes = decodeAudio(base64Audio);
        const blob = createWavBlob(pcmBytes, 24000);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          setSpeakingMsgId(null);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } else {
        setSpeakingMsgId(null);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      setSpeakingMsgId(null);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || loading) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: sessionId,
        title: input.slice(0, 30) || 'Image Chat',
        messages: [],
        updatedAt: new Date()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(sessionId);
    }

    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: input, 
      timestamp: new Date(),
      parts: attachment ? [{ inlineData: { data: attachment.data.split(',')[1], mimeType: attachment.type } }] : []
    };

    setSessions(prev => prev.map(s => s.id === sessionId ? {
      ...s,
      messages: [...s.messages, userMsg],
      updatedAt: new Date(),
      title: s.messages.length === 0 ? (input.slice(0, 30) || 'Image Chat') : s.title
    } : s));

    const textToProcess = input;
    setInput('');
    setAttachment(null);
    setLoading(true);
    setErrorMessage(null);

    const maxRetries = 3;
    let retryCount = 0;

    const performChat = async (): Promise<any> => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const contents: any[] = [];
        const history = sessions.find(s => s.id === sessionId)?.messages || [];
        history.forEach(m => {
          contents.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] });
        });
        
        const currentParts: any[] = [{ text: textToProcess }];
        if (userMsg.parts?.[0]?.inlineData) {
          currentParts.push(userMsg.parts[0]);
        }
        contents.push({ role: 'user', parts: currentParts });

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: contents,
          config: {
            tools: useSearch ? [{ googleSearch: {} }] : [],
            thinkingConfig: { thinkingBudget: 4000 }
          }
        });
        return response;
      } catch (error: any) {
        if (error?.status === 429 || error?.message?.includes('429')) {
          if (retryCount < maxRetries) {
            retryCount++;
            const backoff = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            await delay(backoff);
            return performChat();
          }
          throw new Error("Quota exceeded. Please try again later.");
        }
        throw error;
      }
    };

    try {
      const response = await performChat();
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "I couldn't generate a response.",
        timestamp: new Date(),
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      };

      setSessions(prev => prev.map(s => s.id === sessionId ? {
        ...s,
        messages: [...s.messages, assistantMsg],
        updatedAt: new Date()
      } : s));
    } catch (error: any) {
      console.error('Chat Error:', error);
      setErrorMessage(error.message || "Failed to get a response.");
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  const SessionList = () => (
    <div className="flex flex-col h-full bg-[#020617]">
      <div className="p-4">
        <button 
          onClick={startNewChat}
          className="w-full py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-[#0ea5e9]/10"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="uppercase text-[11px] tracking-widest">New Chat</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
        {sessions.length === 0 && (
          <div className="p-4 text-center text-gray-600 text-xs uppercase font-black tracking-widest opacity-30">Empty Node</div>
        )}
        {sessions.map(s => (
          <button
            key={s.id}
            onClick={() => {
              setCurrentSessionId(s.id);
              setShowMobileSessions(false);
              setErrorMessage(null);
            }}
            className={`w-full text-left p-4 rounded-xl flex items-center justify-between group transition-all ${
              currentSessionId === s.id ? 'bg-[#1e293b] text-white' : 'text-gray-500 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center truncate">
              <span className="text-[11px] font-black uppercase truncate tracking-widest">{s.title}</span>
            </div>
            <div onClick={(e) => deleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex bg-[#020617] rounded-3xl overflow-hidden border border-[#1e293b] relative">
      
      {/* Mobile Sidebar Overlay */}
      {showMobileSessions && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 lg:hidden animate-in fade-in duration-300"
          onClick={() => setShowMobileSessions(false)}
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 z-[110] w-72 bg-[#020617] border-r border-[#1e293b] flex flex-col transition-transform duration-300 transform lg:hidden shadow-2xl ${
        showMobileSessions ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 flex items-center justify-between border-b border-[#1e293b]">
          <h4 className="text-white font-black text-xs uppercase tracking-widest">Conversations</h4>
          <button onClick={() => setShowMobileSessions(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SessionList />
      </div>

      {/* Desktop Sessions Sidebar */}
      <div className="w-72 bg-[#020617] border-r border-[#1e293b] flex flex-col hidden lg:flex shrink-0 overflow-hidden">
        <SessionList />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#020617] relative min-w-0 overflow-hidden">
        {errorMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md p-4 bg-red-600 text-white rounded-2xl shadow-2xl text-xs font-black uppercase text-center animate-in slide-in-from-top-4">
            {errorMessage}
            <button onClick={() => setErrorMessage(null)} className="ml-4 underline">Dismiss</button>
          </div>
        )}

        {!currentSessionId ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0f172a] sticky top-0 z-40">
              <div className="flex items-center space-x-3">
                <button onClick={() => setShowMobileSessions(true)} className="lg:hidden p-2 hover:bg-[#1e293b] rounded-lg text-gray-400 shrink-0">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h3 className="font-black text-white text-xs uppercase tracking-widest">Initialization Node</h3>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-10 animate-in fade-in duration-700">
              <div className="h-24 w-24 bg-[#0ea5e9]/5 rounded-[2.5rem] flex items-center justify-center border border-[#0ea5e9]/20">
                <svg className="h-12 w-12 text-[#0ea5e9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter">Ready to <span className="text-[#0ea5e9]">Converge.</span></h2>
                <p className="text-gray-500 max-w-md mx-auto text-sm font-medium">Deploy Gemini 3 Pro for complex reasoning, multimodal analysis, and high-performance scripting.</p>
              </div>
              
              <button onClick={startNewChat} className="px-12 py-5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-black rounded-2xl transition-all shadow-xl shadow-[#0ea5e9]/20 uppercase tracking-[0.2em] text-xs">
                Deploy Chat Node
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0f172a] sticky top-0 z-40">
              <div className="flex items-center space-x-3 overflow-hidden">
                <button onClick={() => setShowMobileSessions(true)} className="lg:hidden p-2 hover:bg-[#1e293b] rounded-lg text-gray-400 shrink-0">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="truncate">
                  <h3 className="font-black text-white text-xs uppercase tracking-widest truncate">{currentSession.title}</h3>
                  <div className="flex items-center text-[9px] text-emerald-500 uppercase tracking-widest font-black">
                    <span className="mr-1.5">●</span> Gemini 3.0 Pro Active
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4 shrink-0">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${useSearch ? 'text-[#0ea5e9]' : 'text-gray-600'}`}>Grounding</span>
                  <div onClick={() => setUseSearch(!useSearch)} className={`w-10 h-5 rounded-full transition-all relative ${useSearch ? 'bg-[#0ea5e9]' : 'bg-[#1e293b]'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useSearch ? 'left-6' : 'left-1'}`}></div>
                  </div>
                </label>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 custom-scrollbar bg-[#020617]">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-3xl p-6 shadow-xl leading-relaxed text-[15px] font-medium transition-all ${
                      msg.role === 'user' 
                        ? 'bg-[#0ea5e9] text-white rounded-br-none' 
                        : 'bg-[#1e293b] text-slate-100 border border-[#334155] rounded-bl-none'
                    }`}>
                      {msg.parts && msg.parts.map((part, i) => part.inlineData && (
                        <div key={i} className="mb-4 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                          <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="attachment" className="w-full h-auto" />
                        </div>
                      ))}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      
                      {msg.groundingMetadata?.groundingChunks && (
                        <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                          <p className="text-[10px] font-black uppercase text-[#0ea5e9] tracking-[0.2em] flex items-center">
                            Verified Knowledge Access
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => chunk.web && (
                              <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-[11px] bg-white/5 hover:bg-[#0ea5e9]/20 text-slate-400 hover:text-[#0ea5e9] px-3 py-1.5 rounded-lg border border-white/5 transition-all truncate max-w-xs">{chunk.web.title}</a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`flex mt-3 items-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <button onClick={() => speakMessage(msg)} disabled={speakingMsgId !== null} className="text-[#64748b] hover:text-[#0ea5e9] transition-colors">
                          {speakingMsgId === msg.id ? <div className="animate-pulse text-[10px] font-black uppercase">Speaking...</div> : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>}
                        </button>
                      )}
                      <span className="text-[10px] text-gray-700 font-black uppercase tracking-widest">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#1e293b] border border-[#334155] rounded-3xl rounded-tl-none p-6 flex items-center space-x-4 animate-pulse">
                    <div className="flex space-x-1.5">
                      <div className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-[11px] text-[#0ea5e9] font-black uppercase tracking-[0.3em]">Synthesizing Reasoning...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 bg-[#0f172a] border-t border-[#1e293b]">
              {attachment && (
                <div className="mb-6 flex items-center p-4 bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-2xl w-fit">
                  <img src={attachment.data} alt="thumb" className="h-12 w-12 rounded-xl object-cover mr-4 shadow-xl border border-white/5" />
                  <span className="text-[11px] text-[#0ea5e9] font-black uppercase tracking-widest mr-6">Visual Context Active</span>
                  <button onClick={() => setAttachment(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              )}
              
              <div className="relative flex items-end space-x-3">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-[#1e293b] border border-[#334155] text-slate-400 hover:text-white rounded-2xl shrink-0"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>
                <div className="flex-1 relative">
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} placeholder="Describe reasoning update..." className="w-full bg-[#1e293b] border border-[#334155] text-white rounded-2xl px-6 py-4.5 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 resize-none pr-14 min-h-[64px] max-h-60 text-base font-medium leading-relaxed" />
                  <button onClick={handleSend} disabled={loading || (!input.trim() && !attachment)} className="absolute right-3 bottom-3 p-3 bg-[#0ea5e9] text-white rounded-xl hover:bg-[#0284c7] disabled:opacity-30 transition-all shadow-xl active:scale-90"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatHub;
