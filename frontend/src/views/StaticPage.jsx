import React from 'react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui';

export const StaticPage = ({ title, content }) => {
    const renderContent = (text) => {
        return text.split('\n').map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={index} className="h-4" />;
            
            // Subheadings
            if (trimmed.startsWith('### ')) {
                return <h3 key={index} className="text-xl font-bold text-white mt-6 mb-3 tracking-tight flex items-center gap-2">{trimmed.replace('### ', '')}</h3>;
            }
            
            // Bullet points
            if (trimmed.startsWith('- ')) {
                const bulletText = trimmed.replace('- ', '');
                const parts = bulletText.split(/(\*\*.*?\*\*)/g);
                return (
                    <li key={index} className="ml-4 list-disc text-zinc-300 leading-relaxed pl-1 mb-1.5">
                        {parts.map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                        })}
                    </li>
                );
            }
            
            // Standard paragraph
            const parts = trimmed.split(/(\*\*.*?\*\*)/g);
            return (
                <p key={index} className="text-zinc-300 leading-relaxed mb-3">
                    {parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    return (
        <div className="min-h-screen text-white flex flex-col items-center justify-start py-12 px-6 relative z-10">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-3xl">
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-all mb-8 group bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-white/20">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
                </Link>

                <GlassCard className="p-8 md:p-12 border border-white/10 rounded-3xl relative overflow-hidden">
                    {/* Decorative Corner Glow */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-bl-full pointer-events-none" />
                    
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tighter text-creative-hero">{title}</h1>
                    
                    <div className="space-y-2">
                        {renderContent(content)}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default StaticPage;
