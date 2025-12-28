
import React from 'react';
import { AppView } from '../types';

interface DashboardProps {
  onViewChange: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const features = [
    {
      id: AppView.CHAT,
      title: 'Multimodal Chat',
      desc: 'Reason with Gemini 3 Pro. Code, solve, and analyze with a massive thinking budget.',
      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
      color: 'indigo'
    },
    {
      id: AppView.IMAGE,
      title: 'Visionary Image Gen',
      desc: 'Generate photorealistic 4K imagery or edit existing visuals with natural language.',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      color: 'purple'
    },
    {
      id: AppView.VIDEO,
      title: 'Cinematic Motion',
      desc: 'Create high-definition video sequences using the revolutionary Veo 3 engine.',
      icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      color: 'pink'
    },
    {
      id: AppView.LIVE,
      title: 'Real-time Interaction',
      desc: 'Low-latency voice and vision sessions. Your always-on AI companion.',
      icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      color: 'blue'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <header className="mb-8 md:mb-12">
        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Creator.</span>
        </h2>
        <p className="mt-2 text-lg md:text-xl text-gray-500 font-medium">Your AI-powered ecosystem is ready.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 md:p-8 border border-indigo-500/20 flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] -mr-32 -mt-32"></div>
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
              Prime Engine
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">Reasoning Suite</h3>
            <p className="text-gray-400 mb-8 text-sm md:text-base leading-relaxed">Multimodal intelligence for high-stakes problem solving, coding, and creative architecture.</p>
          </div>
          <button 
            onClick={() => onViewChange(AppView.CHAT)}
            className="w-full md:w-fit px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all glow-button text-sm uppercase tracking-widest"
          >
            Enter Hub
          </button>
        </div>

        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 md:p-8 border border-purple-500/20 flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] -mr-32 -mt-32"></div>
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
              Next-Gen Media
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">Veo 3 Studio</h3>
            <p className="text-gray-400 mb-8 text-sm md:text-base leading-relaxed">Unleash cinematic potential with 1080p AI video generation. The future of motion is here.</p>
          </div>
          <button 
             onClick={() => onViewChange(AppView.VIDEO)}
             className="w-full md:w-fit px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all glow-button text-sm uppercase tracking-widest"
          >
            Explore Video
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => onViewChange(feature.id)}
            className="group text-left p-6 glass-panel rounded-3xl hover:bg-gray-800/40 transition-all border border-transparent hover:border-gray-700"
          >
            <div className={`h-12 w-12 rounded-2xl bg-${feature.color}-600/20 flex items-center justify-center mb-4 text-${feature.color}-400 group-hover:scale-110 group-hover:bg-${feature.color}-500/20 transition-all border border-${feature.color}-500/10`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
            <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
