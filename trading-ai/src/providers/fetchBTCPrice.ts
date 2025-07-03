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

const plugin: Plugin = {
    name: 'fetch-btc-price-provider',
    description: 'Récupère le prix du Bitcoin',
    providers: [fetchBTCPriceProvider],
    priority: 150,
};

export default plugin;