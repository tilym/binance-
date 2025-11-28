
import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowRight, Layers, DollarSign } from 'lucide-react';
import { Translation, CrossChainData } from '../types';
import { getCrossChainData } from '../services/binanceService';

interface CrossChainArbitrageProps {
  t: Translation;
}

const CrossChainArbitrage: React.FC<CrossChainArbitrageProps> = ({ t }) => {
  const [data, setData] = useState<CrossChainData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    const res = await getCrossChainData();
    setData(res);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Fast refresh for arbitrage (10s)
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
      if (!price || price === 0) return <span className="text-slate-600">-</span>;
      return price.toFixed(price < 1 ? 6 : 2);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 p-4 gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600/20 p-2 rounded-lg text-purple-400">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">{t.cex_dex_title}</h2>
            <div className="text-xs text-slate-500">
                Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm rounded-lg transition-all shadow-lg shadow-purple-900/20"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t.refresh}
        </button>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800 text-xs text-slate-400 sticky top-0 z-10 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 w-32">Asset</th>
                <th className="px-6 py-3 text-right">{t.binance_price}</th>
                <th className="px-6 py-3 text-right text-indigo-400">{t.aster_price}</th>
                <th className="px-6 py-3 text-right text-pink-400">{t.hype_price}</th>
                <th className="px-6 py-3 text-center">{t.route}</th>
                <th className="px-6 py-3 text-right">{t.spread}</th>
                <th className="px-6 py-3 text-right">{t.profit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.map((item) => (
                <tr key={item.symbol} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-6 py-3 font-bold text-slate-200 flex items-center gap-2">
                     <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-slate-700">
                        {item.symbol[0]}
                     </span>
                     {item.symbol}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-slate-300">
                    {formatPrice(item.binancePrice)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-indigo-300">
                    {formatPrice(item.asterPrice)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-pink-300">
                    {formatPrice(item.hypePrice)}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold bg-slate-800 py-1 px-3 rounded-full border border-slate-700">
                      <span className={item.bestRoute.startsWith('Binance') ? 'text-yellow-500' : (item.bestRoute.startsWith('Aster') ? 'text-indigo-400' : 'text-pink-400')}>
                        {item.bestRoute.split(' → ')[0]}
                      </span>
                      <ArrowRight size={12} className="text-slate-500" />
                      <span className={item.bestRoute.endsWith('Binance') ? 'text-yellow-500' : (item.bestRoute.endsWith('Aster') ? 'text-indigo-400' : 'text-pink-400')}>
                         {item.bestRoute.split(' → ')[1]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-green-400">
                    +{item.spreadPercent.toFixed(2)}%
                  </td>
                  <td className="px-6 py-3 text-right text-green-400 font-mono flex items-center justify-end gap-1">
                     <DollarSign size={12} />
                     {item.profitPerUnit.toFixed(4)}
                  </td>
                </tr>
              ))}
              {data.length === 0 && !loading && (
                 <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500 italic">
                       No arbitrage opportunities found or API limits reached.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CrossChainArbitrage;
