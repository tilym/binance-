
export type MarketType = 'SPOT' | 'FUTURES';

export type TimeInterval = '1m' | '5m' | '15m';

export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
}

export interface AlertLog {
  id: string;
  symbol: string;
  type: 'VOLUME_SPIKE' | 'PRICE_SURGE' | 'PRICE_DUMP';
  message: string;
  timestamp: number;
}

export type OrderBookItem = [string, string]; // [price, amount]

export interface OrderBookState {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
}

export interface Trade {
  id: number;
  price: number;
  qty: number;
  time: number;
  isBuyerMaker: boolean; // true = Sell (Maker is Buyer), false = Buy
}

export interface ArbitrageData {
  symbol: string;
  markPrice: number;
  spotPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  spread: number;
  apy: number;
}

export interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
}

export interface CrossChainData {
  symbol: string;
  binancePrice: number;
  asterPrice: number;
  hypePrice: number;
  bestRoute: string;
  spreadPercent: number;
  profitPerUnit: number;
}

export interface Translation {
  title: string;
  spot: string;
  futures: string;
  price: string;
  change: string;
  volume: string;
  alerts: string;
  alert_volume: string;
  alert_surge: string;
  alert_dump: string;
  loading: string;
  search_placeholder: string;
  time_1m: string;
  time_5m: string;
  time_15m: string;
  monitor_active: string;
  no_alerts: string;
  order_book: string;
  recent_trades: string;
  amount: string;
  total: string;
  time: string;
  sort_volume: string;
  sort_gainers: string;
  sort_losers: string;
  nav_market: string;
  nav_arbitrage: string;
  nav_feargreed: string;
  pos_rate: string;
  neg_rate: string;
  funding_rate: string;
  apr: string;
  spread: string;
  next_settle: string;
  refresh: string;
  fear_greed_title: string;
  fg_now: string;
  fg_history: string;
  next_update: string;
  // Cross Chain
  cex_dex_title: string;
  binance_price: string;
  aster_price: string;
  hype_price: string;
  route: string;
  profit: string;
}