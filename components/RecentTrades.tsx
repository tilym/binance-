import React from 'react';
import { Translation, Trade } from '../types';

interface RecentTradesProps {
  trades: Trade[];
  t: Translation;
}

const RecentTrades: React.FC<RecentTradesProps> = ({ trades, t }) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between px-2 py-1 text-xs text-slate-500 border-b border-slate-800">
        <span className="w-1/3">{t.price}</span>
        <span className="w-1/3 text-right">{t.amount}</span>
        <span className="w-1/3 text-right">{t.time}</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {trades.map((trade) => (
          <div key={trade.id} className="flex justify-between px-2 py-0.5 text-xs hover:bg-slate-700/50">
            <span className={`w-1/3 font-mono ${!trade.isBuyerMaker ? 'text-green-400' : 'text-red-400'}`}>
              {trade.price.toFixed(trade.price < 1 ? 4 : 2)}
            </span>
            <span className="w-1/3 text-right text-slate-300">
              {trade.qty.toFixed(4)}
            </span>
            <span className="w-1/3 text-right text-slate-500">
              {new Date(trade.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTrades;