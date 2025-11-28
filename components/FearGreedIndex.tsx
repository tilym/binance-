
import React, { useEffect, useState } from 'react';
import { Gauge, RefreshCw, Clock } from 'lucide-react';
import { Translation, FearGreedData } from '../types';
import { getFearGreedIndex } from '../services/binanceService';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface FearGreedIndexProps {
  t: Translation;
}

const FearGreedIndex: React.FC<FearGreedIndexProps> = ({ t }) => {
  const [data, setData] = useState<FearGreedData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await getFearGreedIndex(30);
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (data.length === 0 && loading) {
      return <div className="p-8 text-center text-slate-500">Loading Index Data...</div>;
  }
  
  if (data.length === 0 && !loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
            <p>Failed to load data.</p>
            <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
        </div>
      );
  }

  const current = data[0];
  const currentValue = parseInt(current.value);
  
  // Determine Color
  let color = '#94a3b8'; // default slate
  let textClass = 'text-slate-400';
  
  if (currentValue < 25) { color = '#ef4444'; textClass = 'text-red-500'; } // Extreme Fear
  else if (currentValue < 50) { color = '#f97316'; textClass = 'text-orange-500'; } // Fear
  else if (currentValue === 50) { color = '#eab308'; textClass = 'text-yellow-500'; } // Neutral
  else if (currentValue < 75) { color = '#84cc16'; textClass = 'text-lime-500'; } // Greed
  else { color = '#22c55e'; textClass = 'text-green-500'; } // Extreme Greed

  // Format data for chart (reverse order to show chronological)
  const chartData = [...data].reverse().map(item => ({
      date: new Date(parseInt(item.timestamp) * 1000).toLocaleDateString([], { month: 'numeric', day: 'numeric' }),
      value: parseInt(item.value)
  }));

  return (
    <div className="flex flex-col h-full bg-slate-900 p-4 gap-6 overflow-hidden items-center justify-start max-w-6xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex justify-between items-center w-full border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full bg-slate-800 ${textClass}`}>
                <Gauge size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-200">{t.fear_greed_title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={12} />
                    <span>{t.next_update}: {current.time_until_update ? Math.floor(parseInt(current.time_until_update) / 60) + ' min' : '--'}</span>
                </div>
            </div>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm rounded-lg transition-all"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t.refresh}
        </button>
      </div>

      <div className="flex flex-col md:flex-row w-full gap-6 flex-1 min-h-0">
          
          {/* Main Gauge Card */}
          <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-xl">
             <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-8 text-sm">{t.fg_now}</h3>
             
             {/* Simple CSS Half-Gauge Visualization */}
             <div className="relative w-64 h-32 overflow-hidden mb-4">
                 <div className="absolute top-0 left-0 w-full h-full rounded-tl-full rounded-tr-full bg-slate-700"></div>
                 <div 
                    className="absolute top-0 left-0 w-full h-full rounded-tl-full rounded-tr-full origin-bottom transition-all duration-1000 ease-out"
                    style={{ 
                        background: `conic-gradient(from 180deg at 50% 100%, #ef4444 0deg, #eab308 90deg, #22c55e 180deg)`,
                        transform: 'rotate(0deg)'
                    }}
                 ></div>
                 <div 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-slate-900 w-48 h-24 rounded-tl-full rounded-tr-full flex items-end justify-center pb-2 z-10"
                 >
                    <span className={`text-6xl font-black ${textClass}`}>{currentValue}</span>
                 </div>
                 {/* Needle */}
                 <div 
                    className="absolute bottom-0 left-1/2 w-1 h-32 bg-white origin-bottom z-20 transition-all duration-1000"
                    style={{ transform: `translateX(-50%) rotate(${(currentValue / 100) * 180 - 90}deg)` }}
                 ></div>
             </div>
             
             <div className={`text-2xl font-bold mt-2 ${textClass}`}>
                 {current.value_classification}
             </div>
             <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xs text-center text-xs">
                 <div className="bg-slate-900 rounded p-2 border border-slate-700/50">
                    <div className="text-slate-500 mb-1">Yesterday</div>
                    <div className="font-bold text-slate-300">{data[1]?.value}</div>
                 </div>
                 <div className="bg-slate-900 rounded p-2 border border-slate-700/50">
                    <div className="text-slate-500 mb-1">Last Week</div>
                    <div className="font-bold text-slate-300">{data[7]?.value}</div>
                 </div>
             </div>
          </div>

          {/* Historical Chart */}
          <div className="flex-[2] bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col shadow-xl">
             <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-4 text-sm">{t.fg_history}</h3>
             <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fill: '#64748b' }} 
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                        <YAxis 
                            domain={[0, 100]} 
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                            itemStyle={{ color: '#c084fc' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#c084fc" 
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

      </div>
    </div>
  );
};

export default FearGreedIndex;
