
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Dashboard from './views/Dashboard';
import ChatHub from './views/ChatHub';
import ImageHub from './views/ImageHub';
import VideoHub from './views/VideoHub';
import AudioHub from './views/AudioHub';
import LiveHub from './views/LiveHub';
import CodeWizard from './views/CodeWizard';
import LoginView from './views/LoginView';
import { AppView } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    
    // Check if user has already authorized
    const storedToken = localStorage.getItem('omnimind_drive_token');
    if (storedToken) {
      setIsAuthenticated(true);
      setUserProfile(JSON.parse(localStorage.getItem('omnimind_user_profile') || '{}'));
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAuthSuccess = (profile: any) => {
    setIsAuthenticated(true);
    setUserProfile(profile);
    localStorage.setItem('omnimind_drive_token', 'connected_simulated');
    localStorage.setItem('omnimind_user_profile', JSON.stringify(profile));
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard onViewChange={setCurrentView} />;
      case AppView.CHAT:
        return <ChatHub />;
      case AppView.IMAGE:
        return <ImageHub />;
      case AppView.VIDEO:
        return <VideoHub />;
      case AppView.AUDIO:
        return <AudioHub />;
      case AppView.LIVE:
        return <LiveHub />;
      case AppView.CODE_WIZARD:
        return <CodeWizard />;
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  if (!isAuthenticated) {
    return <LoginView onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden text-gray-100 selection:bg-indigo-500/30">
      {/* Desktop & Tablet Sidebar */}
      {!isMobile && <Sidebar currentView={currentView} onViewChange={setCurrentView} userProfile={userProfile} />}
      
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <header className="h-14 border-b border-white/5 flex items-center justify-end px-6 glass-panel hidden md:flex">
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-indigo-400">Cloud Host Active</p>
              <p className="text-[9px] text-gray-500 font-bold">{userProfile?.name || 'User Drive'}</p>
            </div>
            <div className="h-8 w-8 rounded-full border border-indigo-500/30 overflow-hidden bg-gray-900 flex items-center justify-center">
              <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-0 ${isMobile ? 'pt-4' : 'pt-0'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            {renderView()}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileNav currentView={currentView} onViewChange={setCurrentView} />}
      </main>
    </div>
  );
};

export default App;
