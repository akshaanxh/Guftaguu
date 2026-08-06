import React, { useState } from 'react';
import { Reply } from 'lucide-react';

export const SwipeableMessage = ({ msg, onReply }) => {
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [translateX, setTranslateX] = useState(0);

    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
        const currentTouch = e.targetTouches[0].clientX;
        if (touchStart) {
            const diff = currentTouch - touchStart;
            if (diff > 0 && diff < 100) {
                setTranslateX(diff);
            }
        }
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isSwipeRight = distance < -minSwipeDistance;

        if (isSwipeRight) {
            onReply(msg);
        }
        
        setTranslateX(0);
        setTouchStart(null);
        setTouchEnd(null);
    };

    return (
        <div 
            className="relative group touch-pan-y" 
            onTouchStart={onTouchStart} 
            onTouchMove={onTouchMove} 
            onTouchEnd={onTouchEnd}
        >
            <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500 transition-opacity duration-300"
                style={{ opacity: translateX > 20 ? 1 : 0, transform: `translateX(10px)` }}
            >
                <Reply size={20} />
            </div>

            <div 
                className={`flex w-full transition-transform duration-200 ease-out ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                style={{ transform: `translateX(${translateX}px)` }}
            >
                {msg.sender !== "me" && (
                    <button 
                        onClick={() => onReply(msg)}
                        className="hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-center text-zinc-500 hover:text-white px-2 transition-all"
                        title="Reply"
                    >
                        <Reply size={16} />
                    </button>
                )}

                <div className={`max-w-[85%] relative flex flex-col ${msg.sender === "me" ? "items-end" : "items-start"}`}>
                    
                    {msg.replyTo && (
                        <div className={`
                            mb-1 text-xs px-3 py-2 rounded-lg border-l-4 w-full max-w-full truncate opacity-80 select-none
                            ${msg.sender === "me" 
                                ? "bg-zinc-200 text-black border-zinc-400" 
                                : "bg-zinc-800 text-zinc-300 border-zinc-500"}
                        `}>
                            <div className="font-bold mb-0.5 text-[10px] uppercase">
                                {msg.replyTo.sender === "me" ? "You" : "Stranger"}
                            </div>
                            <div className="truncate">{msg.replyTo.text}</div>
                        </div>
                    )}

                    <div className={`px-4 py-2 md:px-5 md:py-3 rounded-2xl text-sm leading-relaxed ${msg.sender === "me" ? "bg-white text-black rounded-tr-sm" : "bg-zinc-800 text-zinc-100 border border-white/5 rounded-tl-sm"}`}>
                        {msg.text}
                    </div>
                </div>

                {msg.sender === "me" && (
                     <button 
                        onClick={() => onReply(msg)}
                        className="hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-center text-zinc-500 hover:text-white px-2 transition-all"
                        title="Reply"
                    >
                        <Reply size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default SwipeableMessage;

# TODO: improve test coverage here
