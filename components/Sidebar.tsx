
import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  userProfile?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, userProfile }) => {
  const navItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: AppView.CHAT, label: 'Chat & Code', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: AppView.IMAGE, label: 'Image Forge', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: AppView.VIDEO, label: 'Video Studio', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: AppView.AUDIO, label: 'Audio Alchemy', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
    { id: AppView.LIVE, label: 'Live Pulse', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: AppView.CODE_WIZARD, label: 'CodeWizard', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  ];

  return (
    <aside className="lg:w-64 md:w-20 glass-panel border-r border-gray-800 flex flex-col transition-all duration-300">
      <div className="p-6 flex items-center overflow-hidden">
        <div className="h-8 w-8 bg-indigo-600 rounded-lg flex-shrink-0 flex items-center justify-center mr-3 shadow-lg shadow-indigo-600/30">
          <span className="text-white font-black text-xl">O</span>
        </div>
        <div className="lg:block hidden">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent truncate">
            OmniMind
          </h1>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-x-hidden overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            title={item.label}
            className={`w-full flex items-center p-3 lg:px-4 lg:py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
              currentView === item.id
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
            }`}
          >
            <svg className="h-6 w-6 lg:h-5 lg:w-5 flex-shrink-0 lg:mr-3 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            <span className="lg:block hidden truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      {userProfile && (
        <div className="p-4 border-t border-gray-800 lg:block hidden">
          <div className="bg-indigo-600/5 rounded-2xl p-4 border border-indigo-500/10">
            <div className="flex items-center space-x-3">
               <div className="h-8 w-8 bg-gray-800 rounded-lg border border-white/5 flex items-center justify-center">
                  <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
               </div>
               <div className="truncate">
                  <p className="text-[10px] font-black uppercase text-gray-500 leading-none mb-1">Vault Storage</p>
                  <p className="text-[11px] text-white font-bold truncate tracking-tight">{userProfile.email}</p>
               </div>
            </div>
            <div className="mt-3 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
               <div className="w-[12%] h-full bg-indigo-500 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-800 lg:hidden flex justify-center">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
      </div>
    </aside>
  );
};

export default Sidebar;
