
import React from 'react';
import { AppView } from '../types';

interface MobileNavProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: AppView.DASHBOARD, label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: AppView.CHAT, label: 'Chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: AppView.IMAGE, label: 'Forge', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: AppView.VIDEO, label: 'Video', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: AppView.CODE_WIZARD, label: 'Code', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    { id: AppView.LIVE, label: 'Live', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-gray-950/90 backdrop-blur-2xl border-t border-white/5 z-50 flex items-center justify-around px-1 overflow-x-auto no-scrollbar">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`flex flex-col items-center justify-center min-w-[60px] flex-1 h-full transition-all duration-300 ${
            currentView === item.id ? 'text-indigo-400' : 'text-gray-500'
          }`}
        >
          <div className={`p-1.5 md:p-2 rounded-2xl transition-all duration-300 ${
            currentView === item.id ? 'bg-indigo-500/10 scale-110' : 'group-hover:bg-white/5'
          }`}>
            <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
          </div>
          <span className="text-[9px] md:text-[10px] font-black mt-1 uppercase tracking-tighter">
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

export default MobileNav;
