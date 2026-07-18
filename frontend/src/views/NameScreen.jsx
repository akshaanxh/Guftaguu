import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CatLogo, GlassCard, GlowButton } from '../components/ui';

export const NameScreen = ({ onStart }) => {
    const [name, setName] = useState("");
    
    return (
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-6 relative z-10 overflow-hidden">
            {/* Soft Ambient Orbs */}
            <div className="absolute top-10 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />
            <div className="absolute bottom-10 left-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: '9s' }} />

            <GlassCard className="w-full max-w-lg p-10 text-center relative z-10 hover:border-white/15 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(168,85,247,0.08)]">
                <div className="relative group mb-6 inline-block mx-auto">
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <CatLogo className="w-20 h-20 relative z-10 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3" />
                </div>
                <h2 className="text-4xl font-display font-bold mb-2 tracking-tight uppercase text-creative-hero">Welcome</h2>
                <p className="text-zinc-400 mb-8 text-sm">Choose a display name to begin.</p>
                
                <input 
                    type="text" 
                    placeholder="Enter your name..." 
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-4 text-center text-white text-lg focus:outline-none focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 mb-6 placeholder:text-zinc-700 font-medium" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && name.trim() && onStart(name)}
                />
                
                <GlowButton 
                    onClick={() => name.trim() && onStart(name)} 
                    disabled={!name.trim()} 
                    className={`w-full font-creative-button transition-all duration-500 ${name.trim() ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:scale-[1.02]' : 'bg-zinc-800 text-zinc-500 border border-white/5'}`}
                >
                    Start Chatting
                </GlowButton>
            </GlassCard>
            
            <footer className="mt-12 text-xs text-zinc-500 flex gap-4 items-center bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                <Link to="/privacy" className="hover:text-white transition duration-200">Privacy Policy</Link>
                <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                <Link to="/terms" className="hover:text-white transition duration-200">Terms of Service</Link>
            </footer>
        </div>
    );
};

export default NameScreen;

# NOTE: aligned with design spec v3
