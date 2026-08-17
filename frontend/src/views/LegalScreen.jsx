import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, FileText, Info, CheckCircle } from 'lucide-react';
import { CatLogo, GlassCard, GlowButton } from '../components/ui';
import { VisitorStatsWidget } from '../components/VisitorStatsWidget';
import { CommunityNote } from '../components/CommunityNote';

export const LegalScreen = ({ onAgree }) => {
    const [checked, setChecked] = useState(false);
    return (
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-4 sm:p-6 relative z-10 overflow-y-auto py-12">
            {/* Soft Ambient Orbs */}
            <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
            
            {/* Live Visitor Counter & Geolocation Badge */}
            <VisitorStatsWidget className="mb-6" />

            {/* Header section with interactive logo */}
            <div className="relative group mb-4 flex flex-col items-center">
                <div className="absolute inset-0 bg-white/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <CatLogo className="w-20 h-20 relative z-10 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-2 tracking-tighter text-creative-hero">Guftaguu</h1>
            <p className="text-zinc-400 mb-8 text-center max-w-lg text-sm sm:text-base">A safe, anonymous space to connect, chat, and play games.</p>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full mb-8">
                {/* Privacy Card */}
                <GlassCard className="p-6 hover:border-blue-500/30 hover:shadow-[0_15px_30px_rgba(59,130,246,0.12)] transition-all duration-500 flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <Shield size={22} />
                        </div>
                        <h3 className="font-creative-title text-gradient-silver text-xl mb-2">Privacy First</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">No logs. No tracking. No registration. Your conversations vanish permanently when you leave.</p>
                    </div>
                    <Link to="/privacy" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500 hover:text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all duration-300 mt-5 w-fit">
                        Read Policy <Zap size={11} className="opacity-70" />
                    </Link>
                </GlassCard>
                
                {/* Rules Card */}
                <GlassCard className="p-6 hover:border-purple-500/30 hover:shadow-[0_15px_30px_rgba(168,85,247,0.12)] transition-all duration-500 flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                            <FileText size={22} />
                        </div>
                        <h3 className="font-creative-title text-gradient-silver text-xl mb-2">Community Rules</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">Be kind. Harassment, hate speech, spamming, and inappropriate content are strictly banned.</p>
                    </div>
                    <Link to="/terms" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-300 mt-5 w-fit">
                        Terms of Service <Zap size={11} className="opacity-70" />
                    </Link>
                </GlassCard>
                
                {/* About Card */}
                <GlassCard className="p-6 hover:border-green-500/30 hover:shadow-[0_0_15px_rgba(34,197,94,0.12)] transition-all duration-500 flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                            <Info size={22} />
                        </div>
                        <h3 className="font-creative-title text-gradient-silver text-xl mb-2">About Us</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">Built for genuine connection. Play games like Chess, Tic-Tac-Toe and Connect 4 while you chat.</p>
                    </div>
                    <Link to="/about" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-300 hover:bg-green-500 hover:text-white hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all duration-300 mt-5 w-fit">
                        Learn More <Zap size={11} className="opacity-70" />
                    </Link>
                </GlassCard>
            </div>
            
            <div className="flex flex-col items-center gap-5 mb-8">
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <div className={`w-6 h-6 border-2 rounded-lg transition-all duration-300 flex items-center justify-center ${checked ? 'bg-gradient-to-r from-indigo-500 to-purple-500 border-transparent shadow-[0_0_12px_rgba(168,85,247,0.5)]' : 'border-zinc-600 group-hover:border-white'}`}>
                        {checked && <CheckCircle size={14} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" onChange={(e) => setChecked(e.target.checked)} />
                    <span className="text-zinc-300 group-hover:text-white transition duration-200 text-sm">I agree to the Rules & Privacy Policy</span>
                </label>
                <GlowButton onClick={onAgree} disabled={!checked} className={`w-64 font-creative-button transition-all duration-500 ${checked ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.5)] hover:scale-105' : 'bg-zinc-800 text-zinc-500 border border-white/5'}`}>
                    Continue
                </GlowButton>
            </div>

            {/* Community Request Note */}
            <CommunityNote />
        </div>
    );
};

export default LegalScreen;
