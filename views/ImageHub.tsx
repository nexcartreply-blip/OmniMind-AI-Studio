
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GeneratedImage } from '../types';

const ImageHub: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [images, setImages] = useState<GeneratedImage[]>(() => {
    const saved = localStorage.getItem('omnimind_image_gallery');
    return saved ? JSON.parse(saved).map((img: any) => ({
      ...img,
      timestamp: new Date(img.timestamp)
    })) : [];
  });
  const [loading, setLoading] = useState(false);
  const [remixImage, setRemixImage] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('omnimind_image_gallery', JSON.stringify(images));
  }, [images]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRemixImage(reader.result as string);
        setSelectedImage(null);
        if (!prompt) setPrompt("Transform this style...");
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setSelectedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let contents: any;
      
      if (remixImage) {
        const base64Data = remixImage.split(',')[1];
        contents = {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/png' } },
            { text: prompt }
          ]
        };
      } else {
        contents = { parts: [{ text: prompt }] };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: contents,
        config: { imageConfig: { aspectRatio: aspectRatio as any } }
      });

      let imageUrl = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        const newImg: GeneratedImage = {
          id: Date.now().toString(),
          url: imageUrl,
          prompt: remixImage ? `Reference: ${prompt}` : prompt,
          timestamp: new Date(),
          aspectRatio: aspectRatio
        };
        setImages(prev => [newImg, ...prev]);
        setRemixImage(null);
        setSelectedImage(newImg);
      }
    } catch (error) {
      console.error('Image Error:', error);
      alert('Generation failed. Please refine your prompt.');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `OmniMind_${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex bg-[#050810] rounded-[2.5rem] overflow-hidden border border-white/5 relative shadow-2xl">
      
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />

      {/* Modern Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-72 bg-[#0a0f1d]/95 backdrop-blur-xl border-r border-white/5 transform transition-transform duration-500 lg:relative lg:translate-x-0 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Library</h4>
            <button onClick={() => setImages([])} className="text-[9px] font-bold text-gray-600 hover:text-red-500 transition-colors uppercase">Reset</button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
            {images.length === 0 && (
              <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                <span className="text-[10px] font-bold uppercase tracking-widest">No Creations</span>
              </div>
            )}
            {images.map((img) => (
              <div 
                key={img.id} 
                onClick={() => { setSelectedImage(img); setShowSidebar(false); }}
                className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 hover:scale-[1.02] ${
                  selectedImage?.id === img.id ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-transparent'
                }`}
              >
                <img src={img.url} className="w-full h-full object-cover" alt="prev" />
                <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setShowSidebar(false)} className="lg:hidden mt-4 w-full py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400">Close Gallery</button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Navigation */}
        <header className="px-6 py-5 flex items-center justify-between border-b border-white/5 bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <button onClick={() => setShowSidebar(true)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 transition-all active:scale-90">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-[0.2em]">Visionary Hub</h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Powered by Gemini 2.5 Flash</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => { setSelectedImage(null); setRemixImage(null); setPrompt(''); }} 
              className={`p-3 rounded-2xl transition-all active:scale-90 ${selectedImage ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500'}`}
              title="New Creation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {selectedImage ? (
            <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
              <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-[#0d1221]">
                <img src={selectedImage.url} className="w-full h-auto object-contain max-h-[70vh]" alt="final" />
                <div className="absolute bottom-6 right-6 flex space-x-3">
                  <button onClick={() => downloadImage(selectedImage.url, selectedImage.id)} className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-indigo-600 transition-all shadow-xl active:scale-90">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                  <button onClick={() => { setRemixImage(selectedImage.url); setPrompt(selectedImage.prompt); setSelectedImage(null); }} className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-purple-600 transition-all shadow-xl active:scale-90">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                </div>
              </div>
              <div className="mt-8 px-6">
                <p className="text-gray-400 text-sm italic font-medium leading-relaxed">"{selectedImage.prompt}"</p>
                <div className="flex items-center space-x-4 mt-6">
                   <div className="px-4 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest">{selectedImage.aspectRatio} Aspect</div>
                   <div className="px-4 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest">Masterpiece HD</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-10">
              
              <div className="text-center space-y-3">
                 <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 </div>
                 <h2 className="text-3xl font-black text-white tracking-tight">Imagine anything.</h2>
                 <p className="text-gray-500 text-sm font-medium">From text to photorealistic imagery in seconds.</p>
              </div>

              <div className="space-y-6">
                
                {/* Input Card */}
                <div className="bg-[#0d1221] border border-white/5 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative">
                  
                  {remixImage && (
                    <div className="mb-6 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-between animate-in slide-in-from-top-2">
                       <div className="flex items-center space-x-4">
                          <img src={remixImage} className="h-12 w-12 rounded-xl object-cover border border-white/10" alt="ref" />
                          <div>
                            <p className="text-[10px] font-black uppercase text-indigo-400">Reference Mode</p>
                            <p className="text-[11px] text-gray-500 font-medium">Refining based on visual source...</p>
                          </div>
                       </div>
                       <button onClick={() => setRemixImage(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-600">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                    </div>
                  )}

                  <div className="relative">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., 'A bioluminescent owl sitting on a glass branch in a neon forest'..."
                      className="w-full h-40 bg-transparent border-none text-white text-lg font-medium placeholder:text-gray-800 focus:outline-none resize-none leading-relaxed"
                    />
                    <div className="absolute bottom-0 right-0 p-2">
                       <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-white/5 hover:bg-white/10 text-indigo-400 rounded-2xl transition-all border border-white/5 active:scale-90"
                        title="Upload Base"
                       >
                         <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                       </button>
                    </div>
                  </div>
                </div>

                {/* Controls Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                   <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 block ml-1">Composition</label>
                      <div className="flex flex-wrap gap-2">
                        {['1:1', '16:9', '9:16', '4:3', '3:4'].map(r => (
                          <button 
                            key={r}
                            onClick={() => setAspectRatio(r)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border uppercase ${aspectRatio === r ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/10'}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                   </div>

                   <button 
                    onClick={generateImage}
                    disabled={loading || !prompt.trim()}
                    className={`h-16 px-10 rounded-[1.8rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center ${
                      loading 
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-500/20'
                    }`}
                   >
                     {loading ? (
                       <span className="flex items-center">
                          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing
                       </span>
                     ) : (
                       <span>Forgemaster</span>
                     )}
                   </button>
                </div>

                {/* Suggestions */}
                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  {['Cinematic', 'Hyper-realistic', 'Cyberpunk', 'Watercolor', 'Ukiyo-e'].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => setPrompt(prev => prev ? `${prev}, ${tag}` : tag)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[9px] font-bold text-gray-500 hover:text-indigo-400 transition-all uppercase tracking-widest"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageHub;
