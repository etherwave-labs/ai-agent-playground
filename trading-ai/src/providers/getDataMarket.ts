import { Provider, Plugin } from "@elizaos/core";

type IndicatorName = "atr" | "obv" | "macd" | "rsi";

interface IndicatorResponse<T = unknown> {
  status: string;
  value?: T;
  message?: string;
}

interface ATRData {
  value: number;
}

interface OBVData {
  value: number;
}

interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
}

interface RSIData {
  value: number;
}

function buildUrl(
  indicator: IndicatorName,
  symbol = "BTC/USDT",
  interval: "15m" | "1h" | "4h" | "1d" = "1h"
): string {
  const base = "https://api.taapi.io";
  const TAAPI_API_KEY = process.env.TAAPI_API_KEY;
  if (!TAAPI_API_KEY) {
    throw new Error("Variable d'environnement TAAPI_API_KEY manquante");
  }
  const params = new URLSearchParams({
    secret: TAAPI_API_KEY,
    exchange: "binance",
    symbol,
    interval,
  });
  return `${base}/${indicator}?${params}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchIndicatorWithRetry<T>(
  indicator: IndicatorName,
  symbol?: string,
  interval?: "15m" | "1h" | "4h" | "1d",
  retries = 3
): Promise<IndicatorResponse<T>> {
  const url = buildUrl(indicator, symbol, interval);
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        let delayMs = 0;
        
        if (retryAfter) {
          if (!isNaN(Number(retryAfter))) {
            delayMs = parseInt(retryAfter, 10) * 1000;
          } else {
            const retryDate = new Date(retryAfter);
            delayMs = retryDate.getTime() - new Date().getTime();
          }
        } else {
          delayMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        }
        
        if (attempt < retries) {
          console.warn(`🕒 Rate limit atteint pour ${indicator}. Retry dans ${delayMs/1000}s...`);
          await delay(delayMs);
          continue;
        } else {
          return { status: "error", message: `Rate limit dépassé pour ${indicator}` };
        }
      }
      
      if (!res.ok) {
        return { status: "error", message: `${res.status} ${res.statusText}` };
      }
      
      const data = (await res.json()) as T;
      return { status: "ok", value: data };
      
    } catch (err) {
      if (attempt === retries) {
        return { status: "error", message: (err as Error).message };
      }
      await delay(1000 * (attempt + 1));
    }
  }
  
  return { status: "error", message: "Échec après tous les retries" };
}

async function getMarketData(symbol = "BTC/USDT", interval: "15m" | "1h" | "4h" | "1d" = "1h") {
  console.log(`📊 Récupération des données de marché pour ${symbol} (${interval})`);
  
  const indicators: IndicatorName[] = ["atr", "obv", "macd", "rsi"];

  const data: Record<string, unknown> = {};
  const errors: string[] = [];
  
  for (const indicator of indicators) {
    const result = await fetchIndicatorWithRetry(indicator, symbol, interval);
    
    if (result.status === "ok") {
      data[indicator] = result.value;
      console.log(`✅ ${indicator.toUpperCase()} récupéré avec succès`);
    } else {
      errors.push(`${indicator}: ${result.message}`);
      console.warn(`❌ Échec pour ${indicator}: ${result.message}`);
    }
    
    if (indicator !== indicators[indicators.length - 1]) {
      await delay(500);
    }
  }

  return { data, errors, symbol, interval };
}

function analyzeMarketSignals(data: Record<string, unknown>) {
  const signals: string[] = [];
  let sentiment = "NEUTRE";
  
  const rsi = data.rsi as RSIData;
  if (rsi?.value) {
    if (rsi.value > 70) {
      signals.push("🔴 RSI en surachat (>70)");
      sentiment = "BAISSIER";
    } else if (rsi.value < 30) {
      signals.push("🟢 RSI en survente (<30)");
      sentiment = "HAUSSIER";
    } else {
      signals.push(`🟡 RSI neutre (${rsi.value.toFixed(2)})`);
    }
  }

  const macd = data.macd as MACDData;
  if (macd?.macd && macd?.signal) {
    if (macd.macd > macd.signal) {
      signals.push("🟢 MACD haussier");
      if (sentiment === "NEUTRE") sentiment = "HAUSSIER";
    } else {
      signals.push("🔴 MACD baissier");
      if (sentiment === "NEUTRE") sentiment = "BAISSIER";
    }
  }

  const atr = data.atr as ATRData;
  if (atr?.value) {
    if (atr.value > 1000) {
      signals.push("⚡ Forte volatilité détectée");
    } else {
      signals.push("😴 Volatilité faible");
    }
  }

  return { signals, sentiment };
}

const marketDataProvider: Provider = {
  name: "getDataMarket",
  description: "Fournit les données de marché et indicateurs techniques pour l'analyse de trading (RSI, MACD, ATR, OBV).",
  position: 3,

  get: async (runtime, message, state) => {
    const TAAPI_API_KEY = process.env.TAAPI_API_KEY;
    if (!TAAPI_API_KEY) {
      return {
        text: "❌ Clé API TAAPI manquante. Configurez TAAPI_API_KEY dans l'environnement.",
        values: { hasMarketData: false },
        data: { error: "Missing API key" },
      };
    }

    try {
      const { data, errors, symbol, interval } = await getMarketData();
      
      const { signals, sentiment } = analyzeMarketSignals(data);
      
      let summary = `📈 Données de marché ${symbol} (${interval}):\n💡 Sentiment: ${sentiment}`;
      
      if (signals.length > 0) {
        summary += `\n${signals.join('\n')}`;
      }
      
      if (errors.length > 0) {
        summary += `\n⚠️ Erreurs: ${errors.length} indicateur(s) indisponible(s)`;
      }

      console.log("📊 Données de marché récupérées:", { 
        symbol, 
        interval, 
        sentiment, 
        indicatorsCount: Object.keys(data).length,
        errorsCount: errors.length
      });

      return {
        text: summary,
        values: {
          hasMarketData: Object.keys(data).length > 0,
          symbol,
          interval,
          sentiment,
          rsi: (data.rsi as RSIData)?.value,
          atr: (data.atr as ATRData)?.value,
          macd: data.macd,
          obv: (data.obv as OBVData)?.value,
          indicatorsAvailable: Object.keys(data).length,
          totalIndicators: 4,
        },
        data: {
          marketData: data,
          analysis: { signals, sentiment },
          metadata: { symbol, interval, timestamp: new Date().toISOString() },
          errors,
        },
      };
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des données de marché:", error);
      return {
        text: `❌ Erreur lors de la récupération des données de marché: ${error.message}`,
        values: { hasMarketData: false },
        data: { error: error.message },
      };
    }
  },
};

export const plugin: Plugin = {
  name: "getDataMarket",
  description: "Fournit les données de marché et indicateurs techniques pour informer les décisions de trading",
  providers: [marketDataProvider],
  priority: 170,
};

export default plugin;

