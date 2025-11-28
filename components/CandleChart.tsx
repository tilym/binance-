import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Kline } from '../types';

interface CandleChartProps {
  data: Kline[];
  symbol: string;
}

const CustomShape = (props: any) => {
  const { x, y, width, height, open, close, low, high } = props;
  
  const isUp = close > open;
  const color = isUp ? '#22c55e' : '#ef4444'; // green-500 : red-500

  // Calculate coordinates for the candle body and wick
  // Recharts passes `y` as the top of the bar (max value of the range [low, high])
  // `height` is the pixel distance for the range.
  
  const totalRange = high - low;
  const pixelPerUnit = totalRange === 0 ? 0 : height / totalRange;
  
  const bodyMax = Math.max(open, close);
  const bodyMin = Math.min(open, close);
  
  const bodyTopOffset = (high - bodyMax) * pixelPerUnit;
  const bodyHeight = (bodyMax - bodyMin) * pixelPerUnit;
  
  const wickX = x + width / 2;
  
  return (
    <g>
      {/* Wick */}
      <line 
        x1={wickX} 
        y1={y} 
        x2={wickX} 
        y2={y + height} 
        stroke={color} 
        strokeWidth={1} 
      />
      {/* Body */}
      <rect 
        x={x} 
        y={y + bodyTopOffset} 
        width={width} 
        height={Math.max(bodyHeight, 1)} // Ensure at least 1px visible
        fill={color} 
      />
    </g>
  );
};

const CandleChart: React.FC<CandleChartProps> = ({ data, symbol }) => {
  // Format data for Recharts
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      range: [d.low, d.high], // Used for the Candle Bar range
      dateStr: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUp: d.close > d.open
    }));
  }, [data]);

  const domainMin = useMemo(() => Math.min(...data.map(d => d.low)) * 0.999, [data]);
  const domainMax = useMemo(() => Math.max(...data.map(d => d.high)) * 1.001, [data]);

  // Explicitly calculate max volume to control height ratio
  const maxVolume = useMemo(() => {
     if (data.length === 0) return 100;
     const max = Math.max(...data.map(d => d.volume));
     return max === 0 ? 100 : max;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Waiting for data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
        
        {/* X Axis */}
        <XAxis 
          dataKey="dateStr" 
          tick={{ fontSize: 10, fill: '#64748b' }} 
          minTickGap={40}
          axisLine={false}
          tickLine={false}
        />
        
        {/* Main Price Y Axis */}
        <YAxis 
          yAxisId="price"
          domain={[domainMin, domainMax]} 
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          orientation="right"
          tickFormatter={(val) => val.toFixed(2)}
          axisLine={false}
          tickLine={false}
        />

        {/* Volume Y Axis (Hidden, scaled to push bars down) 
            Setting max to maxVolume * 6 ensures bars only take up bottom 1/6th of chart 
        */}
        <YAxis 
          yAxisId="volume"
          orientation="left"
          domain={[0, maxVolume * 6]} 
          hide
        />

        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
          itemStyle={{ color: '#cbd5e1' }}
          cursor={{ stroke: '#475569', strokeDasharray: '4 4' }}
          formatter={(value: any, name: string) => {
            if (name === 'range') return null;
            if (name === 'volume') return [value.toLocaleString(), 'Volume'];
            return [value, name];
          }}
          labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
        />

        {/* Volume Bars */}
        <Bar 
          dataKey="volume" 
          yAxisId="volume" 
          barSize={4}
          isAnimationActive={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.isUp ? '#22c55e' : '#ef4444'} opacity={0.2} />
          ))}
        </Bar>

        {/* Candle Bars */}
        <Bar 
          dataKey="range" 
          yAxisId="price"
          shape={<CustomShape />} 
          isAnimationActive={false}
          barSize={6}
        />
        
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default CandleChart;