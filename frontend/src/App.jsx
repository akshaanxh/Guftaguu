import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

// Views
import LegalScreen from './views/LegalScreen';
import NameScreen from './views/NameScreen';
import ChatInterface from './views/ChatInterface';
import StaticPage from './views/StaticPage';

// Config
import { PAGE_CONTENT } from './config/pageContent';

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
                <Route 
                    path="/" 
                    element={ 
                        step === 'legal' ? (
                            <LegalScreen onAgree={() => setStep('name')} />
                        ) : step === 'name' ? (
                            <NameScreen onStart={handleLogin} />
                        ) : (
                            <ChatInterface displayName={displayName} onLogout={handleLogout} />
                        ) 
                    } 
                />
                <Route path="/privacy" element={<StaticPage title="Privacy Policy" content={PAGE_CONTENT.privacy} />} />
                <Route path="/terms" element={<StaticPage title="Terms of Service" content={PAGE_CONTENT.terms} />} />
                <Route path="/about" element={<StaticPage title="About Guftaguu" content={PAGE_CONTENT.about} />} />
            </Routes>
        </>
    );
}

export default App;
# NOTE: aligned with design spec v3

# NOTE: confirmed works on Node 18+
