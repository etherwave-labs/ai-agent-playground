import { Provider, Plugin } from '@elizaos/core';
import { URL } from 'url';

interface CoinMarketData {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    total_volume: number;
    high_24h: number;
    low_24h: number;
    price_change_24h: number;
    price_change_percentage_24h: number;
    circulating_supply: number;
    total_supply: number | null;
    ath: number;
    ath_change_percentage: number;
    ath_date: string;
    last_updated: string;
}

interface MarketChartData {
    prices: [number, number][];
    market_caps: [number, number][];
    total_volumes: [number, number][];
}

interface HistoricalDataPoint {
    timestamp: number;
    price: number;
    date: string;
}

interface HistoricalSummary {
    prices: HistoricalDataPoint[];
    highest: { price: number; date: string };
    lowest: { price: number; date: string };
    average: number;
    priceChange: number;
    priceChangePercent: number;
    startPrice: number;
    endPrice: number;
    volatility: number;
}

async function fetchBTCPrice(): Promise<number> {
    const url = new URL('https://api.coingecko.com/api/v3/simple/price');
    url.searchParams.set('ids', 'bitcoin');
    url.searchParams.set('vs_currencies', 'usd');
  
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || '',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }
  
    const json = await response.json() as Record<string, { usd: number }>;
    return json.bitcoin.usd;
  }

async function fetchBTCHistoryDays(days: number = 7): Promise<MarketChartData> {
    const url = new URL('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart');
    url.searchParams.set('vs_currency', 'usd');
    url.searchParams.set('days', days.toString());
    
    const response = await fetch(url.toString(), {
        headers: {
            'Accept': 'application/json',
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || '',
        },
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }
    
    return await response.json() as MarketChartData;
}

async function fetchBTCHistoryRange(fromTimestamp: number, toTimestamp: number): Promise<MarketChartData> {
    const url = new URL('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range');
    url.searchParams.set('vs_currency', 'usd');
    url.searchParams.set('from', fromTimestamp.toString());
    url.searchParams.set('to', toTimestamp.toString());
    
    const response = await fetch(url.toString(), {
        headers: {
            'Accept': 'application/json',
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || '',
        },
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} – ${response.statusText}`);
    }
    
    return await response.json() as MarketChartData;
}

function analyzeHistoricalData(data: MarketChartData): HistoricalSummary {
    const prices = data.prices.map(([timestamp, price]) => ({
        timestamp,
        price,
        date: new Date(timestamp).toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }));
    
    const priceValues = prices.map(p => p.price);
    const highest = prices.reduce((max, current) => current.price > max.price ? current : max);
    const lowest = prices.reduce((min, current) => current.price < min.price ? current : min);
    const average = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
    
    const startPrice = priceValues[0];
    const endPrice = priceValues[priceValues.length - 1];
    const priceChange = endPrice - startPrice;
    const priceChangePercent = (priceChange / startPrice) * 100;
    
    const variance = priceValues.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / priceValues.length;
    const volatility = Math.sqrt(variance);
    
    return {
        prices,
        highest,
        lowest,
        average,
        priceChange,
        priceChangePercent,
        startPrice,
        endPrice,
        volatility
    };
}

const fetchBTCPriceProvider: Provider = {
    name: 'btcPrice',
    description: 'Récupère le prix du Bitcoin',
    position: 9,
    get: async () => {
        try {
            console.log("Provider fetchBTCPrice: Récupération du prix...");
            const price = await fetchBTCPrice();
            console.log(`Provider fetchBTCPrice: Prix récupéré: $${price}`);
            return {
                text: `Le prix du Bitcoin est actuellement de $${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
                values: { 
                    currentPrice: price,
                    currency: 'USD',
                    timestamp: new Date().toISOString()
                },
                data: { 
                    btc: { 
                        price: price, 
                        currency: 'USD',
                        lastUpdated: new Date().toISOString()
                    } 
                }
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du prix du Bitcoin:', error);
            return {
                text: 'Une erreur est survenue lors de la récupération du prix du Bitcoin.',
                values: { 
                    currentPrice: null,
                    error: error.message
                },
                data: { error: error.message }
            }
        }
    }
}

const fetchBTCHistory7DaysProvider: Provider = {
    name: 'btcHistory7Days',
    description: 'Récupère l\'historique des prix du Bitcoin sur les 7 derniers jours',
    position: 10,
    get: async () => {
        try {
            console.log("Provider fetchBTCHistory7Days: Récupération de l'historique 7 jours...");
            const data = await fetchBTCHistoryDays(7);
            const analysis = analyzeHistoricalData(data);
            
            const changeSymbol = analysis.priceChange >= 0 ? '📈' : '📉';
            const changeColor = analysis.priceChange >= 0 ? 'hausse' : 'baisse';
            
            console.log(`Provider fetchBTCHistory7Days: ${analysis.prices.length} points de données récupérés`);
            
            return {
                text: `📊 **HISTORIQUE BITCOIN - 7 DERNIERS JOURS**\n\n` +
                      `${changeSymbol} **Évolution**: ${changeColor} de $${Math.abs(analysis.priceChange).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${analysis.priceChangePercent.toFixed(2)}%)\n\n` +
                      `💰 **Prix de départ**: $${analysis.startPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                      `💰 **Prix actuel**: $${analysis.endPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
                      `📈 **Prix le plus haut**: $${analysis.highest.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${analysis.highest.date})\n` +
                      `📉 **Prix le plus bas**: $${analysis.lowest.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${analysis.lowest.date})\n\n` +
                      `🎯 **Prix moyen**: $${analysis.average.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                      `📊 **Volatilité**: $${analysis.volatility.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
                      `📋 **Points de données**: ${analysis.prices.length} (granularité horaire)`,
                values: {
                    period: '7 jours',
                    dataPoints: analysis.prices.length,
                    startPrice: analysis.startPrice,
                    endPrice: analysis.endPrice,
                    priceChange: analysis.priceChange,
                    priceChangePercent: analysis.priceChangePercent,
                    highest: analysis.highest,
                    lowest: analysis.lowest,
                    average: analysis.average,
                    volatility: analysis.volatility,
                    currency: 'USD'
                },
                data: {
                    rawData: data,
                    analysis: analysis,
                    period: '7 jours',
                    timestamp: new Date().toISOString()
                }
            }
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique 7 jours:', error);
            return {
                text: 'Une erreur est survenue lors de la récupération de l\'historique des prix du Bitcoin sur 7 jours.',
                values: { 
                    error: error.message,
                    period: '7 jours'
                },
                data: { error: error.message }
            }
        }
    }
}

const fetchBTCHistoryRangeProvider: Provider = {
    name: 'btcHistoryRange',
    description: 'Récupère l\'historique des prix du Bitcoin sur une période personnalisée',
    position: 11,
    get: async (runtime, message, state) => {
        try {
            const now = Math.floor(Date.now() / 1000);
            const defaultStart = now - (7 * 24 * 60 * 60);
            
            const fromTimestamp = state?.fromTimestamp || defaultStart;
            const toTimestamp = state?.toTimestamp || now;
            
            console.log(`Provider fetchBTCHistoryRange: Récupération de l'historique du ${new Date(fromTimestamp * 1000).toLocaleDateString('fr-FR')} au ${new Date(toTimestamp * 1000).toLocaleDateString('fr-FR')}`);
            
            const data = await fetchBTCHistoryRange(fromTimestamp, toTimestamp);
            const analysis = analyzeHistoricalData(data);
            
            const changeSymbol = analysis.priceChange >= 0 ? '📈' : '📉';
            const changeColor = analysis.priceChange >= 0 ? 'hausse' : 'baisse';
            
            const periodStart = new Date(fromTimestamp * 1000).toLocaleDateString('fr-FR');
            const periodEnd = new Date(toTimestamp * 1000).toLocaleDateString('fr-FR');
            
            console.log(`Provider fetchBTCHistoryRange: ${analysis.prices.length} points de données récupérés`);
            
            return {
                text: `📊 **HISTORIQUE BITCOIN - PÉRIODE PERSONNALISÉE**\n\n` +
                      `📅 **Période**: du ${periodStart} au ${periodEnd}\n\n` +
                      `${changeSymbol} **Évolution**: ${changeColor} de $${Math.abs(analysis.priceChange).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${analysis.priceChangePercent.toFixed(2)}%)\n\n` +
                      `💰 **Prix de départ**: $${analysis.startPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                      `💰 **Prix de fin**: $${analysis.endPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
                      `📈 **Prix le plus haut**: $${analysis.highest.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${analysis.highest.date})\n` +
                      `📉 **Prix le plus bas**: $${analysis.lowest.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${analysis.lowest.date})\n\n` +
                      `🎯 **Prix moyen**: $${analysis.average.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                      `📊 **Volatilité**: $${analysis.volatility.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
                      `📋 **Points de données**: ${analysis.prices.length}`,
                values: {
                    period: `${periodStart} - ${periodEnd}`,
                    dataPoints: analysis.prices.length,
                    startPrice: analysis.startPrice,
                    endPrice: analysis.endPrice,
                    priceChange: analysis.priceChange,
                    priceChangePercent: analysis.priceChangePercent,
                    highest: analysis.highest,
                    lowest: analysis.lowest,
                    average: analysis.average,
                    volatility: analysis.volatility,
                    currency: 'USD',
                    fromTimestamp,
                    toTimestamp
                },
                data: {
                    rawData: data,
                    analysis: analysis,
                    period: { start: periodStart, end: periodEnd },
                    timestamp: new Date().toISOString()
                }
            }
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique sur période personnalisée:', error);
            return {
                text: 'Une erreur est survenue lors de la récupération de l\'historique des prix du Bitcoin sur la période spécifiée.',
                values: { 
                    error: error.message,
                    period: 'période personnalisée'
                },
                data: { error: error.message }
            }
        }
    }
}

const plugin: Plugin = {
    name: 'fetch-btc-price-provider',
    description: 'Récupère le prix du Bitcoin actuel et son historique',
    providers: [fetchBTCPriceProvider, fetchBTCHistory7DaysProvider, fetchBTCHistoryRangeProvider],
    priority: 150,
};

export default plugin;