import React, { useState } from 'react';
import { Heart, Share2, Check } from 'lucide-react';
import { GlassCard } from './ui';

export const CommunityNote = ({ className = "" }) => {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const shareData = {
            title: 'Guftaguu — Anonymous Real-Time Chat & Games',
            text: 'Hey! Check out Guftaguu — a super cozy, anonymous place to chat with people & play games like Chess, Connect 4 and Tic-Tac-Toe!',
            url: window.location.origin || 'https://guftaguu.vercel.app',
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                // Fallback if user cancels native share dialog
            }
        }

        try {
            await navigator.clipboard.writeText(shareData.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (e) {
            alert(`Share Guftaguu link: ${shareData.url}`);
        }
    };

    return (
        <GlassCard className={`w-full max-w-xl p-6 text-left relative overflow-hidden border-purple-500/20 hover:border-purple-500/40 transition-all duration-500 shadow-2xl ${className}`}>
            <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.3)]">
                    <Heart size={16} className="fill-pink-500/30" />
                </div>
                <h3 className="font-creative-title text-gradient-silver text-lg">A Note From Our Creator</h3>
            </div>

            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-4 font-normal">
                Guftaguu was created with one simple goal: to be a warm, safe, and happy place where anyone can take a break, play games, and connect with kind people from anywhere in the world.
            </p>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-5 font-normal">
                A community only stays alive because of <strong className="text-white font-semibold">the wonderful people in it</strong>. If you enjoy your time here, please share Guftaguu with your friends, roommates, and online circles! Every single person you invite helps make this a warmer, happier place for everyone.
            </p>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
                <span className="text-[11px] text-zinc-400 hidden sm:inline">Help us grow our happy space 💖</span>
                <button
                    onClick={handleShare}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-200 hover:from-purple-500 hover:to-pink-500 hover:text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all duration-300"
                >
                    {copied ? (
                        <>
                            <Check size={14} className="text-emerald-400" />
                            <span>Link Copied to Clipboard! 💖</span>
                        </>
                    ) : (
                        <>
                            <Share2 size={14} />
                            <span>Share Guftaguu with Friends</span>
                        </>
                    )}
                </button>
            </div>
        </GlassCard>
    );
};
