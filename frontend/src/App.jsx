import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
// Icons
import { MessageCircle, Shield, Gamepad2, AlertTriangle, LogOut, X, RefreshCw, CheckCircle, Info, FileText, Users, Zap, Grid3X3, Reply, Repeat, Send } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react"

// Import Your Custom Logo

// Import Game Logic
import { GameBoard, ChessBoardGame, ReactionBoard, checkTicTacToeWinner, checkConnect4Winner, checkDotsBoxesWinner } from './components/GameComponents';

// --- CONFIGURATION ---


// --- SOUND UTILS ---
const playConnectSound = () => {
    const audio = new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3");
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play failed (user interaction needed first)"));
};

// --- VISUAL COMPONENTS ---
const GlassCard = ({ children, className = "" }) => (
    <div className={`glass-panel rounded-2xl transition duration-300 ${className}`}>
        {children}
    </div>
);

const CatLogo = ({ className = "w-12 h-12" }) => (
  <img src="/guftaguulogo.png" alt="Guftaguu Logo" className={`object-contain ${className}`} />
);

const GlowButton = ({ onClick, children, disabled, variant = "primary", className="" }) => {
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

// --- SWIPEABLE MESSAGE COMPONENT ---
const SwipeableMessage = ({ msg, onReply }) => {
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


const ConnectionStatusBanner = ({ isConnected, isReconnecting }) => {
    if (isConnected && !isReconnecting) return null; // Don't show if everything is fine
    
    return (
        <div className={`fixed top-0 left-0 right-0 z-[100] py-2 px-4 text-center text-sm font-bold ${
            isReconnecting ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
        } animate-in slide-in-from-top duration-300`}>
            {isReconnecting ? (
                <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Reconnecting to server...</span>
                </div>
            ) : (
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>Connection lost! Attempting to reconnect...</span>
                </div>
            )}
        </div>
    );
};

// --- USER ID SESSION GENERATOR ---
const getOrCreateUserId = () => {
    let id = localStorage.getItem("guftaguu_user_id");
    if (!id) {
        id = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem("guftaguu_user_id", id);
    }
    return id;
};

// --- CHAT INTERFACE ---
function ChatInterface({ displayName, onLogout }) {
  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const isSenderRef = useRef(false);
  const roomIdRef = useRef(null); // Always holds the latest roomId — safe to read inside stale socket closures
  const [isReconnecting, setIsReconnecting] = useState(false);
  // State
  const [idleCount, setIdleCount] = useState(1); 
  const [busyCount, setBusyCount] = useState(0);
  const [status, setStatus] = useState("idle"); 
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [partnerName, setPartnerName] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState('active'); // active, inactive, disconnected
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  
  // FIX: Track internal typing state to prevent flood
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  
  // REPLY STATE
  const [replyingTo, setReplyingTo] = useState(null);

  // Game State
  const [activeGameType, setActiveGameType] = useState(null); 
  const [gameActive, setGameActive] = useState(false);
  const [board, setBoard] = useState([]); 
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [mySymbol, setMySymbol] = useState(null); 
  const [gameWinner, setGameWinner] = useState(null);

  // Chess specific (game over sync)
  const [chessGameOver, setChessGameOver] = useState(null);

  // Reaction Game Specific (SIMPLIFIED - NO ROUNDS/SCORES)
  const [reactionState, setReactionState] = useState('waiting'); // waiting, ready, result
  const [reactionResult, setReactionResult] = useState(null);

  const [incomingRequest, setIncomingRequest] = useState(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [statusMessage, setStatusMessage] = useState(""); 
  const [incomingDrawOffer, setIncomingDrawOffer] = useState(false);
  const [drawStatusMessage, setDrawStatusMessage] = useState(""); 
  
  // Modals
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [chessSubmenu, setChessSubmenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  
  const [reportData, setReportData] = useState({ title: "", description: "", type: "Bug Report" });
  const [isSendingReport, setIsSendingReport] = useState(false);

  const getSocket = () => socketRef.current;

  // Sync auth roomId when it changes
  useEffect(() => {
      roomIdRef.current = roomId; // Keep ref in sync for socket handlers
      if (socketRef.current && socketRef.current.auth) {
          socketRef.current.auth.roomId = roomId;
      }
  }, [roomId]);

  // Persist chat to sessionStorage on every message change.
  // sessionStorage survives page reload but clears when the tab is closed —
  // so the privacy promise ("messages gone when you leave") is still honoured.
  useEffect(() => {
      if (roomId && messages.length > 0) {
          sessionStorage.setItem(`guftaguu_chat_${roomId}`, JSON.stringify(messages));
      }
  }, [messages, roomId]);

  useEffect(() => {
    // --- FIXED CONNECTION LOGIC ---
    if (!socketRef.current) {
        socketRef.current = io("https://guftaguu-backend.onrender.com", {
            auth: {
                userId: getOrCreateUserId(),
                name: displayName,
                roomId: roomId
            },
            reconnection: true,
            reconnectionAttempts: 15,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['websocket'], // Prefer websocket
        });
    }
    
    const socket = socketRef.current;

    // Ensure socket is connected
    if (!socket.connected) {
        socket.connect();
    }

    // ===== CONNECTION STATE HANDLERS =====
    socket.on('connect', () => {
        console.log('✅ Connected to server');
        setIsConnected(true);
        // If we were searching and reconnected, re-emit find_match to put us back in queue!
        if (status === 'searching') {
            console.log('🔄 Re-emitting find_match after reconnection...');
            socket.emit('find_match');
        }
    });

    socket.on('reconnect_attempt', () => setIsReconnecting(true));
    socket.on('reconnect', () => setIsReconnecting(false));

    socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected:', reason);
        setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
        console.error('🔴 Connection error:', error.message);
        setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
    });

    socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
        setIsConnected(false);
        if (status === 'chatting') {
            alert("Failed to reconnect. Please refresh the page.");
        }
    });

    // ===== SERVER INITIATED DISCONNECTION =====
    socket.on('connection_dead', () => {
        console.log('💀 Server detected dead connection');
        setStatus("partner_left");
        alert("Connection expired or dead. Starting new chat...");
    });

    // ===== HEARTBEAT / PING-PONG =====
    const heartbeatInterval = setInterval(() => {
        if (socket.connected && status === 'chatting') {
            socket.emit('ping');
            
            // Set timeout to check if we got pong back
            const pongTimeout = setTimeout(() => {
                console.warn('⚠️ No pong received - connection may be dead');
            }, 10000); 
            
            socket.once('pong', () => {
                clearTimeout(pongTimeout);
                console.log('💓 Heartbeat OK');
            });
        }
    }, 15000); // Check every 15 seconds

    // ===== EXISTING EVENT HANDLERS =====
    socket.on('match_found', ({ roomId, partnerId }) => {
        // Clear the previous room's persisted chat (fresh start)
        if (roomIdRef.current) sessionStorage.removeItem(`guftaguu_chat_${roomIdRef.current}`);
        setStatus("chatting"); 
        setRoomId(roomId); 
        setPartnerId(partnerId); 
        setPartnerStatus('active');
        setMessages([]); 
        resetGame(); 
        setPartnerName(null); 
        playConnectSound();
        socket.emit('send_name', { roomId, name: displayName });
    });

    socket.on('rejoined_room', ({ roomId, partnerId, partnerName }) => {
        console.log(`✨ Rejoined active room: ${roomId}`);
        // Restore persisted chat history so the reloaded user sees their messages again
        try {
            const saved = sessionStorage.getItem(`guftaguu_chat_${roomId}`);
            if (saved) setMessages(JSON.parse(saved));
        } catch (e) { console.warn('Could not restore chat history', e); }
        setRoomId(roomId);
        setPartnerId(partnerId);
        setPartnerName(partnerName);
        setStatus("chatting");
        setPartnerStatus('active');
    });

    socket.on('partner_status_change', ({ status }) => {
        console.log(`👤 Partner status changed to: ${status}`);
        setPartnerStatus(status);
    });

    socket.on('site_stats', (data) => {
        if (data) {
            if (typeof data.idle === 'number') setIdleCount(data.idle);
            if (typeof data.total === 'number' && typeof data.idle === 'number') {
                const calculatedBusy = Math.max(0, data.total - data.idle);
                setBusyCount(calculatedBusy);
            }
        }
    });

    socket.on('receive_name', (name) => setPartnerName(name));
    
    socket.on('receive_message', (data) => {
        const text = typeof data === 'object' ? data.text : data;
        const replyTo = typeof data === 'object' ? data.replyTo : null;
        setMessages((prev) => [...prev, { text, sender: "stranger", replyTo }]);
        setIsPartnerTyping(false);
    });
    
    socket.on('partner_disconnected', () => {
        // Chat is permanently over — clear persisted messages
        if (roomIdRef.current) sessionStorage.removeItem(`guftaguu_chat_${roomIdRef.current}`);
        setStatus("partner_left"); 
        resetGame(); 
    });

    socket.on('draw_offered', () => {
        console.log('🤝 Draw offered by stranger');
        setIncomingDrawOffer(true);
    });

    socket.on('draw_declined', () => {
        console.log('❌ Draw offer declined');
        setDrawStatusMessage("Draw offer declined.");
        setTimeout(() => setDrawStatusMessage(""), 3000);
    });

    socket.on('draw_accepted', () => {
        console.log('✅ Draw accepted. Ending game in draw.');
        setChessGameOver('draw');
        setIncomingDrawOffer(false);
    });

    // ===== TAB VISIBILITY HANDLERS =====
    const handleVisibilityChange = () => {
        if (!socket.connected || !roomId) return;
        const currentStatus = document.visibilityState === 'visible' ? 'active' : 'inactive';
        console.log(`📱 Visibility changed to ${currentStatus}. Emitting user_status_change...`);
        socket.emit('user_status_change', { status: currentStatus });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    socket.on('display_typing', (isTyping) => setIsPartnerTyping(isTyping));
    socket.on('game_requested', (gameType) => setIncomingRequest(gameType));
    
    socket.on('game_start', ({ gameType, starterId }) => {
        setGameActive(true); 
        setActiveGameType(gameType);
        
        if (gameType === 'tictactoe') setBoard(Array(9).fill(null));
        else if (gameType === 'connect4') setBoard(Array(42).fill(null)); 
        else if (gameType === 'dotsboxes') setBoard({ hLines: Array(30).fill(false), vLines: Array(30).fill(false), boxes: Array(25).fill(null) });
        else if (gameType.startsWith('chess')) { 
            const tc = gameType.split('-')[1]; // '3', '10', or 'unlimited'
            const initialTime = tc === '3' ? 180 : tc === '10' ? 600 : null;
            setBoard({ fen: 'start', whiteTime: initialTime, blackTime: initialTime, timeControl: tc });
            setChessGameOver(null); 
        }
        else if (gameType === 'reaction') { 
            setReactionState('waiting'); 
            setReactionResult(null); 
        }

        setIncomingRequest(null); 
        setWaitingForResponse(false); 
        setStatusMessage(""); 
        setGameWinner(null);
        
        // starterId = the socket.id of the ACCEPTER (sent by backend in accept_game)
        // If MY socket.id === starterId, I am the accepter => Black (O)
        // If MY socket.id !== starterId, I am the requester => White (X)
        const mySocketId = socket.id;
        const amIAccepter = mySocketId === starterId;
        console.log('🎮 game_start:', { mySocketId, starterId, amIAccepter, gameType });
        if (amIAccepter) { 
            setMySymbol('O'); 
            setIsMyTurn(false); 
        } else { 
            setMySymbol('X'); 
            setIsMyTurn(true); 
        }
    });

    socket.on('game_declined', () => {
        setWaitingForResponse(false); 
        setStatusMessage("Stranger declined.");
        setTimeout(() => { setStatusMessage(""); }, 2000);
    });

    socket.on('receive_move', ({ index, symbol, extraData }) => {
        if (extraData && extraData.game === 'chess') {
            setBoard(extraData.gameState);
            setIsMyTurn(true);
        } else if (extraData && extraData.game === 'dotsboxes') {
            const { type, index: i } = extraData;
            setBoard(prev => {
                const next = { ...prev };
                
                if (type === 'h') { next.hLines = [...prev.hLines]; next.hLines[i] = true; }
                if (type === 'v') { next.vLines = [...prev.vLines]; next.vLines[i] = true; }
                
                const newBoxes = [...prev.boxes];
                let boxCompleted = false;

                const isBoxFull = (r, c, h, v) => {
                    if (r<0 || r>=5 || c<0 || c>=5) return false;
                    const hTop = h[r*5+c];
                    const hBot = h[(r+1)*5+c];
                    const vLeft = v[r*6+c];
                    const vRight = v[r*6+c+1];
                    return hTop && hBot && vLeft && vRight;
                }

                for(let r=0; r<5; r++){
                    for(let c=0; c<5; c++){
                        const bIdx = r*5+c;
                        if (!newBoxes[bIdx]) {
                             const hLinesToCheck = next.hLines || prev.hLines;
                             const vLinesToCheck = next.vLines || prev.vLines;
                             
                             if (isBoxFull(r, c, hLinesToCheck, vLinesToCheck)) {
                                newBoxes[bIdx] = symbol; 
                                boxCompleted = true;
                            }
                        }
                    }
                }
                next.boxes = newBoxes;
                
                if (boxCompleted) { setIsMyTurn(false); } else { setIsMyTurn(true); }
                return next;
            });
        } else {
            setBoard((prev) => { 
                const newBoard = [...prev]; 
                newBoard[index] = symbol; 
                return newBoard; 
            });
            setIsMyTurn(true);
        }
    });



    socket.on('reaction_green_light', () => { 
        setReactionState('ready'); 
    });
    
    socket.on('reaction_result', ({ winnerId, time }) => {
        const winner = winnerId === socket.id ? 'me' : 'opponent';
        setReactionResult({ winner, time });
    });

    // ===== CLEANUP =====
    return () => {
        clearInterval(heartbeatInterval);
        // Remove the visibility listener we added in this effect run
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        socket.off(); // Remove all socket listeners (they are re-registered on the next run)
        // Do NOT disconnect the socket here. Re-renders caused by displayName changing
        // should not kill the live connection. True disconnection is handled below.
    };
}, [displayName]);

  // Disconnect socket ONLY on true component unmount (user logs out / navigates away).
  // Empty deps array guarantees this runs exactly once, on unmount.
  useEffect(() => {
      return () => {
          if (socketRef.current) {
              socketRef.current.disconnect();
              socketRef.current = null;
          }
      };
  }, []);

  // WIN CHECKER HOOK
  useEffect(() => {
    if (!gameActive || !activeGameType) return;
    let winner = null;
    
    if (activeGameType === 'tictactoe') winner = checkTicTacToeWinner(board);
    else if (activeGameType === 'connect4') winner = checkConnect4Winner(board);
    else if (activeGameType === 'dotsboxes') winner = checkDotsBoxesWinner(board);

    // TicTacToe/Connect4 Draw Check
    let isDraw = false;
    if (activeGameType !== 'dotsboxes' && Array.isArray(board) && !winner && board.length > 0 && !board.includes(null)) isDraw = true;

    if (winner || isDraw) {
        setGameWinner(winner || 'draw');
    }
  }, [board, activeGameType, gameActive]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isPartnerTyping, replyingTo]);

  // --- PREVENT NAVIGATION AND REFRESH ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (status === 'chatting') {
        e.preventDefault();
        e.returnValue = "Are you sure? You will lose your current chat.";
        return "Are you sure? You will lose your current chat.";
      }
    };
    const handlePopState = (e) => {
       if (status === 'chatting') {
         window.history.pushState(null, document.title, window.location.href);
         alert("Please click 'Stop' to end the chat first.");
       }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    if (status === 'chatting') window.history.pushState(null, document.title, window.location.href);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); window.removeEventListener('popstate', handlePopState); };
  }, [status]);


  const resetAll = () => {
      if (roomIdRef.current) sessionStorage.removeItem(`guftaguu_chat_${roomIdRef.current}`);
      setStatus("idle"); setMessages([]); resetGame(); setPartnerId(null); setPartnerName(null);
  };
  const resetGame = () => { 
      isSenderRef.current = false;
      setGameActive(false); setIncomingRequest(null); setShowGameSelector(false);
      setChessSubmenu(false);
      setWaitingForResponse(false); setBoard([]); setStatusMessage(""); setGameWinner(null);
      setChessGameOver(null);
      setReactionResult(null); setReactionState('waiting'); setActiveGameType(null);
      setIncomingDrawOffer(false);
      setDrawStatusMessage("");
  };

  const handleStartChat = () => { setStatus("searching"); getSocket().emit("find_match"); };
  
  // FIX: Optimized typing handler to prevent spamming server
  const handleInputChange = (e) => {
      setMessage(e.target.value); 
      if (!roomId) return;
      
      // Only emit 'true' if we weren't already typing to save bandwidth
      if (!isTypingRef.current) {
          isTypingRef.current = true;
          getSocket().emit('typing', { roomId, isTyping: true });
      }
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => { 
          isTypingRef.current = false;
          getSocket().emit('typing', { roomId, isTyping: false }); 
      }, 1000);
  };
  
  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && status === 'chatting' && roomId) {
        const msgObject = { text: message, replyTo: replyingTo };
        setMessages((prev) => [...prev, { ...msgObject, sender: "me" }]);
        getSocket().emit("send_message", { roomId, message: msgObject });
        
        // Clear typing state immediately on send
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        isTypingRef.current = false;
        getSocket().emit('typing', { roomId, isTyping: false });
        
        setMessage(""); setReplyingTo(null);
    }
  };

  const handleDisconnectChat = () => { 
      if (!roomId) return;
      // Clear persisted chat when the user intentionally leaves
      sessionStorage.removeItem(`guftaguu_chat_${roomId}`);
      getSocket().emit('leave_room', { roomId }); 
      setStatus("disconnected"); 
      resetGame(); 
  };
  const handleNewMatch = () => { resetAll(); setStatus("searching"); getSocket().emit("find_match"); };
  const handleMainButton = () => { if (status === 'chatting') handleDisconnectChat(); else handleNewMatch(); };
  const handleBlock = () => { if (!roomId || !partnerId) return; if (window.confirm("Block user for 10 mins?")) { getSocket().emit('block_user', { roomId, partnerId }); resetAll(); alert("User blocked."); } };
  const submitReport = async (e) => { e.preventDefault(); setIsSendingReport(true); try { await axios.post('https://guftaguu-backend.onrender.com/api/report', reportData); alert("Sent!"); setShowReportModal(false); } catch (err) { alert("Failed."); } setIsSendingReport(false); };
  const sendGameRequest = (gameType) => { 
      isSenderRef.current = true;
      setWaitingForResponse(true); 
      setShowGameSelector(false); 
      getSocket().emit("request_game", { roomId, gameType }); 
  };
  const acceptGame = () => { isSenderRef.current = false; getSocket().emit("accept_game", { roomId, gameType: incomingRequest }); };
  const declineGame = () => { setIncomingRequest(null); getSocket().emit("decline_game", { roomId }); };
  
  // --- REPLAY HANDLER ---
  const handleReplay = () => {
      const gameToReplay = activeGameType;
      resetGame();
      sendGameRequest(gameToReplay);
  };

  const handleGameMove = (indexOrData) => {
      if (activeGameType && activeGameType.startsWith('chess')) {
          setBoard(indexOrData);
          setIsMyTurn(false);
          getSocket().emit("make_move", { roomId, index: 0, symbol: mySymbol, gameType: activeGameType, extraData: { game: 'chess', gameState: indexOrData } });
      } else if (activeGameType === 'dotsboxes') {
          const { type, index } = indexOrData;
          let boxCompleted = false;
          setBoard(prev => {
              const next = { ...prev };
              if (type === 'h') { next.hLines = [...prev.hLines]; next.hLines[index] = true; }
              if (type === 'v') { next.vLines = [...prev.vLines]; next.vLines[index] = true; }
              const newBoxes = [...prev.boxes];
              const isBoxFull = (r, c, h, v) => { if (r<0 || r>=5 || c<0 || c>=5) return false; return h[r*5+c] && h[(r+1)*5+c] && v[r*6+c] && v[r*6+c+1]; }
              for(let r=0; r<5; r++){
                for(let c=0; c<5; c++){
                    const bIdx = r*5+c;
                    if (!newBoxes[bIdx]) {
                        if (isBoxFull(r, c, (next.hLines || prev.hLines), (next.vLines || prev.vLines))) { newBoxes[bIdx] = mySymbol; boxCompleted = true; }
                    }
                }
              }
              next.boxes = newBoxes;
              if (boxCompleted) setIsMyTurn(true); else setIsMyTurn(false);
              return next;
          });
          getSocket().emit("make_move", { roomId, index: 0, symbol: mySymbol, gameType: 'dotsboxes', extraData: { game: 'dotsboxes', type, index } });
      } else {
          const newBoard = [...board]; newBoard[indexOrData] = mySymbol; setBoard(newBoard); setIsMyTurn(false);
          getSocket().emit("make_move", { roomId, index: indexOrData, symbol: mySymbol });
      }
  };


  const handleReactionClick = () => { setReactionState('clicked'); getSocket().emit("make_move", { roomId, symbol: 'click', gameType: 'reaction' }); };
  const isChatEnded = status === "partner_left" || status === "disconnected";

  return (
    <div className="min-h-screen text-white font-sans flex flex-col relative z-10 overflow-hidden">
        <ConnectionStatusBanner isConnected={isConnected} isReconnecting={isReconnecting} />

       {/* HEADER */}
       <header className="px-6 py-4 border-b border-white/5 bg-black/20 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
            <CatLogo className="w-10 h-10" />
            <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent pb-0.5 mb-[-2px]">Guftaguu</h1>
                <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono"><span className="text-green-400 font-bold">{idleCount}</span> Waiting</span>
                    </div>
                    <span className="hidden md:inline text-zinc-700">|</span>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2"><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono"><span className="text-amber-500 font-bold">{busyCount}</span> In Chat</span>
                    </div>
                </div>
            </div>
        </div>
        <div className="flex gap-2 items-center">
            <button onClick={() => setShowReportModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition"><AlertTriangle size={14} /> <span className="hidden md:inline">Report</span></button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-red-500"}`}></div>
                <span className={isConnected ? "text-green-500" : "text-red-500"}>{isConnected ? "ONLINE" : "OFFLINE"}</span>
            </div>
            <button onClick={onLogout} className="text-red-400 text-xs hover:text-red-300 ml-2">Exit</button>
        </div>
      </header>

       {/* MODALS */}
       {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <GlassCard className="w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Submit Feedback</h3>
                    <button onClick={() => setShowReportModal(false)}><X className="text-zinc-500 hover:text-white" /></button>
                </div>
                <form onSubmit={submitReport} className="flex flex-col gap-4">
                    <input className="w-full bg-black/50 border border-white/10 p-3 text-white rounded-xl focus:border-white/50 focus:outline-none transition" placeholder="Title" value={reportData.title} onChange={e=>setReportData({...reportData, title: e.target.value})} required/>
                    <textarea className="w-full bg-black/50 border border-white/10 p-3 text-white rounded-xl focus:border-white/50 focus:outline-none transition resize-none" placeholder="Describe the issue..." rows={4} value={reportData.description} onChange={e=>setReportData({...reportData, description: e.target.value})} required/>
                    <GlowButton className="w-full mt-2">{isSendingReport ? "Sending..." : "Submit Report"}</GlowButton>
                </form>
            </GlassCard>
        </div>
       )}

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
         {incomingRequest && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] animate-in zoom-in-95 duration-200">
                <GlassCard className="p-8 text-center max-w-sm">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                        <Gamepad2 size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Game Request</h3>
                    <p className="text-zinc-400 mb-8">Stranger wants to play <span className="text-white font-bold">{
                        incomingRequest.startsWith('chess-') 
                            ? `Chess (${incomingRequest.split('-')[1] === '3' ? '3 Min Blitz' : incomingRequest.split('-')[1] === '10' ? '10 Min Rapid' : 'Unlimited'})` 
                            : incomingRequest === 'tictactoe' ? 'Tic-Tac-Toe' 
                            : incomingRequest === 'connect4' ? 'Connect 4' 
                            : incomingRequest === 'dotsboxes' ? 'Dots & Boxes' 
                            : incomingRequest === 'reaction' ? 'Reaction Time' 
                            : incomingRequest
                    }</span></p>
                    <div className="flex gap-3 justify-center">
                        <GlowButton variant="primary" onClick={acceptGame}>Accept</GlowButton>
                        <GlowButton variant="danger" onClick={declineGame}>Decline</GlowButton>
                    </div>
                </GlassCard>
            </div>
        )}

        {incomingDrawOffer && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 text-center w-full max-w-sm shadow-2xl">
                    <div className="w-16 h-16 bg-zinc-800 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                        🤝
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Draw Offered</h3>
                    <p className="text-zinc-400 mb-7 text-sm leading-relaxed">Stranger wants to end the game in a draw. Do you accept?</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                        <GlowButton variant="primary" onClick={() => {
                            if (roomId) { getSocket().emit('accept_draw', { roomId }); setIncomingDrawOffer(false); }
                        }}>Yes, Draw 🤝</GlowButton>
                        <GlowButton variant="danger" onClick={() => {
                            if (roomId) { getSocket().emit('decline_draw', { roomId }); setIncomingDrawOffer(false); }
                        }}>No, Continue</GlowButton>
                    </div>
                </div>
            </div>
        )}

        {showGameSelector && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]" onClick={() => setShowGameSelector(false)}>
                <GlassCard className="p-6 max-w-md w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    {!chessSubmenu ? (
                        <>
                            <h3 className="text-xl font-bold mb-6 text-center">Select a Game</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendGameRequest('tictactoe'); }} className="bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><span className="text-3xl">❌⭕</span><span className="font-bold text-sm">Tic-Tac-Toe</span></button>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendGameRequest('connect4'); }} className="bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><span className="text-3xl">🔴🟡</span><span className="font-bold text-sm">Connect 4</span></button>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendGameRequest('dotsboxes'); }} className="bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><Grid3X3 size={32} className="text-blue-400"/><span className="font-bold text-sm">Dots & Boxes</span></button>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendGameRequest('reaction'); }} className="bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><Zap size={32} className="text-yellow-400"/><span className="font-bold text-sm">Reaction Time</span></button>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setChessSubmenu(true); }} className="col-span-2 bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><span className="text-3xl">♟️</span><span className="font-bold text-sm">Chess</span></button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold mb-6 text-center">Select Chess Time Control</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendGameRequest('chess-3'); }} className="bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><span className="text-3xl">⚡</span><span className="font-bold text-sm text-center">3 Min Blitz</span></button>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendGameRequest('chess-10'); }} className="bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><span className="text-3xl">⏱️</span><span className="font-bold text-sm text-center">10 Min Rapid</span></button>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendGameRequest('chess-unlimited'); }} className="col-span-2 bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><span className="text-3xl">♾️</span><span className="font-bold text-sm">Unlimited</span></button>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setChessSubmenu(false); }} className="col-span-2 bg-zinc-900 border border-white/10 hover:bg-zinc-800 p-3 rounded-xl transition font-bold text-sm">← Back</button>
                            </div>
                        </>
                    )}
                </GlassCard>
            </div>
        )}

        {status === "idle" && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-3xl mx-auto px-4 py-6">

                {/* Live badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold mb-8 tracking-wide">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    {idleCount} {idleCount === 1 ? 'stranger' : 'strangers'} waiting right now
                </div>

                {/* Headline */}
                <h2 className="text-5xl md:text-8xl font-display font-bold mb-5 tracking-tighter text-creative-hero">
                    Talk to <span className="text-creative-glow">Strangers.</span>
                </h2>

                {/* Tagline */}
                <p className="text-zinc-500 mb-10 text-base md:text-lg max-w-sm mx-auto leading-relaxed">
                    Anonymous chat. Real-time games. No login required.
                </p>

                {/* CTA with glow aura */}
                <div className="relative inline-flex mb-12">
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl scale-110 pointer-events-none"></div>
                    <GlowButton onClick={handleStartChat} className="relative text-lg md:text-xl px-12 py-4 mx-auto font-creative-button">
                        Start Chatting →
                    </GlowButton>
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-2 justify-center mb-10">
                    {[
                        { icon: '💬', label: 'Anonymous' },
                        { icon: '♟️', label: 'Chess' },
                        { icon: '❌⭕', label: 'Tic-Tac-Toe' },
                        { icon: '🔴🟡', label: 'Connect 4' },
                        { icon: '⚡', label: 'Reaction' },
                        { icon: '🛡️', label: 'Moderation' },
                    ].map(({ icon, label }) => (
                        <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300 cursor-default select-none">
                            <span>{icon}</span> {label}
                        </span>
                    ))}
                </div>

                {/* Mini feature cards */}
                <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                    {[
                        { emoji: '🗣️', title: 'Instant Match', sub: 'No waiting, no swiping' },
                        { emoji: '🎮', title: 'Live Games', sub: 'Play while you chat' },
                        { emoji: '🔒', title: '100% Private', sub: 'Zero data stored' },
                    ].map(({ emoji, title, sub }) => (
                        <div key={title} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-300 cursor-default">
                            <div className="text-2xl mb-2">{emoji}</div>
                            <div className="text-xs font-bold text-zinc-300">{title}</div>
                            <div className="text-[10px] text-zinc-600 mt-1 leading-relaxed">{sub}</div>
                        </div>
                    ))}
                </div>

            </div>
        )}

        {status === "searching" && (
            <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-2xl font-creative-title font-bold animate-pulse text-zinc-300 tracking-wide uppercase">Finding a match...</h3>
                <button onClick={() => setStatus('idle')} className="mt-8 text-zinc-500 hover:text-white underline text-sm uppercase tracking-wider font-semibold">Cancel Search</button>
            </div>
        )}

        {(status === "chatting" || isChatEnded) && (
             <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4 md:gap-6 h-[92dvh] md:h-[80vh] animate-in fade-in zoom-in-95 duration-300">
                
                {gameActive && (
                    <div className="flex flex-col flex-none h-[45%] md:h-auto md:flex-1 min-h-0 relative">
                        {/* GAME BOARD */}
                        {activeGameType && activeGameType.startsWith('chess') ? (
                            <ChessBoardGame 
                                gameState={board} 
                                onMove={handleGameMove} 
                                mySymbol={mySymbol} 
                                isMyTurn={isMyTurn} 
                                statusMessage={statusMessage} 
                                onGameEnd={winner => { if(!chessGameOver) setChessGameOver(winner); }} 
                                onOfferDraw={() => {
                                    if (roomId) {
                                        setDrawStatusMessage("Draw offer sent...");
                                        setTimeout(() => setDrawStatusMessage(""), 2000);
                                        getSocket().emit('offer_draw', { roomId });
                                    }
                                }}
                                drawStatusMessage={drawStatusMessage}
                            />
                        ) : activeGameType === 'reaction' ? (
                            <ReactionBoard onClick={handleReactionClick} gameState={reactionState} result={reactionResult} />
                        ) : (
                            <GameBoard gameType={activeGameType} board={board} onMove={handleGameMove} winner={gameWinner} mySymbol={mySymbol} isMyTurn={isMyTurn} statusMessage={statusMessage} />
                        )}

                        {/* PLAY AGAIN / RESULT OVERLAY - Show for non-reaction games or when reaction hasn't shown result yet */}
                        {((gameWinner || chessGameOver) || (reactionResult && activeGameType !== 'reaction')) && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-xl">
                                <h3 className="text-3xl font-bold mb-6 text-white tracking-tight text-center px-4">
                                    {activeGameType && activeGameType.startsWith('chess') ? (
                                        chessGameOver === 'draw' ? "It's a Draw!" :
                                        chessGameOver === 'me' ? "You Won! 🎉" :
                                        chessGameOver === 'opponent_timeout' ? "Opponent Timeout! You Win! ⏳" :
                                        chessGameOver === 'my_timeout' ? "Time's Up! You Lost ⏳" :
                                        "You Lost! 💀"
                                    ) : gameWinner === 'draw' ? "It's a Draw!" :
                                     (gameWinner === mySymbol) ? "You Won!" : "You Lost!"}
                                </h3>
                                <div className="flex gap-4">
                                    <button onClick={handleReplay} className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 flex items-center gap-2">
                                        <Repeat size={18} /> Play Again
                                    </button>
                                    <button onClick={resetGame} className="bg-zinc-800 text-white px-6 py-2 rounded-full font-bold hover:bg-zinc-700">
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* REACTION GAME PLAY AGAIN BUTTONS - Below the result display */}
                        {activeGameType === 'reaction' && reactionResult && (
                            <div className="absolute bottom-4 left-0 right-0 flex gap-4 justify-center z-20 px-4">
                                <button onClick={handleReplay} className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 flex items-center gap-2 shadow-lg">
                                    <Repeat size={18} /> Play Again
                                </button>
                                <button onClick={resetGame} className="bg-zinc-800 text-white px-6 py-2 rounded-full font-bold hover:bg-zinc-700 shadow-lg">
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                <GlassCard className="flex-1 flex flex-col overflow-hidden min-h-0">
                     {/* CHAT HEADER */}
                    <div className="p-3 md:p-4 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
                         <div className="flex items-center gap-2 md:gap-3">
                             <div className={`w-2 h-2 rounded-full ${
                                 isChatEnded 
                                     ? "bg-red-500" 
                                     : partnerStatus === 'inactive' 
                                     ? "bg-amber-500 shadow-[0_0_10px_#f59e0b]" 
                                     : partnerStatus === 'disconnected' 
                                     ? "bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" 
                                     : "bg-green-500 shadow-[0_0_10px_#22c55e]"
                             }`}></div>
                             <span className="font-bold text-xs md:text-sm tracking-wide truncate max-w-[150px] md:max-w-none">
                                {isChatEnded 
                                    ? "Disconnected" 
                                    : partnerStatus === 'inactive' 
                                    ? `${partnerName || "Stranger"} (Away)` 
                                    : partnerStatus === 'disconnected' 
                                    ? `${partnerName || "Stranger"} (Reconnecting...)` 
                                    : (partnerName || "Stranger")}
                             </span>
                         </div>
                         
                         <div className="flex gap-2">
                            {!isChatEnded && !gameActive && (
                                <button onClick={() => { setChessSubmenu(false); setShowGameSelector(true); }} disabled={waitingForResponse} className="p-2 hover:bg-white/10 rounded-full transition text-blue-400" title="Play Game">
                                    <Gamepad2 size={18} />
                                </button>
                            )}
                            {!isChatEnded && (
                                <button onClick={handleBlock} className="p-2 hover:bg-red-500/20 rounded-full transition text-zinc-500 hover:text-red-500" title="Block User">
                                    <Shield size={18} />
                                </button>
                            )}
                            <button onClick={handleMainButton} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${status === 'chatting' ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-white text-black hover:bg-zinc-200'}`}>
                                {status === 'chatting' ? <><LogOut size={14}/> <span className="hidden md:inline">Stop</span></> : <><RefreshCw size={14}/> <span className="hidden md:inline">New</span></>}
                            </button>
                         </div>
                    </div>
                    
                    {/* MESSAGES */}
                    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                         {messages.map((msg, index) => (
                             <SwipeableMessage key={index} msg={msg} onReply={setReplyingTo} />
                        ))}
                        {isPartnerTyping && <div className="text-xs text-zinc-500 px-2 animate-pulse">typing...</div>}
                        {!isChatEnded && partnerStatus === 'inactive' && (
                            <div className="flex justify-center my-2 transition duration-300">
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full animate-pulse">
                                    ⚠️ Stranger is away (switched tabs)
                                </span>
                            </div>
                         )}
                         {!isChatEnded && partnerStatus === 'disconnected' && (
                             <div className="flex justify-center my-2 transition duration-300">
                                 <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full animate-pulse">
                                     ⏳ Connection lost (reconnecting...)
                                 </span>
                             </div>
                         )}
                        {status === "partner_left" && <div className="flex justify-center mt-6 mb-2"><span className="bg-zinc-800/50 border border-white/5 text-zinc-500 text-xs px-4 py-1 rounded-full">Partner disconnected</span></div>}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* INPUT AREA */}
                    {status === "chatting" ? (
                        <div className="flex flex-col bg-black/20 shrink-0">
                            {replyingTo && (
                                <div className="flex items-center justify-between bg-zinc-800/80 backdrop-blur border-t border-white/5 px-4 py-2 border-l-4 border-l-blue-400 mx-4 mt-2 rounded-r-lg">
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-blue-400 text-xs font-bold">Replying to {replyingTo.sender === "me" ? "yourself" : "Stranger"}</span>
                                        <span className="text-zinc-400 text-sm truncate">{replyingTo.text}</span>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-zinc-700 rounded-full text-zinc-400"><X size={16} /></button>
                                </div>
                            )}

                            <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-white/10 flex gap-2 md:gap-3">
                                <input type="text" value={message} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm focus:outline-none focus:border-white/30 focus:bg-black transition text-white placeholder:text-zinc-600" />
                                <button type="submit" className="bg-white text-black p-3 rounded-xl hover:bg-zinc-200 transition disabled:opacity-50 flex items-center justify-center" disabled={!message.trim()}>
                                    <Send size={18} className="text-black" />
                                </button>
                            </form>
                        </div>
                    ) : (
                         <div className="p-4 md:p-6 border-t border-white/10 flex justify-center bg-black/20 shrink-0">
                            <GlowButton onClick={handleNewMatch} className="w-full">Find New Match</GlowButton>
                         </div>
                    )}
                </GlassCard>
             </div>
        )}
      </main>
      
      <Analytics />
    </div>
  );
}

// --- LEGAL & NAME SCREENS ---
const LegalScreen = ({ onAgree }) => {
    const [checked, setChecked] = useState(false);
    return (
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-6 relative z-10 overflow-hidden">
            {/* Soft Ambient Orbs */}
            <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
            
            {/* Header section with interactive logo */}
            <div className="relative group mb-6 flex flex-col items-center">
                <div className="absolute inset-0 bg-white/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <CatLogo className="w-24 h-24 relative z-10 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-4 tracking-tighter text-creative-hero">Guftaguu</h1>
            <p className="text-zinc-400 mb-12 text-center max-w-lg">A safe, anonymous space to connect, chat, and play games.</p>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
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
                <GlassCard className="p-6 hover:border-green-500/30 hover:shadow-[0_15px_30px_rgba(34,197,94,0.12)] transition-all duration-500 flex flex-col justify-between">
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
            
            <div className="flex flex-col items-center gap-6">
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
        </div>
    );
};

const NameScreen = ({ onStart }) => {
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

const StaticPage = ({ title, content }) => {
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

const PAGE_CONTENT = {
    privacy: `### 1. Absolute Privacy & P2P Design
Guftaguu is architected from the ground up to respect your digital sovereignty.
- **Zero Registration:** No email addresses, phone numbers, social logins, or verification processes are required.
- **Anonymous Session:** Your transient identity is confined purely to your active session.
- **Direct P2P Connectivity:** Text, video, and actions are routed through secure, real-time WebSockets directly, leaving no trail.

### 2. No Data Archival or Logging
We believe in a web where actions don't leave permanent records.
- **No Database Persistence:** Chat histories and conversations are never stored on any physical disk or cloud server.
- **Instant Erasure:** As soon as you hit disconnect or close your tab, all messages instantly evaporate from memory.
- **No IP Tracking:** While IP addresses are temporarily used by WebSockets to negotiate connection handshakes, we do not log or store them.

### 3. Lightweight Client Storage
To provide a smooth web experience, we store minimal state in your local browser space.
- **Display Name:** We remember your chosen username in browser "Local Storage" purely as a convenience.
- **Zero Tracking Cookies:** We do not employ third-party tracking scripts, advertising networks, or retargeting pixels.

### 4. Safety & Responsible Sharing
Guftaguu offers a private canvas, but your security is a shared responsibility.
- **Protect Your Identity:** Never share financial details, home addresses, real names, passwords, or personal credentials.
- **No Undo:** Once you transmit personal info to a peer, it cannot be recalled. Be vigilant and chat safely.`,
    terms: `### 1. Agreement of Conduct
By entering Guftaguu, you enter a community of real individuals. We mandate high mutual respect.
- **Eligibility:** You must be 18 years of age or older, or the age of legal majority in your jurisdiction, to utilize this platform.
- **Express Agreement:** Use of the service implies full adherence to these terms and the companion Privacy Policy.

### 2. Zero-Tolerance Safety Protocol
To keep Guftaguu clean, safe, and fun, the following behaviors lead to permanent exclusion:
- **Harassment & Bullying:** Threatening, toxic, or abusive behavior towards peers is strictly forbidden.
- **Hate Speech:** Discrimination based on race, gender, sexual orientation, religion, nationality, or disability is banned.
- **Illegal Contents:** Distributing copyrighted materials, spam, malicious URLs, pornographic imagery, or illegal materials.
- **Bypass Attempts:** Bypassing automated restrictions, server bans, or attempting to compromise platform integrity.

### 3. Immediate Account Termination
We enforce immediate bans on violators.
- **Heuristic Moderation:** We use localized device finger-printing and connection monitoring to block harmful actors instantly.
- **No Liability for Bans:** The development team reserves full authority to terminate connections without prior warning.

### 4. Limited Liability Disclaimer
Guftaguu is provided strictly on an "as-is" and "as-available" basis.
- **Personal Risk:** Your conversations and games with strangers are conducted solely at your own risk.
- **No Warranties:** We make no guarantees regarding platform uptime, network reliability, or the behavioral conduct of peers.`,
    about: `### Spontaneous Human Connection
Guftaguu (meaning "Conversation" or "Dialogue" in Urdu/Hindi) is a dedicated digital sanctuary built to revive the thrill of spontaneous, unchoreographed connection. In a world dominated by social media algorithms, curations, and profiles, we welcome back the joy of absolute anonymity.

### Our Core Pillars
- ⚡ **Instant Synergy:** No swipes, no filters, no profiles. Hit search and enter a new world with a real stranger in milliseconds.
- 🎮 **Social Gaming:** Break the ice naturally with built-in multiplayer games. Play Chess, Connect 4, and Tic-Tac-Toe without leaving your conversation.
- 🔒 **Ironclad Anonymity:** We believe your privacy is non-negotiable. Enjoy full protection with zero registration and zero logs.

### Empowering Your Experience
Guftaguu is constructed with high-performance real-time web tech (Node.js, WebSockets, React). It is crafted for swift performance and absolute clarity.

### Feedback & Collaboration
Spotted a bug or have a feature suggestion? Use the report or feedback system in the interface header to send a message directly to our core developer guild. Let's make the internet conversational again!`
};

function App() {
    const savedName = localStorage.getItem("guftaguu_username");
    const [step, setStep] = useState(savedName ? 'chat' : 'legal');
    const [displayName, setDisplayName] = useState(savedName || "");

    const handleLogin = (name) => {
        localStorage.setItem("guftaguu_username", name);
        setDisplayName(name);
        setStep('chat');
    };

    const handleLogout = () => {
        localStorage.removeItem("guftaguu_username");
        setDisplayName("");
        setStep('name'); 
    };
    
    return (
        <>
            {/* Global Endless Watermark Wall */}
            <div 
              className="fixed inset-0 w-full h-full pointer-events-none opacity-[0.08] z-0"
              style={{
                backgroundImage: "url('/wallbackground1.png'), url('/wallbackground2.png')",
                backgroundSize: "500px, 500px",
                backgroundPosition: "0 0, 250px 250px",
                backgroundRepeat: "repeat, repeat"
              }}
            ></div>
            <Routes>
                <Route path="/" element={ step === 'legal' ? <LegalScreen onAgree={() => setStep('name')} /> : step === 'name' ? <NameScreen onStart={handleLogin} /> : <ChatInterface displayName={displayName} onLogout={handleLogout} /> } />
                <Route path="/privacy" element={<StaticPage title="Privacy Policy" content={PAGE_CONTENT.privacy} />} />
                <Route path="/terms" element={<StaticPage title="Terms of Service" content={PAGE_CONTENT.terms} />} />
                <Route path="/about" element={<StaticPage title="About Guftaguu" content={PAGE_CONTENT.about} />} />
            </Routes>
        </>
    );
}

export default App;