import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Routes, Route, Link } from 'react-router-dom';
// Icons - Added 'Coffee'
import { MessageCircle, Shield, Play, AlertTriangle, LogOut, X, RefreshCw, CheckCircle, Info, FileText, Coffee } from 'lucide-react';

// Import Your Custom Logo
import logoImage from './assets/logo.png'; 

// Import Game Logic
import { GameBoard, RPSBoard, checkTicTacToeWinner, checkConnect4Winner } from './components/GameComponents';

// --- CONFIGURATION ---
const MY_UPI_ID = "akshaanshhh1133@oksbi"; 
const MY_NAME = "Guftaguu Dev";

// --- VISUAL COMPONENTS ---

const GlassCard = ({ children, className = "" }) => (
    <div className={`bg-zinc-900/80 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl ${className}`}>
        {children}
    </div>
);

const CatLogo = ({ className = "w-12 h-12" }) => (
  <img 
    src={logoImage} 
    alt="Guftaguu Logo" 
    className={`object-contain ${className}`} 
  />
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

// --- SUPPORT MODAL COMPONENT ---
const SupportModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
        <GlassCard className="w-full max-w-sm p-6 text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
            
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500">
                <Coffee size={32} />
            </div>
            
            <h3 className="text-xl font-bold mb-2">Buy me a Chai? ☕</h3>
            <p className="text-zinc-400 mb-6 text-sm">
                Servers aren't free! If you're having fun, a small contribution helps keep Guftaguu alive.
            </p>
            
            {/* DYNAMIC QR CODE GENERATOR */}
            <div className="bg-white p-3 rounded-xl mb-4 mx-auto w-48 h-48 shadow-lg shadow-white/5">
                <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${MY_UPI_ID}&pn=${encodeURIComponent(MY_NAME)}&cu=INR`} 
                    alt="UPI QR Code" 
                    className="w-full h-full object-contain" 
                />
            </div>
            
            <p className="text-xs text-zinc-500 mb-2">Scan with GPay, Paytm, PhonePe</p>
            <div className="bg-black/50 border border-white/10 p-2 rounded text-xs font-mono text-zinc-400 select-all">
                {MY_UPI_ID}
            </div>
        </GlassCard>
    </div>
);

// --- CHAT INTERFACE ---
function ChatInterface({ displayName, onLogout }) {
  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  
  // State
  const [idleCount, setIdleCount] = useState(1); 
  const [status, setStatus] = useState("idle"); 
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [partnerName, setPartnerName] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Game State
  const [activeGameType, setActiveGameType] = useState(null); 
  const [gameActive, setGameActive] = useState(false);
  const [board, setBoard] = useState([]); 
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [mySymbol, setMySymbol] = useState(null); 
  const [gameWinner, setGameWinner] = useState(null);

  const [rpsMyMove, setRpsMyMove] = useState(null);
  const [rpsOpponentMoved, setRpsOpponentMoved] = useState(false);
  const [rpsResult, setRpsResult] = useState(null);

  const [incomingRequest, setIncomingRequest] = useState(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [statusMessage, setStatusMessage] = useState(""); 
  
  // Modals
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false); // <--- NEW STATE
  
  const [reportData, setReportData] = useState({ title: "", description: "", type: "Bug Report" });
  const [isSendingReport, setIsSendingReport] = useState(false);

  const getSocket = () => socketRef.current;

  useEffect(() => {
    socketRef.current = io.connect("https://guftaguu-backend.onrender.com");
    const socket = socketRef.current;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => { setIsConnected(false); resetAll(); });

    socket.on('match_found', ({ roomId, partnerId }) => {
        setStatus("chatting"); setRoomId(roomId); setPartnerId(partnerId); 
        setMessages([]); resetGame(); setPartnerName(null); 
        socket.emit('send_name', { roomId, name: displayName });
    });

    socket.on('site_stats', (data) => {
        if (data && typeof data.idle === 'number') {
            setIdleCount(data.idle);
        }
    });

    socket.on('receive_name', (name) => setPartnerName(name));
    socket.on('receive_message', (text) => {
        setMessages((prev) => [...prev, { text, sender: "stranger" }]);
        setIsPartnerTyping(false);
    });
    
    socket.on('partner_disconnected', () => { setStatus("partner_left"); resetGame(); });
    socket.on('display_typing', (isTyping) => setIsPartnerTyping(isTyping));

    socket.on('game_requested', (gameType) => setIncomingRequest(gameType));
    
    socket.on('game_start', ({ gameType, starterId }) => {
        setGameActive(true); setActiveGameType(gameType);
        if (gameType === 'tictactoe') setBoard(Array(9).fill(null));
        else if (gameType === 'connect4') setBoard(Array(42).fill(null)); 
        else if (gameType === 'rps') { setRpsMyMove(null); setRpsOpponentMoved(false); setRpsResult(null); }
        setIncomingRequest(null); setWaitingForResponse(false); setStatusMessage(""); setGameWinner(null);
        const amIAccepter = socket.id === starterId; 
        if (amIAccepter) { setMySymbol('O'); setIsMyTurn(false); } else { setMySymbol('X'); setIsMyTurn(true); }
    });

    socket.on('game_declined', () => {
        setWaitingForResponse(false); setStatusMessage("Stranger declined.");
        setTimeout(() => { setStatusMessage(""); }, 2000);
    });

    socket.on('receive_move', ({ index, symbol }) => {
        setBoard((prev) => { const newBoard = [...prev]; newBoard[index] = symbol; return newBoard; });
        setIsMyTurn(true);
    });

    socket.on('rps_waiting', () => setRpsOpponentMoved(true));
    socket.on('rps_reveal', ({ moves }) => {
        const mySocketId = socket.id;
        const keys = Object.keys(moves);
        const theirSocketId = keys.find(id => id !== mySocketId);
        const myMoveVal = moves[mySocketId];
        const theirMoveVal = moves[theirSocketId];
        
        let result = 'draw';
        if (myMoveVal !== theirMoveVal) {
            if ((myMoveVal === 'R' && theirMoveVal === 'S') || (myMoveVal === 'P' && theirMoveVal === 'R') || (myMoveVal === 'S' && theirMoveVal === 'P')) { result = 'me'; } else { result = 'opponent'; }
        }
        setRpsResult({ winner: result, myMove: myMoveVal, theirMove: theirMoveVal });
        setTimeout(() => { resetGame(); }, 4000);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!gameActive || !activeGameType) return;
    let winner = null;
    if (activeGameType === 'tictactoe') winner = checkTicTacToeWinner(board);
    else if (activeGameType === 'connect4') winner = checkConnect4Winner(board);

    const isDraw = !winner && board.length > 0 && !board.includes(null);

    if (winner || isDraw) {
        setGameWinner(winner || 'draw');
        const timer = setTimeout(() => { resetGame(); }, 4000); 
        return () => clearTimeout(timer);
    }
  }, [board, activeGameType, gameActive]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isPartnerTyping]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (status === 'chatting') {
        e.preventDefault();
        e.returnValue = "Are you sure? You will lose your current chat.";
        return "Are you sure? You will lose your current chat.";
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);


  const resetAll = () => { setStatus("idle"); setMessages([]); resetGame(); setPartnerId(null); setPartnerName(null); };
  const resetGame = () => { 
      setGameActive(false); setIncomingRequest(null); setShowGameSelector(false);
      setWaitingForResponse(false); setBoard([]); setStatusMessage(""); setGameWinner(null);
      setRpsMyMove(null); setRpsOpponentMoved(false); setRpsResult(null); setActiveGameType(null);
  };

  const handleStartChat = () => { setStatus("searching"); getSocket().emit("find_match"); };
  const handleInputChange = (e) => {
      setMessage(e.target.value); if (!roomId) return;
      getSocket().emit('typing', { roomId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => { getSocket().emit('typing', { roomId, isTyping: false }); }, 1000);
  };
  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && status === 'chatting' && roomId) {
        setMessages((prev) => [...prev, { text: message, sender: "me" }]);
        getSocket().emit("send_message", { roomId, message });
        setMessage(""); getSocket().emit('typing', { roomId, isTyping: false });
    }
  };
  const handleDisconnectChat = () => { if (!roomId) return; getSocket().emit('leave_room', { roomId }); setStatus("disconnected"); resetGame(); };
  const handleNewMatch = () => { resetAll(); setStatus("searching"); getSocket().emit("find_match"); };
  const handleMainButton = () => { if (status === 'chatting') handleDisconnectChat(); else handleNewMatch(); };
  const handleBlock = () => {
      if (!roomId || !partnerId) return;
      if (window.confirm("Block user for 10 mins?")) { getSocket().emit('block_user', { roomId, partnerId }); resetAll(); alert("User blocked."); }
  };
  const submitReport = async (e) => {
      e.preventDefault(); setIsSendingReport(true);
      try { await axios.post('https://guftaguu-backend.onrender.com/api/report', reportData); alert("Sent!"); setShowReportModal(false); } catch (err) { alert("Failed."); } setIsSendingReport(false);
  };
  const sendGameRequest = (gameType) => { setWaitingForResponse(true); setShowGameSelector(false); getSocket().emit("request_game", { roomId, gameType }); };
  const acceptGame = () => { getSocket().emit("accept_game", { roomId, gameType: incomingRequest }); };
  const declineGame = () => { setIncomingRequest(null); getSocket().emit("decline_game", { roomId }); };
  const handleGameMove = (index) => {
      const newBoard = [...board]; newBoard[index] = mySymbol; setBoard(newBoard); setIsMyTurn(false);
      getSocket().emit("make_move", { roomId, index, symbol: mySymbol });
  };
  const handleRPSMove = (moveId) => { setRpsMyMove(moveId); getSocket().emit("make_move", { roomId, symbol: moveId, gameType: 'rps' }); };

  const isChatEnded = status === "partner_left" || status === "disconnected";

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
       {/* Background */}
       <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black -z-10"></div>
       <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
       <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

       {/* HEADER */}
       <header className="px-6 py-4 border-b border-white/5 bg-black/50 backdrop-blur-sm flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
            <CatLogo className="w-10 h-10" />
            <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    Guftaguu
                </h1>
                
                {/* ONLINE INDICATOR */}
                <div className="flex items-center gap-2 mt-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                        <span className="text-green-400 font-bold">{idleCount}</span> Online & Waiting
                    </span>
                </div>
            </div>
        </div>
        
        <div className="flex gap-2 items-center">
            {/* NEW: SUPPORT BUTTON */}
            <button onClick={() => setShowSupportModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/50 text-xs text-yellow-500 hover:bg-yellow-500 hover:text-black transition font-bold">
                <Coffee size={14} /> <span className="hidden md:inline">Support</span>
            </button>

            <button onClick={() => setShowReportModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition">
                <AlertTriangle size={14} /> <span className="hidden md:inline">Report</span>
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-red-500"}`}></div>
                <span className={isConnected ? "text-green-500" : "text-red-500"}>{isConnected ? "ONLINE" : "OFFLINE"}</span>
            </div>
            <button onClick={onLogout} className="text-red-400 text-xs hover:text-red-300 ml-2">Exit</button>
        </div>
      </header>

       {/* SUPPORT MODAL */}
       {showSupportModal && <SupportModal onClose={() => setShowSupportModal(false)} />}

       {/* REPORT MODAL */}
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
                        <Play size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Game Request</h3>
                    <p className="text-zinc-400 mb-8">Stranger wants to play <span className="text-white font-bold">{incomingRequest}</span></p>
                    <div className="flex gap-3 justify-center">
                        <GlowButton variant="primary" onClick={acceptGame}>Accept</GlowButton>
                        <GlowButton variant="danger" onClick={declineGame}>Decline</GlowButton>
                    </div>
                </GlassCard>
            </div>
        )}

        {showGameSelector && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]" onClick={() => setShowGameSelector(false)}>
                <GlassCard className="p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-6 text-center">Select a Game</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => sendGameRequest('tictactoe')} className="bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><span className="text-3xl">❌⭕</span><span className="font-bold text-sm">Tic-Tac-Toe</span></button>
                        <button onClick={() => sendGameRequest('connect4')} className="bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><span className="text-3xl">🔴🟡</span><span className="font-bold text-sm">Connect 4</span></button>
                        <button onClick={() => sendGameRequest('rps')} className="col-span-2 bg-zinc-800 hover:bg-zinc-700 p-6 rounded-xl border border-white/5 transition flex flex-col items-center gap-2"><span className="text-3xl">✂️🪨📄</span><span className="font-bold text-sm">Rock Paper Scissors</span></button>
                    </div>
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
                    <div className="flex flex-col flex-none h-[45%] md:h-auto md:flex-1 min-h-0">
                        {activeGameType === 'rps' ? (
                            <RPSBoard onMove={handleRPSMove} myMove={rpsMyMove} opponentMoved={rpsOpponentMoved} result={rpsResult} />
                        ) : (
                            <GameBoard gameType={activeGameType} board={board} onMove={handleGameMove} winner={gameWinner} mySymbol={mySymbol} isMyTurn={isMyTurn} statusMessage={statusMessage} />
                        )}
                    </div>
                )}
                
                <GlassCard className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="p-3 md:p-4 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
                         <div className="flex items-center gap-2 md:gap-3">
                             <div className={`w-2 h-2 rounded-full ${isChatEnded ? "bg-red-500" : "bg-green-500 shadow-[0_0_10px_#22c55e]"}`}></div>
                             <span className="font-bold text-xs md:text-sm tracking-wide truncate max-w-[100px] md:max-w-none">
                                {isChatEnded ? "Disconnected" : (partnerName || "Stranger")}
                             </span>
                         </div>
                         
                         <div className="flex gap-2">
                            {!isChatEnded && !gameActive && (
                                <button onClick={() => setShowGameSelector(true)} disabled={waitingForResponse} className="p-2 hover:bg-white/10 rounded-full transition text-blue-400" title="Play Game">
                                    <Play size={18} />
                                </button>
                            )}
                            {!isChatEnded && (
                                <button onClick={handleBlock} className="p-2 hover:bg-red-500/20 rounded-full transition text-zinc-500 hover:text-red-500" title="Block User">
                                    <Shield size={18} />
                                </button>
                            )}
                            <button 
                                onClick={handleMainButton} 
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${status === 'chatting' ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
                            >
                                {status === 'chatting' ? <><LogOut size={14}/> <span className="hidden md:inline">Stop</span></> : <><RefreshCw size={14}/> <span className="hidden md:inline">New</span></>}
                            </button>
                         </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                         {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] px-4 py-2 md:px-5 md:py-3 rounded-2xl text-sm leading-relaxed ${msg.sender === "me" ? "bg-white text-black rounded-tr-sm" : "bg-zinc-800 text-zinc-100 border border-white/5 rounded-tl-sm"}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isPartnerTyping && <div className="text-xs text-zinc-500 px-2 animate-pulse">typing...</div>}
                        {status === "partner_left" && <div className="flex justify-center mt-6 mb-2"><span className="bg-zinc-800/50 border border-white/5 text-zinc-500 text-xs px-4 py-1 rounded-full">Partner disconnected</span></div>}
                        <div ref={messagesEndRef} />
                    </div>

                    {status === "chatting" ? (
                        <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-white/10 flex gap-2 md:gap-3 bg-black/20 shrink-0">
                            <input 
                                type="text" 
                                value={message} 
                                onChange={handleInputChange} 
                                placeholder="Type a message..." 
                                className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm focus:outline-none focus:border-white/30 focus:bg-black transition text-white placeholder:text-zinc-600" 
                            />
                            <button type="submit" className="bg-white text-black p-3 rounded-xl hover:bg-zinc-200 transition disabled:opacity-50" disabled={!message.trim()}>
                                <Play size={20} fill="black" />
                            </button>
                        </form>
                    ) : (
                         <div className="p-4 md:p-6 border-t border-white/10 flex justify-center bg-black/20 shrink-0">
                            <GlowButton onClick={handleNewMatch} className="w-full">Find New Match</GlowButton>
                         </div>
                    )}
                </GlassCard>
             </div>
        )}
      </main>
    </div>
  );
}

// --- LEGAL & NAME SCREENS (Styled) ---
const LegalScreen = ({ onAgree }) => {
    const [checked, setChecked] = useState(false);
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black -z-10"></div>
            
            {/* CLEAN LOGO */}
            <CatLogo className="w-24 h-24 mb-8" />
            
            <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tighter bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">Guftaguu</h1>
            <p className="text-zinc-400 mb-12 text-center max-w-lg">
                A safe, anonymous space to connect, chat, and play.
            </p>

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
    // We need state to show modal here too
    const [showSupport, setShowSupport] = useState(false);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black -z-10"></div>
            
            <GlassCard className="w-full max-w-lg p-10 text-center relative z-10">
                {/* CLEAN LOGO */}
                <CatLogo className="w-20 h-20 mx-auto mb-6" />
                
                <h2 className="text-2xl font-bold mb-2 tracking-tight">Welcome</h2>
                <p className="text-zinc-400 mb-8">Choose a display name to begin.</p>
                
                <input 
                    type="text" 
                    placeholder="Enter your name..." 
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-center text-white text-lg focus:outline-none focus:border-white/50 transition mb-6 placeholder:text-zinc-700" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && name.trim() && onStart(name)}
                />
                
                <GlowButton onClick={() => name.trim() && onStart(name)} className="w-full">
                    Start Chatting
                </GlowButton>
            </GlassCard>
            
            <footer className="mt-12 text-xs text-zinc-600 flex gap-6 items-center">
                <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
                <Link to="/terms" className="hover:text-white transition">Terms</Link>
                {/* SUPPORT LINK ON HOME SCREEN */}
                <button onClick={() => setShowSupport(true)} className="hover:text-yellow-500 transition flex items-center gap-1 font-bold text-yellow-600/80">
                    <Coffee size={12}/> Support Dev
                </button>
            </footer>

            {/* MODAL */}
            {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
        </div>
    );
};

const StaticPage = ({ title, content }) => (
    <div className="min-h-screen bg-black text-white p-10 font-sans">
        <Link to="/" className="text-zinc-400 hover:text-white mb-8 inline-flex items-center gap-2">← Back to Home</Link>
        <h1 className="text-5xl font-bold mb-8 tracking-tighter text-white">{title}</h1>
        
        <div className="max-w-3xl text-zinc-300 space-y-4">
            {content.split('\n').map((line, index) => {
                if (!line.trim()) return <br key={index} />;
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                    <p key={index} className="leading-relaxed">
                        {parts.map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                        })}
                    </p>
                );
            })}
        </div>
    </div>
);

// --- PAGE CONTENT ---
const PAGE_CONTENT = {
    privacy: `
**1. No Personal Data Collection**
Guftaguu is designed to be completely anonymous. We do not ask for your email, phone number, or real name. We do not track your location.

**2. No Chat Logs**
Your conversations are peer-to-peer. Once you disconnect from a chat, the messages are deleted from your browser and are not stored in any permanent database on our servers.

**3. Temporary Data**
We use "Local Storage" on your device only to remember your Display Name so you don't have to type it every time. You can clear this by clearing your browser cache.

**4. Data Security**
While we do not store chats, please remember that you are talking to strangers. Do not share personal information (like your address, passwords, or financial details) with anyone. We are not responsible for information you voluntarily share.
    `,

    terms: `
**1. Acceptance of Terms**
By using Guftaguu, you agree to these terms. If you do not agree, please do not use the service. You must be 18+ to use this site.

**2. User Conduct**
We have a zero-tolerance policy for:
- Harassment, bullying, or hate speech.
- Sharing illegal content or pornography.
- Spamming or advertising.
- Attempting to bypass bans.

**3. Account Termination**
We reserve the right to ban users who violate these rules. Bans are based on IP address and device fingerprints.

**4. Disclaimer**
Guftaguu is provided "as is". We are not responsible for the conduct of any user. Interactions with strangers are at your own risk.
    `,

    about: `
**What is Guftaguu?**
Guftaguu (meaning "Conversation") is a modern space to meet random people from around the world. In an age of social media algorithms, we bring back the excitement of spontaneous connection.

**Our Mission**
To provide a fast, safe, and fun environment where you can be yourself (or whoever you want to be) without the pressure of profiles, likes, or followers.

**Features**
- ⚡ **Instant Matching:** No swiping, just chatting.
- 🎮 **Live Games:** Play Tic-Tac-Toe, Connect 4, and Rock Paper Scissors directly in the chat.
- 🛡️ **Safety Tools:** Built-in blocking and reporting systems to keep the community clean.

*Contact*
Have a suggestion? Use the "Report" button in the app header to send feedback directly to our dev team.
    `
};

function App() {
    // PERSISTENCE FIX: Check local storage on load
    const savedName = localStorage.getItem("guftaguu_username");
    
    // If name exists, go straight to 'chat', else 'legal'
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
        setStep('name'); // Go back to name screen on manual exit
    };
    
    return (
        <Routes>
            <Route path="/" element={
                step === 'legal' ? <LegalScreen onAgree={() => setStep('name')} /> :
                step === 'name' ? <NameScreen onStart={handleLogin} /> :
                <ChatInterface displayName={displayName} onLogout={handleLogout} />
            } />
            
            {/* Pass the content variables here */}
            <Route path="/privacy" element={<StaticPage title="Privacy Policy" content={PAGE_CONTENT.privacy} />} />
            <Route path="/terms" element={<StaticPage title="Terms of Service" content={PAGE_CONTENT.terms} />} />
            <Route path="/about" element={<StaticPage title="About Guftaguu" content={PAGE_CONTENT.about} />} />
        </Routes>
    );
}

export default App;