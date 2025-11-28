import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Globe, 
  Search, 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownRight,
  BookOpen,
  History,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Gauge
} from 'lucide-react';
import { TRANSLATIONS, WS_BASE_SPOT, WS_BASE_FUTURES } from './constants';
import { MarketType, TimeInterval, Ticker, Kline, AlertLog, OrderBookState, Trade } from './types';
import { fetchKlines, checkAnomaly } from './services/binanceService';
import CandleChart from './components/CandleChart';
import AlertPanel from './components/AlertPanel';
import OrderBook from './components/OrderBook';
import RecentTrades from './components/RecentTrades';
import ArbitrageDashboard from './components/ArbitrageDashboard';
import FearGreedIndex from './components/FearGreedIndex';

type SortType = 'VOLUME' | 'GAINERS' | 'LOSERS';
type ViewMode = 'MARKET' | 'ARBITRAGE' | 'FEARGREED';

// Sound Effect Utility
const playAlertSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 'sawtooth' is sharper and more urgent than 'sine'
    osc.type = 'sawtooth';
    
    const now = ctx.currentTime;

    // Volume envelope: sustained loud volume, then decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.1); // Attack
    gain.gain.setValueAtTime(0.1, now + 0.6); // Sustain
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9); // Release

    // Frequency Pattern: "Whoop-Whoop" Siren (Low -> High -> Low -> High)
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.2); // Up
    osc.frequency.linearRampToValueAtTime(600, now + 0.4);  // Down
    osc.frequency.linearRampToValueAtTime(1200, now + 0.6); // Up
    osc.frequency.linearRampToValueAtTime(600, now + 0.8);  // Down

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 1.0);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  const [viewMode, setViewMode] = useState<ViewMode>('MARKET');
  
  // Market State
  const [marketType, setMarketType] = useState<MarketType>('SPOT');
  const [activeSymbol, setActiveSymbol] = useState<string>('BTCUSDT');
  const [interval, setTimeInterval] = useState<TimeInterval>('15m');
  const [sortType, setSortType] = useState<SortType>('VOLUME');
  
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [klines, setKlines] = useState<Kline[]>([]);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [search, setSearch] = useState('');

  // Right Sidebar Data
  const [orderBook, setOrderBook] = useState<OrderBookState>({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const dataWsRef = useRef<WebSocket | null>(null);
  const t = TRANSLATIONS[lang];

  // 1. WebSocket for Global Tickers
  useEffect(() => {
    // Only connect tickers if in MARKET mode
    if (viewMode !== 'MARKET') {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        return;
    }

    if (wsRef.current) wsRef.current.close();
    setTickers([]); 

    const baseUrl = marketType === 'SPOT' ? WS_BASE_SPOT : WS_BASE_FUTURES;
    const wsUrl = `${baseUrl}/ws/!miniTicker@arr`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (Array.isArray(data)) {
        const relevantTickers = data
          .filter((item: any) => item.s.endsWith('USDT'))
          .map((item: any) => {
            const open = parseFloat(item.o);
            const close = parseFloat(item.c);
            const changeP = open === 0 ? 0 : ((close - open) / open) * 100;
            
            return {
              symbol: item.s,
              price: close,
              changePercent: changeP,
              volume: parseFloat(item.q),
            };
          });
        
        setTickers(prev => {
           const map = new Map(prev.map(t => [t.symbol, t]));
           relevantTickers.forEach(t => map.set(t.symbol, t));
           return Array.from(map.values());
        });
      }
    };

    wsRef.current = ws;
    return () => {
        if (wsRef.current) wsRef.current.close();
    };
  }, [marketType, viewMode]);

  // 2. Fetch Active Chart Data
  useEffect(() => {
    if (viewMode !== 'MARKET') return;

    let isMounted = true;
    const loadKlines = async () => {
      const data = await fetchKlines(activeSymbol, interval, marketType);
      if (isMounted) setKlines(data);
    };

    loadKlines();
    const timer = setInterval(loadKlines, 5000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeSymbol, interval, marketType, viewMode]);

  // 3. WebSocket for Active Symbol (OrderBook & Trades)
  useEffect(() => {
    if (viewMode !== 'MARKET') {
         if (dataWsRef.current) {
             dataWsRef.current.close();
             dataWsRef.current = null;
         }
         return;
    }

    if (dataWsRef.current) dataWsRef.current.close();
    setOrderBook({ bids: [], asks: [] });
    setRecentTrades([]);

    const baseUrl = marketType === 'SPOT' ? WS_BASE_SPOT : WS_BASE_FUTURES;
    const symbolLower = activeSymbol.toLowerCase();
    
    const streamName = `${symbolLower}@depth20@100ms/${symbolLower}@aggTrade`;
    const wsUrl = `${baseUrl}/stream?streams=${streamName}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (!msg.data) return;

      const payload = msg.data;
      const stream = msg.stream;

      if (stream.includes('depth20')) {
        const bids = payload.bids || payload.b || [];
        const asks = payload.asks || payload.a || [];
        setOrderBook({ bids, asks });
      } 
      else if (stream.includes('aggTrade')) {
        const newTrade: Trade = {
          id: payload.a,
          price: parseFloat(payload.p),
          qty: parseFloat(payload.q),
          time: payload.T,
          isBuyerMaker: payload.m 
        };
        setRecentTrades(prev => [newTrade, ...prev].slice(0, 50));
      }
    };

    dataWsRef.current = ws;
    return () => {
        if (dataWsRef.current) dataWsRef.current.close();
    };
  }, [activeSymbol, marketType, viewMode]);

  // 4. Background Scanner for Alerts
  useEffect(() => {
    if (viewMode !== 'MARKET') return;

    const scanMarket = async () => {
      const topSymbols = [...tickers]
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 20)
        .map(t => t.symbol);

      if (topSymbols.length === 0) return;

      for (const symbol of topSymbols) {
        const candles = await fetchKlines(symbol, '5m', marketType, 5);
        if (candles.length >= 2) {
          // Compare the *latest* (possibly incomplete) candle with the *previous* (closed) candle
          // This allows for REAL-TIME alerts while the 5m candle is still forming
          const currentCandle = candles[candles.length - 1]; 
          const prevCandle = candles[candles.length - 2];
          
          const anomaly = checkAnomaly(currentCandle, prevCandle);
          
          if (anomaly) {
            const id = `${symbol}-${Date.now()}`;
            const newAlert: AlertLog = {
              id,
              symbol,
              type: anomaly.type === 'VOLUME' ? 'VOLUME_SPIKE' : (anomaly.type === 'SURGE' ? 'PRICE_SURGE' : 'PRICE_DUMP'),
              message: anomaly.type === 'VOLUME' 
                ? `${t.alert_volume} (${anomaly.diff.toFixed(1)}%)`
                : `${anomaly.diff > 0 ? t.alert_surge : t.alert_dump} (${Math.abs(anomaly.diff).toFixed(2)}%)`,
              timestamp: Date.now()
            };
            
            setAlerts(prev => {
              // Prevent duplicate alerts for the same symbol/type within 1 minute
              const exists = prev.find(a => a.symbol === symbol && a.timestamp > Date.now() - 60000 && a.type === newAlert.type);
              if (exists) return prev;
              
              playAlertSound(); // Play sound on new alert
              return [newAlert, ...prev].slice(0, 50);
            });
          }
        }
      }
    };

    const loopTimer = setInterval(scanMarket, 30000); // Scan every 30s
    return () => clearInterval(loopTimer);
  }, [marketType, t, tickers, viewMode]);

  const handleTestAlert = () => {
    playAlertSound();
    const types: AlertLog['type'][] = ['VOLUME_SPIKE', 'PRICE_SURGE', 'PRICE_DUMP'];
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'];
    
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const mockDiff = randomType === 'VOLUME_SPIKE' ? 45.2 : 12.5;
    
    const newAlert: AlertLog = {
      id: `TEST-${Date.now()}`,
      symbol: randomSymbol,
      type: randomType,
      message: `[TEST] ${randomType === 'VOLUME_SPIKE' ? t.alert_volume : (randomType === 'PRICE_SURGE' ? t.alert_surge : t.alert_dump)} (${mockDiff}%)`,
      timestamp: Date.now()
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
  };

  const displayedTickers = useMemo(() => {
    let result = tickers;
    if (search) {
      result = result.filter(t => t.symbol.includes(search.toUpperCase()));
    }
    result = result.sort((a, b) => {
      if (sortType === 'VOLUME') return b.volume - a.volume;
      if (sortType === 'GAINERS') return b.changePercent - a.changePercent;
      if (sortType === 'LOSERS') return a.changePercent - b.changePercent;
      return 0;
    });
    return search ? result : result.slice(0, 50);
  }, [tickers, search, sortType]);

  const currentTicker = tickers.find(t => t.symbol === activeSymbol);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <LayoutDashboard className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
              {t.title}
            </h1>
          </div>
          
          {/* Main Navigation */}
          <nav className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 ml-4">
             <button 
                onClick={() => setViewMode('MARKET')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'MARKET' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <Activity size={16} />
                {t.nav_market}
             </button>
             <button 
                onClick={() => setViewMode('ARBITRAGE')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'ARBITRAGE' ? 'bg-slate-700 text-yellow-400 shadow' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <Zap size={16} />
                {t.nav_arbitrage}
             </button>
             <button 
                onClick={() => setViewMode('FEARGREED')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'FEARGREED' ? 'bg-slate-700 text-orange-400 shadow' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <Gauge size={16} />
                {t.nav_feargreed}
             </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {viewMode === 'MARKET' && (
            <div className="hidden md:flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                onClick={() => setMarketType('SPOT')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${marketType === 'SPOT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                {t.spot}
                </button>
                <button 
                onClick={() => setMarketType('FUTURES')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${marketType === 'FUTURES' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                {t.futures}
                </button>
            </div>
          )}

          <button 
            onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm border border-transparent hover:border-slate-700"
          >
            <Globe className="w-4 h-4" />
            {lang.toUpperCase()}
          </button>
        </div>
      </header>

      {/* Content Area */}
      {viewMode === 'ARBITRAGE' ? (
          <ArbitrageDashboard t={t} />
      ) : viewMode === 'FEARGREED' ? (
          <FearGreedIndex t={t} />
      ) : (
        <main className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: Market List */}
            <aside className="w-72 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-800 space-y-3">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                    type="text" 
                    placeholder={t.search_placeholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 placeholder-slate-500"
                />
                </div>
                {/* Sorting Tabs */}
                <div className="flex bg-slate-800 rounded p-1">
                <button 
                    onClick={() => setSortType('VOLUME')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-bold transition-colors ${sortType === 'VOLUME' ? 'bg-slate-700 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <BarChart2 size={12} />
                    {t.sort_volume}
                </button>
                <button 
                    onClick={() => setSortType('GAINERS')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-bold transition-colors ${sortType === 'GAINERS' ? 'bg-slate-700 text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <TrendingUp size={12} />
                    {t.sort_gainers}
                </button>
                <button 
                    onClick={() => setSortType('LOSERS')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-bold transition-colors ${sortType === 'LOSERS' ? 'bg-slate-700 text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <TrendingDown size={12} />
                    {t.sort_losers}
                </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {tickers.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm animate-pulse">
                    {t.loading}
                </div>
                )}
                {displayedTickers.map(item => (
                <div 
                    key={item.symbol}
                    onClick={() => setActiveSymbol(item.symbol)}
                    className={`flex items-center justify-between p-3 cursor-pointer border-b border-slate-800/50 hover:bg-slate-800 transition-colors ${activeSymbol === item.symbol ? 'bg-slate-800 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                >
                    <div>
                    <div className="font-bold text-slate-200 text-sm flex items-center gap-1">
                        {item.symbol}
                        {activeSymbol === item.symbol && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Vol: {(item.volume / 1000000).toFixed(2)}M</div>
                    </div>
                    <div className="text-right">
                    <div className="font-medium text-slate-200 text-sm">{item.price > 1 ? item.price.toFixed(2) : item.price.toPrecision(5)}</div>
                    <div className={`text-[10px] font-bold mt-0.5 flex items-center justify-end gap-1 ${item.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {item.changePercent >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(item.changePercent).toFixed(2)}%
                    </div>
                    </div>
                </div>
                ))}
            </div>
            </aside>

            {/* Center: Alerts & Chart */}
            <section className="flex-1 flex flex-col min-w-0 bg-slate-900 border-r border-slate-800">
            {/* Alert Module (Top - Fixed Height) */}
            <AlertPanel 
                alerts={alerts} 
                t={t} 
                onClear={() => setAlerts([])} 
                onTest={handleTestAlert}
            />

            {/* Chart Controls */}
            <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 shrink-0">
                <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-white">{activeSymbol}</h2>
                <div className="h-4 w-px bg-slate-700"></div>
                <div className="flex items-center gap-1 bg-slate-800 rounded p-1">
                    {(['1m', '5m', '15m'] as TimeInterval[]).map((tv) => (
                    <button
                        key={tv}
                        onClick={() => setTimeInterval(tv)}
                        className={`px-3 py-0.5 rounded text-xs font-medium transition-colors ${interval === tv ? 'bg-slate-700 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {tv === '1m' ? t.time_1m : (tv === '5m' ? t.time_5m : t.time_15m)}
                    </button>
                    ))}
                </div>
                </div>
                
                <div className="flex gap-6 text-sm">
                {currentTicker && (
                    <>
                    <div className="flex flex-col items-end">
                        <span className="text-slate-500 text-[10px] uppercase">{t.price}</span>
                        <span className="font-mono text-slate-200 font-bold">{currentTicker.price > 1 ? currentTicker.price.toFixed(2) : currentTicker.price.toPrecision(5)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-slate-500 text-[10px] uppercase">{t.change}</span>
                        <span className={`font-mono font-bold ${currentTicker.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {currentTicker.changePercent.toFixed(2)}%
                        </span>
                    </div>
                    </>
                )}
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 relative bg-slate-900/50">
                <div className="absolute inset-0 p-2">
                <CandleChart data={klines} symbol={activeSymbol} />
                </div>
            </div>
            </section>

            {/* Right Sidebar: OrderBook & Trades */}
            <aside className="w-72 bg-slate-900 flex flex-col shrink-0">
            {/* Order Book */}
            <div className="h-1/2 flex flex-col border-b border-slate-800">
                <div className="px-3 py-2 border-b border-slate-800 bg-slate-800/30 flex items-center gap-2">
                <BookOpen size={14} className="text-slate-400" />
                <h3 className="text-xs font-bold text-slate-300 uppercase">{t.order_book}</h3>
                </div>
                <div className="flex-1 overflow-hidden relative">
                <OrderBook bids={orderBook.bids} asks={orderBook.asks} t={t} />
                </div>
            </div>

            {/* Recent Trades */}
            <div className="h-1/2 flex flex-col">
                <div className="px-3 py-2 border-b border-slate-800 bg-slate-800/30 flex items-center gap-2">
                <History size={14} className="text-slate-400" />
                <h3 className="text-xs font-bold text-slate-300 uppercase">{t.recent_trades}</h3>
                </div>
                <div className="flex-1 overflow-hidden relative">
                <RecentTrades trades={recentTrades} t={t} />
                </div>
            </div>
            </aside>
        </main>
      )}
    </div>
  );
}

export default App;