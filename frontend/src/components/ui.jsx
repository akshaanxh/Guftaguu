import React from 'react';

export const GlassCard = ({ children, className = "" }) => (
    <div className={`glass-panel rounded-2xl transition duration-300 ${className}`}>
        {children}
    </div>
);

export const CatLogo = ({ className = "w-12 h-12" }) => (
  <img src="/guftaguulogo.png" alt="Guftaguu Logo" className={`object-contain ${className}`} />
);

export const GlowButton = ({ onClick, children, disabled, variant = "primary", className="" }) => {
    const baseStyle = "px-6 py-3 rounded-full font-bold transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2";
    const variants = {
        primary: "bg-white text-black hover:bg-gray-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]",
        danger: "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]",
        secondary: "bg-zinc-800 text-white border border-white/10 hover:bg-zinc-700",
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
            {children}
        </button>
    );
};

# TODO: add error boundary here
