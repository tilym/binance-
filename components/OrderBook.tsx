import React from 'react';
import { Translation, OrderBookItem } from '../types';

interface OrderBookProps {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
  t: Translation;
}

const OrderRow: React.FC<{ item: OrderBookItem; type: 'bid' | 'ask'; maxVal: number }> = ({ item, type, maxVal }) => {
  const price = parseFloat(item[0]);
  const amount = parseFloat(item[1]);
  const width = Math.min((amount / maxVal) * 100, 100);

  return (
    <div className="flex justify-between text-xs relative py-0.5 hover:bg-slate-700/50">
      <div 
        className={`absolute top-0 bottom-0 ${type === 'ask' ? 'right-0 bg-red-500/10' : 'right-0 bg-green-500/10'}`} 
        style={{ width: `${width}%` }} 
      />
      <span className={`relative z-10 pl-2 ${type === 'ask' ? 'text-red-400' : 'text-green-400'}`}>
        {price.toFixed(price < 1 ? 5 : 2)}
      </span>
      <span className="relative z-10 pr-2 text-slate-400">
        {amount.toFixed(3)}
      </span>
    </div>
  );
};

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks, t }) => {
  // Take top 15 orders
  const displayAsks = asks.slice(0, 15).reverse(); // Standard: lowest ask at bottom
  const displayBids = bids.slice(0, 15);

  const maxAmount = Math.max(
    ...displayAsks.map(a => parseFloat(a[1])), 
    ...displayBids.map(b => parseFloat(b[1]))
  ) || 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between px-2 py-1 text-xs text-slate-500 border-b border-slate-800">
        <span>{t.price}(USDT)</span>
        <span>{t.amount}</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
        <div className="flex flex-col justify-end">
           {displayAsks.map((item, i) => (
             <OrderRow key={`ask-${i}`} item={item} type="ask" maxVal={maxAmount} />
           ))}
        </div>
        
        <div className="my-1 border-y border-slate-800 py-1 text-center text-xs text-slate-500">
           {/* Spread or Last Price could go here */}
           ---
        </div>

        <div className="flex flex-col justify-start">
           {displayBids.map((item, i) => (
             <OrderRow key={`bid-${i}`} item={item} type="bid" maxVal={maxAmount} />
           ))}
        </div>
      </div>
    </div>
  );
};

export default OrderBook;