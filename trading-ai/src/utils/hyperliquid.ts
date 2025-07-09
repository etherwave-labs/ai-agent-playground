import { Hyperliquid } from "hyperliquid";

export interface TradeHyperliquid {
  sizeUsd:   number;               // exposition en USD
  side:      "long" | "short";
  tp:        string;               // prix TP
  sl:        string;               // prix SL
  isTestnet: boolean;              // testnet = true
}

const roundToTickSize = (price: number, tickSize: number): number => {
  return Math.round(price / tickSize) * tickSize;
};

const getBtcUsd = async (): Promise<number> => {
  const url =
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Coingecko HTTP ${res.status}`);
  return (await res.json() as { bitcoin: { usd: number } }).bitcoin.usd;
};

export const placeOrder = async (p: TradeHyperliquid) => {
  const { sizeUsd, side, tp, sl, isTestnet } = p;

  const pk = process.env.HYPERLIQUID_PRIVKEY;
  if (!pk) throw new Error("HYPERLIQUID_PRIVKEY manquante");

  const btcUsd = await getBtcUsd();
  let sizeBtc = (sizeUsd / btcUsd).toFixed(5);
  const isBuy = side === "long";

  const minSizeBtc = 0.0001;
  if (parseFloat(sizeBtc) < minSizeBtc) {
      console.log(`⚠️ Taille demandée ${sizeBtc} BTC trop petite, augmentation au minimum de ${minSizeBtc} BTC`);
      sizeBtc = minSizeBtc.toFixed(5);
  }

  const slippage = 0.05;
  const TICK_SIZE = 1;
  const limitPriceRaw = isBuy ? btcUsd * (1 + slippage) : btcUsd * (1 - slippage);
  const limitPrice = roundToTickSize(limitPriceRaw, TICK_SIZE);

  try {
    const sdk = new Hyperliquid({
      privateKey: pk,
      testnet: isTestnet
    });

    console.log('SDK Hyperliquid initialisé avec succès');

    const orderResult = await sdk.exchange.placeOrder({
      coin: 'BTC-PERP',
      is_buy: isBuy,
      sz: sizeBtc,
      limit_px: limitPrice.toFixed(2),
      order_type: { limit: { tif: 'Ioc' } },
      reduce_only: false
    });

    console.log('Réponse complète de l\'ordre:', JSON.stringify(orderResult, null, 2));
    
    if (orderResult?.response?.data?.statuses) {
      console.log('Statuts des ordres:', orderResult.response.data.statuses);
      
      for (const status of orderResult.response.data.statuses) {
        if (status.error) {
          console.error('❌ Erreur ordre:', status.error);
        } else if (status.resting) {
          console.log('✅ Ordre placé:', status.resting);
        } else if (status.filled) {
          console.log('✅ Ordre exécuté:', status.filled);
        } else {
          console.log('❓ Statut inconnu:', status);
        }
      }
    }
    
    if (tp || sl) {
      console.log('TODO: Implémenter les ordres TP/SL séparément');
    }
    
    return orderResult;
    
  } catch (error) {
    console.error('Erreur lors du placement de l\'ordre:', error);
    throw error;
  }
};
