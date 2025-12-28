
import React, { useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

interface AudioRecord {
  id: string;
  text: string;
  voice: string;
  url: string;
  timestamp: Date;
}

const AudioHub: React.FC = () => {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('Zephyr');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AudioRecord[]>([]);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Helper to create a WAV header for PCM data so browsers can handle it as a file
  const createWavBlob = (pcmData: Uint8Array, sampleRate: number) => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF identifier
    view.setUint32(0, 0x52494646, false);
    // file length
    view.setUint32(4, 36 + pcmData.length, true);
    // RIFF type
    view.setUint32(8, 0x57415645, false);
    // format chunk identifier
    view.setUint32(12, 0x666d7420, false);
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 is PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sampleRate * blockAlign)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channelCount * bytesPerSample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    view.setUint32(36, 0x64617461, false);
    // data chunk length
    view.setUint32(40, pcmData.length, true);

    const blob = new Blob([header, pcmData], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const generateSpeech = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly and naturally: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const pcmBytes = decode(base64Audio);
        const audioUrl = createWavBlob(pcmBytes, 24000);

        const newRecord: AudioRecord = {
          id: Date.now().toString(),
          text: text,
          voice: voice,
          url: audioUrl,
          timestamp: new Date()
        };

        setHistory(prev => [newRecord, ...prev]);
        setText(''); // Clear input for next use
        
        // Auto-play the new generation
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      console.error('Audio Error:', error);
      alert('Failed to synthesize speech. Check your connection or API key.');
    } finally {
      setLoading(false);
    }
  };

  const reuseRecord = (record: AudioRecord) => {
    setText(record.text);
    setVoice(record.voice);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Generator Section */}
      <div className="glass-panel p-8 rounded-[2rem] border border-blue-500/20 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32"></div>
        
        <h3 className="text-3xl font-bold text-white mb-8 flex items-center">
          <div className="p-3 bg-blue-600/20 rounded-2xl mr-4 border border-blue-500/30">
            <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          Audio Alchemy
        </h3>

        <div className="space-y-8">
          <div className="relative group">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Script Composition</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the text you want the AI to narrate..."
              className="w-full h-44 bg-gray-900/50 border border-gray-800 text-white rounded-3xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none text-lg leading-relaxed placeholder:text-gray-700"
            />
            <div className="absolute bottom-4 right-6 text-[10px] text-gray-600 font-mono">
              {text.length} characters
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Voice Profile</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'].map(v => (
                  <button
                    key={v}
                    onClick={() => setVoice(v)}
                    className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                      voice === v 
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' 
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={generateSpeech}
                disabled={loading || !text.trim()}
                className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all glow-button disabled:opacity-50 disabled:grayscale flex items-center justify-center min-w-[200px]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Synthesizing...
                  </>
                ) : 'Manifest Audio'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-xl font-bold text-white">Vocal Repository</h4>
          <span className="text-xs text-gray-500 uppercase tracking-widest">{history.length} Generations</span>
        </div>

        {history.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-[2rem] opacity-30">
            <svg className="h-16 w-16 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p className="text-gray-400 font-medium">No voices recorded yet. Command the AI to speak.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record) => (
              <div key={record.id} className="glass-panel p-6 rounded-3xl border border-gray-800 hover:border-blue-500/30 transition-all group animate-in slide-in-from-left-4 duration-500">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20 uppercase">
                        {record.voice}
                      </span>
                      <span className="text-[10px] text-gray-600 font-medium">
                        {record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm line-clamp-2 italic leading-relaxed">"{record.text}"</p>
                  </div>
                  
                  <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-4">
                    <audio 
                      src={record.url} 
                      controls 
                      className="h-10 w-full sm:w-64 accent-blue-500"
                    />
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => reuseRecord(record)}
                        className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl transition-all"
                        title="Reuse Text/Voice"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <a 
                        href={record.url} 
                        download={`OmniMind_Voice_${record.id}.wav`}
                        className="p-3 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl border border-blue-500/20 transition-all flex items-center space-x-2"
                        title="Download WAV"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="text-xs font-bold uppercase hidden sm:inline">Save</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioHub;
