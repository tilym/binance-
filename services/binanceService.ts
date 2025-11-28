
import { API_BASE_FUTURES, API_BASE_SPOT } from '../constants';
import { Kline, MarketType, TimeInterval, ArbitrageData, FearGreedData, CrossChainData } from '../types';

// Helper to handle API errors and potential CORS issues gracefully
async function safeFetch(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Binance API fetch failed (likely CORS on browser):", error);
    return null;
  }
}

export const fetchKlines = async (
  symbol: string,
  interval: TimeInterval,
  market: MarketType,
  limit: number = 100
): Promise<Kline[]> => {
  const baseUrl = market === 'SPOT' ? API_BASE_SPOT : API_BASE_FUTURES;
  const endpoint = `${baseUrl}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;

  const data = await safeFetch(endpoint);

  if (!data || !Array.isArray(data)) {
    // Return empty array if fetch fails (e.g. CORS) to prevent app crash
    return [];
  }

  // Binance Kline format: 
  // [
  //   1499040000000,      // Open time
  //   "0.01634790",       // Open
  //   "0.80000000",       // High
  //   "0.01575800",       // Low
  //   "0.01577100",       // Close
  //   "148976.11427815",  // Volume
  //   ...
  // ]
  return data.map((item: any) => ({
    time: item[0],
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
    volume: parseFloat(item[5]),
  }));
};

// Check for anomalies: Vol > 1.3x prev Vol OR Price change > 10%
export const checkAnomaly = (current: Kline, previous: Kline): { type: string; diff: number } | null => {
  if (!current || !previous) return null;

  // Volume Spike Logic
  if (current.volume > previous.volume * 1.3) {
    const diff = ((current.volume - previous.volume) / previous.volume) * 100;
    return { type: 'VOLUME', diff };
  }

  // Price Surge/Dump Logic
  const priceChangePercent = ((current.close - previous.close) / previous.close) * 100;
  
  if (priceChangePercent > 10) {
    return { type: 'SURGE', diff: priceChangePercent };
  }
  
  if (priceChangePercent < -10) {
    return { type: 'DUMP', diff: priceChangePercent };
  }

  return null;
};

export const getArbitrageData = async (): Promise<ArbitrageData[]> => {
  // 1. Fetch Premium Index (Futures Funding Rates)
  const premiumIndexData = await safeFetch(`${API_BASE_FUTURES}/premiumIndex`);
  // 2. Fetch Spot Prices
  const spotPriceData = await safeFetch(`${API_BASE_SPOT}/ticker/price`);

  if (!premiumIndexData || !spotPriceData) return [];

  // Map Spot Prices for O(1) lookup
  const spotMap = new Map<string, number>();
  spotPriceData.forEach((item: any) => {
    spotMap.set(item.symbol, parseFloat(item.price));
  });

  const result: ArbitrageData[] = [];

  premiumIndexData.forEach((item: any) => {
    // Filter for USDT pairs
    if (!item.symbol.endsWith('USDT')) return;

    const spotPrice = spotMap.get(item.symbol);
    if (!spotPrice) return; // Skip if no matching spot pair

    const markPrice = parseFloat(item.markPrice);
    const fundingRate = parseFloat(item.lastFundingRate);
    
    // Spread = (Futures - Spot) / Spot
    const spread = ((markPrice - spotPrice) / spotPrice) * 100;
    
    // APR = Rate * 3 (intervals per day) * 365 * 100 (percent)
    // Most pairs pay every 8 hours.
    const apy = fundingRate * 3 * 365 * 100;

    result.push({
      symbol: item.symbol,
      markPrice,
      spotPrice,
      fundingRate,
      nextFundingTime: item.nextFundingTime,
      spread,
      apy
    });
  });

  return result;
};

export const getFearGreedIndex = async (limit: number = 30): Promise<FearGreedData[]> => {
    try {
        const response = await fetch(`https://api.alternative.me/fng/?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch F&G index');
        const json = await response.json();
        return json.data;
    } catch (error) {
        console.error("Fear & Greed API Error:", error);
        return [];
    }
};

export const getCrossChainData = async (): Promise<CrossChainData[]> => {
  const spotPriceData = await safeFetch(`${API_BASE_SPOT}/ticker/price`);
  if (!spotPriceData) return [];

  const targetSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT', 'DOTUSDT', 'AVAXUSDT', 'MATICUSDT'];
  const result: CrossChainData[] = [];

  targetSymbols.forEach(symbol => {
    const binanceItem = spotPriceData.find((d: any) => d.symbol === symbol);
    if (!binanceItem) return;

    const binancePrice = parseFloat(binanceItem.price);
    
    // Simulate DEX prices (Mock data)
    const asterVariation = 1 + (Math.random() * 0.04 - 0.02); 
    const hypeVariation = 1 + (Math.random() * 0.06 - 0.03);

    const asterPrice = binancePrice * asterVariation;
    const hypePrice = binancePrice * hypeVariation;

    let maxSpread = 0;
    let bestRoute = 'None';
    let profit = 0;

    // Logic to determine best mock arbitrage path
    const paths = [
        { name: 'Binance → Aster', spread: ((asterPrice - binancePrice) / binancePrice) * 100, profit: asterPrice - binancePrice },
        { name: 'Aster → Binance', spread: ((binancePrice - asterPrice) / asterPrice) * 100, profit: binancePrice - asterPrice },
        { name: 'Binance → Hype', spread: ((hypePrice - binancePrice) / binancePrice) * 100, profit: hypePrice - binancePrice },
        { name: 'Hype → Binance', spread: ((binancePrice - hypePrice) / hypePrice) * 100, profit: binancePrice - hypePrice }
    ];

    paths.forEach(p => {
        if (p.spread > maxSpread) {
            maxSpread = p.spread;
            bestRoute = p.name;
            profit = p.profit;
        }
    });

    if (maxSpread > 0.1) {
        result.push({
            symbol,
            binancePrice,
            asterPrice,
            hypePrice,
            bestRoute,
            spreadPercent: maxSpread,
            profitPerUnit: profit
        });
    }
  });

  return result.sort((a, b) => b.spreadPercent - a.spreadPercent);
};