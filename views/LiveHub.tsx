import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

const LiveHub: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Manually implementing encode to avoid external library dependency
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Manually implementing decode to avoid external library dependency
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Function to decode raw PCM audio bytes into an AudioBuffer
  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const startSession = async () => {
    setErrorStatus(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices are not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              // CRITICAL: Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`, **do not** add other condition checks.
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => [...prev.slice(-4), `AI: ${message.serverContent?.outputTranscription?.text}`]);
            }
            if (message.serverContent?.inputTranscription) {
                setTranscription(prev => [...prev.slice(-4), `You: ${message.serverContent?.inputTranscription?.text}`]);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              // Schedule each new audio chunk to start at this time ensures smooth, gapless playback.
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Live Error:', e);
            setErrorStatus("Session encountered an error.");
          },
          onclose: () => {
            setIsActive(false);
            cleanup();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: "You are a friendly, real-time creative consultant."
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error('Failed to start Live session:', err);
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorStatus("Microphone not found. Please connect a mic and try again.");
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorStatus("Microphone permission denied. Please allow access in your browser.");
      } else {
        setErrorStatus(err.message || "Failed to access microphone.");
      }
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
    cleanup();
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700">
      <div className="relative">
        <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${
          isActive 
            ? 'bg-indigo-600/20 border-indigo-400 scale-110 shadow-[0_0_50px_rgba(99,102,241,0.5)]' 
            : errorStatus 
              ? 'bg-red-900/20 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
              : 'bg-gray-800 border-gray-700'
        }`}>
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-colors duration-500 ${
            isActive ? 'bg-indigo-500' : errorStatus ? 'bg-red-600' : 'bg-gray-700'
          }`}>
            <svg className={`h-16 w-16 text-white ${isActive ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        </div>
        {isActive && (
          <div className="absolute -top-4 -right-4">
             <span className="flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
            </span>
          </div>
        )}
      </div>

      <div className="text-center">
        <h3 className="text-3xl font-bold text-white mb-2">
          {isActive ? 'Session Active' : errorStatus ? 'Hardware Error' : 'Start Live Session'}
        </h3>
        <p className={`max-w-md mx-auto transition-colors ${errorStatus ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
          {isActive 
            ? 'Speak naturally. Gemini is listening and ready to respond instantly.' 
            : errorStatus
              ? errorStatus
              : 'Initiate a low-latency voice conversation with Gemini 2.5 Flash.'}
        </p>
      </div>

      <div className="w-full max-w-lg glass-panel p-6 rounded-2xl min-h-[120px] border border-indigo-500/10">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Live Feed</p>
        <div className="space-y-2">
          {transcription.length === 0 ? (
            <p className="text-gray-600 italic text-sm">
              {isActive ? 'Listening for your voice...' : 'Waiting for connection...'}
            </p>
          ) : (
            transcription.map((line, idx) => (
              <p key={idx} className={`text-sm animate-in slide-in-from-bottom-1 ${line.startsWith('AI:') ? 'text-indigo-400 font-medium' : 'text-gray-300'}`}>
                {line}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col items-center space-y-4 w-full">
        <button
          onClick={isActive ? stopSession : startSession}
          className={`px-12 py-4 rounded-full font-bold text-lg transition-all glow-button w-full sm:w-auto ${
            isActive 
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/40'
          }`}
        >
          {isActive ? 'End Conversation' : errorStatus ? 'Retry Connection' : 'Begin Experience'}
        </button>
        
        {errorStatus && (
          <button 
            onClick={() => setErrorStatus(null)}
            className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-4"
          >
            Clear error
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveHub;