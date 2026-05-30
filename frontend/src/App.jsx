import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
// Icons
import { MessageCircle, Shield, Gamepad2, AlertTriangle, LogOut, X, RefreshCw, CheckCircle, Info, FileText, Users, Zap, Grid3X3, Reply, Repeat } from 'lucide-react';
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
    <div className={`bg-black/20 border border-white/10 shadow-2xl rounded-2xl ${className}`}>
        {children}
    </div>
);

const CatLogo = ({ className = "w-12 h-12" }) => (
  <img src="/website%20icon.png" alt="Guftaguu Logo" className={`object-contain ${className}`} />
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
  
  // Modals
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [chessSubmenu, setChessSubmenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  
  const [reportData, setReportData] = useState({ title: "", description: "", type: "Bug Report" });
  const [isSendingReport, setIsSendingReport] = useState(false);

  const getSocket = () => socketRef.current;

  // Sync auth roomId when it changes
  useEffect(() => {
      if (socketRef.current && socketRef.current.auth) {
          socketRef.current.auth.roomId = roomId;
      }
  }, [roomId]);

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

    socket.on('rejoined_room', ({ roomId }) => {
        console.log(`✨ Rejoined active room: ${roomId}`);
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
        setStatus("partner_left"); 
        resetGame(); 
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
        socket.off(); // Remove listeners but keep socket alive if needed
        // We do NOT disconnect here unless component unmounts for real
        // But since displayName changes trigger this, we need to be careful.
        // For this simple app, disconnecting on change is safer for logic, 
        // BUT we removed forceNew, so reconnection is smoother.
        socket.disconnect(); 
    };
}, [displayName]);

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


  const resetAll = () => { setStatus("idle"); setMessages([]); resetGame(); setPartnerId(null); setPartnerName(null); };
  const resetGame = () => { 
      isSenderRef.current = false;
      setGameActive(false); setIncomingRequest(null); setShowGameSelector(false);
      setChessSubmenu(false);
      setWaitingForResponse(false); setBoard([]); setStatusMessage(""); setGameWinner(null);
      setChessGameOver(null);
      setReactionResult(null); setReactionState('waiting'); setActiveGameType(null);
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
    <div className="min-h-screen text-white font-sans flex flex-col relative overflow-hidden">
        <ConnectionStatusBanner isConnected={isConnected} isReconnecting={isReconnecting} />

       {/* HEADER */}
       <header className="px-6 py-4 border-b border-white/5 bg-black/20 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
            <CatLogo className="w-10 h-10" />
            <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Guftaguu</h1>
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
            <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter">Talk to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Strangers.</span></h2>
                <p className="text-zinc-400 mb-10 text-lg max-w-md mx-auto">Anonymous chat. Real-time games. No login required.</p>
                <GlowButton onClick={handleStartChat} className="text-xl px-10 py-4 mx-auto">Start Chatting</GlowButton>
            </div>
        )}

        {status === "searching" && (
            <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-2xl font-bold animate-pulse">Finding a match...</h3>
                <button onClick={() => setStatus('idle')} className="mt-8 text-zinc-500 hover:text-white underline text-sm">Cancel Search</button>
            </div>
        )}

        {(status === "chatting" || isChatEnded) && (
             <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4 md:gap-6 h-[92dvh] md:h-[80vh] animate-in fade-in zoom-in-95 duration-300">
                
                {gameActive && (
                    <div className="flex flex-col flex-none h-[45%] md:h-auto md:flex-1 min-h-0 relative">
                        {/* GAME BOARD */}
                        {activeGameType && activeGameType.startsWith('chess') ? (
                            <ChessBoardGame gameState={board} onMove={handleGameMove} mySymbol={mySymbol} isMyTurn={isMyTurn} statusMessage={statusMessage} onGameEnd={winner => { if(!chessGameOver) setChessGameOver(winner); }} />
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
                                <button type="submit" className="bg-white text-black p-3 rounded-xl hover:bg-zinc-200 transition disabled:opacity-50" disabled={!message.trim()}>
                                    <Gamepad2 size={20} fill="black" />
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
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <CatLogo className="w-24 h-24 mb-8" />
            <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tighter bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">Guftaguu</h1>
            <p className="text-zinc-400 mb-12 text-center max-w-lg">A safe, anonymous space to connect, chat, and play.</p>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
                <GlassCard className="p-6 hover:border-white/20 transition duration-300">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 text-blue-400"><Shield size={20} /></div>
                    <h3 className="font-bold text-lg mb-2">Privacy First</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">No logs. No tracking. No registration. Your conversations vanish when you leave.</p>
                    <Link to="/privacy" className="text-xs text-white underline mt-4 block">Read Policy</Link>
                </GlassCard>
                <GlassCard className="p-6 hover:border-white/20 transition duration-300">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 text-purple-400"><FileText size={20} /></div>
                    <h3 className="font-bold text-lg mb-2">Community Rules</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">Be kind. Harassment, hate speech, and inappropriate content are strictly banned.</p>
                    <Link to="/terms" className="text-xs text-white underline mt-4 block">Terms of Service</Link>
                </GlassCard>
                <GlassCard className="p-6 hover:border-white/20 transition duration-300">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mb-4 text-green-400"><Info size={20} /></div>
                    <h3 className="font-bold text-lg mb-2">About Us</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">Built for connection. Play games like Tic-Tac-Toe and Connect 4 while you chat.</p>
                    <Link to="/about" className="text-xs text-white underline mt-4 block">Learn More</Link>
                </GlassCard>
            </div>
            <div className="flex flex-col items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <div className={`w-6 h-6 border-2 rounded transition flex items-center justify-center ${checked ? 'bg-white border-white' : 'border-zinc-600 group-hover:border-white'}`}>
                        {checked && <CheckCircle size={14} className="text-black" />}
                    </div>
                    <input type="checkbox" className="hidden" onChange={(e) => setChecked(e.target.checked)} />
                    <span className="text-zinc-300 group-hover:text-white transition">I agree to the Rules & Privacy Policy</span>
                </label>
                <GlowButton onClick={onAgree} disabled={!checked} className="w-64">Continue</GlowButton>
            </div>
        </div>
    );
};

const NameScreen = ({ onStart }) => {
    const [name, setName] = useState("");
    
    return (
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <GlassCard className="w-full max-w-lg p-10 text-center relative z-10">
                <CatLogo className="w-20 h-20 mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-2 tracking-tight">Welcome</h2>
                <p className="text-zinc-400 mb-8">Choose a display name to begin.</p>
                <input type="text" placeholder="Enter your name..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-center text-white text-lg focus:outline-none focus:border-white/50 transition mb-6 placeholder:text-zinc-700" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && onStart(name)}/>
                <GlowButton onClick={() => name.trim() && onStart(name)} className="w-full">Start Chatting</GlowButton>
            </GlassCard>
            <footer className="mt-12 text-xs text-zinc-600 flex gap-6 items-center">
                <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
                <Link to="/terms" className="hover:text-white transition">Terms</Link>
            </footer>
            
        </div>
    );
};

const StaticPage = ({ title, content }) => (
    <div className="min-h-screen text-white p-10 font-sans">
        <Link to="/" className="text-zinc-400 hover:text-white mb-8 inline-flex items-center gap-2">← Back to Home</Link>
        <h1 className="text-5xl font-bold mb-8 tracking-tighter text-white">{title}</h1>
        <div className="max-w-3xl text-zinc-300 space-y-4">
            {content.split('\n').map((line, index) => {
                if (!line.trim()) return <br key={index} />;
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                    <p key={index} className="leading-relaxed">{parts.map((part, i) => { if (part.startsWith('**') && part.endsWith('**')) { return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>; } return part; })}</p>
                );
            })}
        </div>
    </div>
);

const PAGE_CONTENT = {
    privacy: `**1. No Personal Data Collection**\nGuftaguu is designed to be completely anonymous. We do not ask for your email, phone number, or real name. We do not track your location.\n\n**2. No Chat Logs**\nYour conversations are peer-to-peer. Once you disconnect from a chat, the messages are deleted from your browser and are not stored in any permanent database on our servers.\n\n**3. Temporary Data**\nWe use "Local Storage" on your device only to remember your Display Name so you don't have to type it every time. You can clear this by clearing your browser cache.\n\n**4. Data Security**\nWhile we do not store chats, please remember that you are talking to strangers. Do not share personal information (like your address, passwords, or financial details) with anyone. We are not responsible for information you voluntarily share.`,
    terms: `**1. Acceptance of Terms**\nBy using Guftaguu, you agree to these terms. If you do not agree, please do not use the service. You must be 18+ to use this site.\n\n**2. User Conduct**\nWe have a zero-tolerance policy for:\n- Harassment, bullying, or hate speech.\n- Sharing illegal content or pornography.\n- Spamming or advertising.\n- Attempting to bypass bans.\n\n**3. Account Termination**\nWe reserve the right to ban users who violate these rules. Bans are based on IP address and device fingerprints.\n\n**4. Disclaimer**\nGuftaguu is provided "as is". We are not responsible for the conduct of any user. Interactions with strangers are at your own risk.`,
    about: `**What is Guftaguu?**\nGuftaguu (meaning "Conversation") is a modern space to meet random people from around the world. In an age of social media algorithms, we bring back the excitement of spontaneous connection.\n\n**Our Mission**\nTo provide a fast, safe, and fun environment where you can be yourself (or whoever you want to be) without the pressure of profiles, likes, or followers.\n\n**Features**\n- ⚡ **Instant Matching:** No swiping, just chatting.\n- 🎮 **Live Games:** Play Tic-Tac-Toe, Connect 4, and Rock Paper Scissors directly in the chat.\n- 🛡️ **Safety Tools:** Built-in blocking and reporting systems to keep the community clean.\n\n*Contact*\nHave a suggestion? Use the "Report" button in the app header to send feedback directly to our dev team.`
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
              className="fixed inset-0 w-full h-full pointer-events-none opacity-10 -z-50"
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