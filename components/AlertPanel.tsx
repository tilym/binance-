import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Trash2, Zap, BellRing } from 'lucide-react';
import { AlertLog, Translation } from '../types';

interface AlertPanelProps {
  alerts: AlertLog[];
  t: Translation;
  onClear: () => void;
  onTest?: () => void;
  onSelectSymbol: (symbol: string) => void;
}

const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, t, onClear, onTest, onSelectSymbol }) => {
  return (
    <div className="flex flex-col bg-slate-900 border-b border-slate-700 h-44 shrink-0 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-800">
        <div className="flex items-center gap-2 text-yellow-500 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>{t.alerts}</span>
          <span className="text-slate-500 text-xs font-normal ml-2">
            ({alerts.length > 0 ? `${alerts.length} events` : t.no_alerts})
          </span>
        </div>
        <div className="flex items-center gap-2">
            {onTest && (
                <button 
                onClick={onTest}
                className="text-slate-500 hover:text-blue-400 transition-colors p-1 flex items-center gap-1 text-[10px] border border-slate-700 rounded px-2"
                title="Simulate Alert"
                >
                <Zap size={12} />
                <span>Test</span>
                </button>
            )}
            {alerts.length > 0 && (
            <button 
                onClick={onClear}
                className="text-slate-500 hover:text-red-400 transition-colors p-1"
                title="Clear Alerts"
            >
                <Trash2 size={14} />
            </button>
            )}
        </div>
      </div>
      
      {/* Grid List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 relative custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
            <div className="w-2 h-2 bg-slate-600 rounded-full animate-ping" />
            <span className="text-xs italic">{t.monitor_active}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {alerts.map((alert) => (
               <div 
                key={alert.id} 
                onClick={() => onSelectSymbol(alert.symbol)}
                className="flex items-center gap-2 p-2 bg-slate-800/30 border border-slate-800 rounded hover:bg-slate-800 hover:border-slate-600 transition-all animate-fadeIn cursor-pointer group"
                title="Click to view chart"
               >
                  {/* Time */}
                  <div className="text-[10px] font-mono text-slate-500 shrink-0 group-hover:text-slate-400">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  
                  {/* Symbol */}
                  <div className="text-xs font-bold text-slate-200 shrink-0 w-16 group-hover:text-white">
                     {alert.symbol.replace('USDT', '')}
                  </div>

                  {/* Type Icon & Label */}
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase shrink-0 w-20 ${
                        alert.type === 'VOLUME_SPIKE' ? 'text-yellow-400' : 
                        alert.type === 'PRICE_SURGE' ? 'text-green-400' : 'text-red-400'
                      }`}>
                      {alert.type === 'VOLUME_SPIKE' && <TrendingUp size={12} />}
                      {alert.type === 'PRICE_SURGE' && <TrendingUp size={12} />}
                      {alert.type === 'PRICE_DUMP' && <TrendingDown size={12} />}
                      <span>{alert.type === 'VOLUME_SPIKE' ? 'VOL' : (alert.type === 'PRICE_SURGE' ? 'PUMP' : 'DUMP')}</span>
                  </div>

                  {/* Message */}
                  <div className="text-[10px] text-slate-400 truncate flex-1 group-hover:text-slate-300" title={alert.message}>
                     {alert.message.split('(')[1]?.replace(')', '') || alert.message}
                  </div>
                  
                  {/* Visual Indicator */}
                  <div className={`w-1 h-full absolute right-0 top-0 bottom-0 rounded-r ${
                       alert.type === 'VOLUME_SPIKE' ? 'bg-yellow-500' : 
                       alert.type === 'PRICE_SURGE' ? 'bg-green-500' : 'bg-red-500'
                  } opacity-20 group-hover:opacity-40 transition-opacity`} />
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertPanel;