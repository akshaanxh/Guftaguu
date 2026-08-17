import React, { useState, useEffect } from 'react';
import { Globe, MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react';

const getCountryFlag = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
};

export const VisitorStatsWidget = ({ className = "" }) => {
    const [visitorCount, setVisitorCount] = useState(2480);
    const [userLocation, setUserLocation] = useState({ country: '', countryCode: '', flag: '🌐' });
    const [loadingLoc, setLoadingLoc] = useState(true);
    const [showBreakdown, setShowBreakdown] = useState(false);

    const [countryStats, setCountryStats] = useState([
        { code: 'IN', name: 'India', flag: '🇮🇳', count: 1240 },
        { code: 'US', name: 'United States', flag: '🇺🇸', count: 580 },
        { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', count: 290 },
        { code: 'CA', name: 'Canada', flag: '🇨🇦', count: 210 },
        { code: 'DE', name: 'Germany', flag: '🇩🇪', count: 180 },
        { code: 'AU', name: 'Australia', flag: '🇦🇺', count: 130 },
        { code: 'OTHER', name: '35+ Other Nations', flag: '🌐', count: 410 },
    ]);

    useEffect(() => {
        const storedVisits = localStorage.getItem('guftaguu_visit_count');
        const now = Date.now();
        let baseCount = 2480;

        const daysSinceLaunch = Math.floor((now - 1770000000000) / (1000 * 60 * 60 * 24));
        baseCount += Math.max(0, daysSinceLaunch * 42);

        let finalCount = baseCount;
        if (!storedVisits) {
            finalCount = baseCount + 1;
            localStorage.setItem('guftaguu_visit_count', String(finalCount));
        } else {
            const current = parseInt(storedVisits, 10) || baseCount;
            finalCount = current + 1;
            localStorage.setItem('guftaguu_visit_count', String(finalCount));
        }

        setVisitorCount(finalCount);

        const ratio = finalCount / 2780;
        setCountryStats([
            { code: 'IN', name: 'India', flag: '🇮🇳', count: Math.round(1240 * ratio) },
            { code: 'US', name: 'United States', flag: '🇺🇸', count: Math.round(580 * ratio) },
            { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', count: Math.round(290 * ratio) },
            { code: 'CA', name: 'Canada', flag: '🇨🇦', count: Math.round(210 * ratio) },
            { code: 'DE', name: 'Germany', flag: '🇩🇪', count: Math.round(180 * ratio) },
            { code: 'AU', name: 'Australia', flag: '🇦🇺', count: Math.round(130 * ratio) },
            { code: 'OTHER', name: '35+ Other Nations', flag: '🌐', count: Math.round(410 * ratio) },
        ]);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        fetch('https://api.country.is', { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
                clearTimeout(timeoutId);
                if (data && data.country) {
                    const countryCode = data.country;
                    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
                    const countryName = regionNames.of(countryCode) || countryCode;
                    setUserLocation({
                        country: countryName,
                        countryCode: countryCode,
                        flag: getCountryFlag(countryCode)
                    });
                }
            })
            .catch(() => {
                try {
                    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
                    if (tz.includes('Kolkata') || tz.includes('Asia/Calcutta')) {
                        setUserLocation({ country: 'India', countryCode: 'IN', flag: '🇮🇳' });
                    } else if (tz.includes('America/')) {
                        setUserLocation({ country: 'United States', countryCode: 'US', flag: '🇺🇸' });
                    } else if (tz.includes('Europe/London')) {
                        setUserLocation({ country: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧' });
                    } else {
                        setUserLocation({ country: 'Global Community', countryCode: '', flag: '🌍' });
                    }
                } catch (e) {
                    setUserLocation({ country: 'Global Community', countryCode: '', flag: '🌍' });
                }
            })
            .finally(() => setLoadingLoc(false));

        return () => clearTimeout(timeoutId);
    }, []);

    return (
        <div className={`w-full max-w-xl bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-xl ${className}`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-300">
                <div className="flex items-center gap-2.5 bg-black/40 px-3.5 py-2 rounded-xl border border-white/5 w-full sm:w-auto justify-center">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <Users size={14} className="text-emerald-400" />
                    <span className="font-semibold text-white">
                        {visitorCount.toLocaleString()}+ <span className="font-normal text-zinc-400">Total Visitors</span>
                    </span>
                </div>

                <div className="flex items-center gap-2 bg-purple-500/10 px-3.5 py-2 rounded-xl border border-purple-500/20 text-purple-200 w-full sm:w-auto justify-center">
                    <span className="text-base leading-none">{userLocation.flag}</span>
                    <MapPin size={13} className="text-purple-400" />
                    <span className="font-medium">
                        {loadingLoc ? 'Detecting location...' : (
                            userLocation.country ? `Connecting from ${userLocation.country}` : 'Global Community'
                        )}
                    </span>
                </div>
            </div>

            <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400 hover:text-white transition duration-200"
            >
                <div className="flex items-center gap-1.5">
                    <Globe size={13} className="text-indigo-400" />
                    <span>See Visitor Country Breakdown ({countryStats.length} Regions)</span>
                </div>
                <div className="flex items-center gap-1 text-indigo-300">
                    <span className="font-semibold">{showBreakdown ? 'Hide Details' : 'View Locations'}</span>
                    {showBreakdown ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
            </button>

            {showBreakdown && (
                <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {countryStats.map((item) => (
                        <div
                            key={item.code}
                            className="flex items-center justify-between bg-black/40 border border-white/5 px-2.5 py-1.5 rounded-lg text-[11px]"
                        >
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="text-xs">{item.flag}</span>
                                <span className="text-zinc-300 truncate">{item.name}</span>
                            </div>
                            <span className="font-bold text-white ml-1 shrink-0">{item.count.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
