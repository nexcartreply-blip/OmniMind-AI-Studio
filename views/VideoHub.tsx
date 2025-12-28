
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GeneratedVideo } from '../types';

const VideoHub: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateVideo = async () => {
    if ((!prompt.trim() && !base64Image) || loading) return;

    try {
      setLoading(true);
      setStatus('Initializing project...');
      
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
        // Proceed as instructed by assuming key selection was successful
      }

      // Create a fresh instance of GoogleGenAI to pick up the updated key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      setStatus('Directing Veo Engine...');
      
      const videoConfig: any = {
        model: 'veo-3.1-fast-generate-preview',
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio
        }
      };

      if (prompt.trim()) {
        videoConfig.prompt = prompt;
      }

      if (base64Image) {
        videoConfig.image = {
          imageBytes: base64Image.split(',')[1],
          mimeType: 'image/png',
        };
      }

      let operation = await ai.models.generateVideos(videoConfig);

      setStatus('Synthesizing motion frames...');
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(blob);

        const newVid: GeneratedVideo = {
          id: Date.now().toString(),
          url: videoUrl,
          prompt: prompt || 'Image animation',
          timestamp: new Date()
        };
        setVideos(prev => [newVid, ...prev]);
        setBase64Image(null);
        setPrompt('');
        setStatus('');
      }
    } catch (error: any) {
      console.error('Video Error:', error);
      
      // Robust detection of "Requested entity was not found" error
      let isNotFoundError = false;
      try {
        const errStr = typeof error === 'string' ? error : JSON.stringify(error);
        if (errStr.includes("Requested entity was not found")) {
          isNotFoundError = true;
        }
      } catch (e) {
        // Fallback checks
        if (error?.message?.includes("Requested entity was not found") || 
            error?.error?.message?.includes("Requested entity was not found")) {
          isNotFoundError = true;
        }
      }

      if (isNotFoundError) {
        // If 404 occurs, reset key state and prompt for a paid project key
        console.warn("Veo access denied or model not found. Requesting paid API key.");
        await (window as any).aistudio.openSelectKey();
      } else {
        alert('Failed to generate video. Ensure your account has access to the Veo engine.');
      }
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20">
      <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] border border-pink-500/20 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-pink-600/10 blur-[120px]"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 blur-[120px]"></div>
        
        <div className="relative z-10">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-3xl font-black text-white tracking-tight uppercase">Motion Studio</h3>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Veo 3 Motion Engine</p>
            </div>
            <div className="flex bg-gray-900/50 p-1 rounded-2xl border border-white/5">
               <button 
                onClick={() => setAspectRatio('16:9')}
                className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${aspectRatio === '16:9' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'text-gray-600 hover:text-gray-400'}`}
               >
                 Landscape (16:9)
               </button>
               <button 
                onClick={() => setAspectRatio('9:16')}
                className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${aspectRatio === '9:16' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'text-gray-600 hover:text-gray-400'}`}
               >
                 Portrait (9:16)
               </button>
            </div>
          </header>
          
          <div className="space-y-6">
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the cinematic action or upload an image to animate it..."
                className="w-full h-40 bg-gray-900/30 border border-white/5 text-white rounded-[2rem] px-8 py-6 focus:outline-none focus:ring-2 focus:ring-pink-500/30 transition-all resize-none text-lg leading-relaxed placeholder:text-gray-700"
              />
              <div className="absolute bottom-4 right-6 flex items-center space-x-3">
                 <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-3 rounded-2xl border border-white/10 transition-all active:scale-90 ${base64Image ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                  title="Upload Image Reference"
                 >
                   <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                 </button>
              </div>
            </div>

            {base64Image && (
              <div className="animate-in slide-in-from-top-4 duration-500">
                <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                     <div className="h-14 w-14 rounded-xl overflow-hidden border border-white/10">
                        <img src={base64Image} className="w-full h-full object-cover" alt="source" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-pink-400">Starting Frame Set</p>
                        <p className="text-xs text-gray-500">Image will be animated into motion</p>
                     </div>
                  </div>
                  <button onClick={() => setBase64Image(null)} className="p-2 hover:bg-white/5 rounded-full text-gray-600 hover:text-red-400 transition-all">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest max-w-xs">
                Tip: {base64Image ? "Detailed prompts help Veo 3 decide how the image should move." : "Describe lighting, textures, and camera movements for best results."}
              </p>
              <button
                onClick={generateVideo}
                disabled={loading || (!prompt.trim() && !base64Image)}
                className="w-full md:w-auto px-12 py-5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black rounded-3xl glow-button disabled:opacity-50 transition-all flex items-center justify-center uppercase tracking-widest text-xs"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {status || 'Rendering...'}
                  </>
                ) : base64Image ? 'Animate with Veo 3' : 'Generate Clip'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {videos.length > 0 && (
          <div className="flex items-center justify-between px-4">
             <h4 className="text-xl font-bold text-white">Project Timeline</h4>
             <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">{videos.length} Sequences</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-12">
          {videos.map((vid) => (
            <div key={vid.id} className="glass-panel rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#0d1221] group animate-in slide-in-from-bottom-8 duration-700">
              <div className="aspect-video bg-black relative">
                <video src={vid.url} controls className="w-full h-full" poster="https://picsum.photos/1920/1080?blur=10" />
              </div>
              <div className="p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="px-3 py-1 bg-pink-500/10 text-pink-400 text-[10px] font-black rounded-full border border-pink-500/20 uppercase tracking-widest">
                      Veo 3 Master
                    </span>
                    <span className="text-[10px] text-gray-600 font-bold">
                      {vid.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed italic">"{vid.prompt}"</p>
                </div>
                <a 
                  href={vid.url} 
                  download={`OmniMind_Veo_${vid.id}.mp4`} 
                  className="w-full md:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 transition-all text-center"
                >
                  Download Master
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoHub;
