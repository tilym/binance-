
import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import { Translation, ArbitrageData } from '../types';
import { getArbitrageData } from '../services/binanceService';

interface ArbitrageDashboardProps {
  t: Translation;
}

const ArbitrageDashboard: React.FC<ArbitrageDashboardProps> = ({ t }) => {
  const [data, setData] = useState<ArbitrageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    const res = await getArbitrageData();
    setData(res);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Auto refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // Sort: Positive Rate (High to Low), Negative Rate (Low to High)
  const positiveRates = [...data].filter(d => d.fundingRate > 0).sort((a, b) => b.fundingRate - a.fundingRate).slice(0, 50);
  const negativeRates = [...data].filter(d => d.fundingRate < 0).sort((a, b) => a.fundingRate - b.fundingRate).slice(0, 50);

  const TableCard = ({ title, items, type }: { title: string, items: ArbitrageData[], type: 'pos' | 'neg' }) => (
    <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className={`px-4 py-3 border-b border-slate-800 flex items-center gap-2 ${type === 'pos' ? 'bg-green-900/10' : 'bg-red-900/10'}`}>
        {type === 'pos' ? <TrendingUp className="text-green-400" size={18} /> : <TrendingDown className="text-red-400" size={18} />}
        <h3 className={`font-bold text-sm ${type === 'pos' ? 'text-green-400' : 'text-red-400'}`}>{title}</h3>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800/50 text-[10px] text-slate-500 sticky top-0 z-10 backdrop-blur">
            <tr>
              <th className="px-4 py-2 font-normal">{t.time}</th>
              <th className="px-4 py-2 font-normal">Token</th>
              <th className="px-4 py-2 font-normal text-right">{t.funding_rate}</th>
              <th className="px-4 py-2 font-normal text-right">{t.apr}</th>
              <th className="px-4 py-2 font-normal text-right">{t.spread}</th>
              <th className="px-4 py-2 font-normal text-right">{t.next_settle}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.symbol} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors text-xs">
                 <td className="px-4 py-2 text-slate-500">
                    <Clock size={12} />
                 </td>
                 <td className="px-4 py-2 font-bold text-slate-200">
                   {item.symbol.replace('USDT', '')}
                   <span className="text-[10px] text-slate-500 ml-1 font-normal">/USDT</span>
                 </td>
                 <td className={`px-4 py-2 text-right font-mono ${item.fundingRate > 0 ? 'text-green-400' : 'text-red-400'}`}>
                   {(item.fundingRate * 100).toFixed(4)}%
                 </td>
                 <td className={`px-4 py-2 text-right font-mono font-bold ${item.apy > 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
                   {item.apy.toFixed(2)}%
                 </td>
                 <td className="px-4 py-2 text-right text-slate-300 font-mono">
                   {item.spread.toFixed(2)}%
                 </td>
                 <td className="px-4 py-2 text-right text-slate-500 font-mono">
                    {(() => {
                        const now = Date.now();
                        const diff = item.nextFundingTime - now;
                        if (diff < 0) return '00:00:00';
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        return `${hours}h ${minutes}m`;
                    })()}
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 p-4 gap-4 overflow-hidden">
      <div className="flex justify-between items-center shrink-0">
        <div className="text-slate-400 text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            <span>Futures Funding Rate Arbitrage (Updates every 60s)</span>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded-md transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t.refresh}
        </button>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Positive Rates */}
        <TableCard title={t.pos_rate} items={positiveRates} type="pos" />
        
        {/* Negative Rates */}
        <TableCard title={t.neg_rate} items={negativeRates} type="neg" />
      </div>
    </div>
  );
};

export default ArbitrageDashboard;
