import React, { useState } from 'react';

export const GlassCard = ({ children, className = "" }) => (
    <div className={`glass-panel rounded-2xl transition duration-300 ${className}`}>
        {children}
    </div>
);

export const CatLogo = ({ className = "w-12 h-12" }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <svg className={`text-white stroke-current fill-none ${className}`} viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4 21l3.39-1.03C8.88 20.61 10.38 21 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
        <circle cx="9" cy="11" r="1" fill="currentColor" />
        <circle cx="15" cy="11" r="1" fill="currentColor" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15c-1 0-1.5-.5-2-1m2 1c1 0 1.5-.5 2-1" />
      </svg>
    );
  }

  return (
    <picture className={`inline-block ${className}`}>
      <source srcSet="/guftaguulogo.webp" type="image/webp" />
      <img 
        src="/guftaguulogo.png" 
        alt="Guftaguu Logo" 
        loading="eager"
        decoding="async"
        onError={() => setHasError(true)}
        className={`object-contain w-full h-full ${className}`}
      />
    </picture>
  );
};

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
