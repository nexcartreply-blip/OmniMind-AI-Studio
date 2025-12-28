
import React, { useState } from 'react';

interface LoginViewProps {
  onAuthSuccess: (profile: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(false);

  const initiateGoogleAuth = () => {
    setLoading(true);
    // Simulating secure handshake for private hosting
    setTimeout(() => {
      onAuthSuccess({
        name: 'Admin Creator',
        email: 'private-node@drive.cloud',
        photo: ''
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="h-screen w-full bg-[#020617] flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="bg-[#0f172a] p-10 rounded-[2.5rem] border border-[#1e293b] shadow-2xl text-center space-y-10">
          <div className="inline-flex p-6 bg-[#38bdf8]/10 rounded-3xl border border-[#38bdf8]/20">
            <svg className="h-14 w-14 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-[0.9]">
              Private <br/><span className="text-[#38bdf8]">AI Drive.</span>
            </h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest px-4">
              Zero-Limit Personal Workspace
            </p>
          </div>

          <div className="bg-[#020617] p-8 rounded-3xl space-y-5 text-left border border-[#1e293b]">
            <div className="flex items-center space-x-4">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
              <p className="text-[10px] text-slate-100 font-black uppercase tracking-widest">Local Drive Sync Enabled</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
              <p className="text-[10px] text-slate-100 font-black uppercase tracking-widest">End-to-End Key Encryption</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
              <p className="text-[10px] text-slate-100 font-black uppercase tracking-widest">Unlimited Private Hosting</p>
            </div>
          </div>

          <button
            onClick={initiateGoogleAuth}
            disabled={loading}
            className="w-full py-6 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#020617] font-black rounded-3xl transition-all flex items-center justify-center space-x-4 uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#38bdf8]/10 active:scale-95"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deploying Node...
              </span>
            ) : (
              <span>Handshake with Drive</span>
            )}
          </button>
          
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">
             Authorized Personal Environment
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
