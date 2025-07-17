import { Provider, Plugin } from "@elizaos/core";

const API_URL = "https://api.hyperliquid-testnet.xyz/info";

async function postInfo<T>(payload: unknown): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Hyperliquid ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

type Address = `0x${string}`;

interface UserFill {
  closedPnl: string;
  coin: string;
  crossed: boolean;
  dir: string;
  hash: string;
  oid: number;
  px: string;
  side: string;
  startPosition: string;
  sz: string;
  time: number;
  fee: string;
  feeToken: string;
  tid: number;
}

interface PeriodStats {
  pnl: number;
  trades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalFees: number;
  volume: number;
  averageTradeSize: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
}

interface ApiResponse {
  assetPositions?: Array<{
    position: {
      szi: string;
      unrealizedPnl: string;
    };
  }>;
  marginSummary?: {
    accountValue: string;
    totalMarginUsed: string;
  };
  [key: string]: any;
}

function calculatePeriodStats(trades: UserFill[]): PeriodStats {
  if (trades.length === 0) {
    return {
      pnl: 0,
      trades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalFees: 0,
      volume: 0,
      averageTradeSize: 0,
      largestWin: 0,
      largestLoss: 0,
      profitFactor: 0,
    };
  }

  const pnl = trades.reduce((sum, trade) => sum + parseFloat(trade.closedPnl || "0"), 0);
  const totalFees = trades.reduce((sum, trade) => sum + parseFloat(trade.fee || "0"), 0);
  const volume = trades.reduce((sum, trade) => sum + (parseFloat(trade.sz || "0") * parseFloat(trade.px || "0")), 0);
  
  const winningTrades = trades.filter(trade => parseFloat(trade.closedPnl || "0") > 0);
  const losingTrades = trades.filter(trade => parseFloat(trade.closedPnl || "0") < 0);
  
  const winRate = (winningTrades.length / trades.length) * 100;
  const averageTradeSize = volume / trades.length;
  
  const largestWin = Math.max(...trades.map(trade => parseFloat(trade.closedPnl || "0")));
  const largestLoss = Math.min(...trades.map(trade => parseFloat(trade.closedPnl || "0")));
  
  const totalWins = winningTrades.reduce((sum, trade) => sum + parseFloat(trade.closedPnl || "0"), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + parseFloat(trade.closedPnl || "0"), 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

  return {
    pnl,
    trades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    totalFees,
    volume,
    averageTradeSize,
    largestWin,
    largestLoss,
    profitFactor,
  };
}

const pnlProvider: Provider = {
  name: "getPnLHyperLiquid",
  description: "Bilan complet des performances de trading sur Hyperliquid testnet avec analyse détaillée par périodes.",
  position: 4,

  get: async () => {
    const userAddr = process.env.PUBKEY as Address | undefined;
    console.log("🔍 PUBKEY:", userAddr ? `${userAddr.slice(0, 6)}...${userAddr.slice(-4)}` : "NON DÉFINIE");

    if (!userAddr) {
      return {
        text: "L'adresse publique n'est pas définie (env PUBKEY)",
        values: { currentTradePnL: 0, dailyPnL: 0, weeklyPnL: 0, totalTrades: 0, totalPnL: 0 },
        data: {},
      };
    }

    try {
      const [state, fills] = await Promise.all([
        postInfo({ type: "clearinghouseState", user: userAddr }),
        postInfo({ type: "userFills", user: userAddr })
      ]);

      const stateData = state as ApiResponse;
      const fillsData = fills as UserFill[] || [];

      console.log(`📊 Récupération de ${fillsData.length} trades pour l'analyse par périodes`);

      const sortedTrades = fillsData.sort((a, b) => b.time - a.time);

      const now = Date.now();
      const periods = {
        "1j": now - (24 * 60 * 60 * 1000),
        "1sem": now - (7 * 24 * 60 * 60 * 1000),
        "1mois": now - (30 * 24 * 60 * 60 * 1000),
        "alltime": 0
      };

      const periodStats = {
        "1j": calculatePeriodStats(sortedTrades.filter(trade => trade.time >= periods["1j"])),
        "1sem": calculatePeriodStats(sortedTrades.filter(trade => trade.time >= periods["1sem"])),
        "1mois": calculatePeriodStats(sortedTrades.filter(trade => trade.time >= periods["1mois"])),
        "alltime": calculatePeriodStats(sortedTrades)
      };

      const currentPnL = (stateData.assetPositions || [])
        .reduce((sum: number, pos: any) => sum + parseFloat(pos.position?.unrealizedPnl || "0"), 0);

      const accountValue = parseFloat(stateData.marginSummary?.accountValue || "0");
      const marginUsed = parseFloat(stateData.marginSummary?.totalMarginUsed || "0");

      const coinStats = new Map<string, { pnl: number, trades: number, volume: number }>();
      sortedTrades.forEach(trade => {
        const coin = trade.coin;
        const pnl = parseFloat(trade.closedPnl || "0");
        const volume = parseFloat(trade.sz || "0") * parseFloat(trade.px || "0");
        
        if (!coinStats.has(coin)) {
          coinStats.set(coin, { pnl: 0, trades: 0, volume: 0 });
        }
        const stats = coinStats.get(coin)!;
        stats.pnl += pnl;
        stats.trades += 1;
        stats.volume += volume;
      });

      const topCoins = Array.from(coinStats.entries())
        .sort((a, b) => b[1].pnl - a[1].pnl)
        .slice(0, 3);

      let text = "📊 **BILAN DE PERFORMANCE TRADING PAR PÉRIODES**\n\n";
      
      text += `💰 **RÉSUMÉ GÉNÉRAL**\n`;
      text += `• PnL total réalisé: ${periodStats.alltime.pnl.toFixed(2)} USDC\n`;
      text += `• PnL non réalisé: ${currentPnL.toFixed(2)} USDC\n`;
      text += `• PnL net total: ${(periodStats.alltime.pnl + currentPnL).toFixed(2)} USDC\n`;
      text += `• Capital actuel: ${accountValue.toFixed(2)} USDC\n`;
      text += `• Marge utilisée: ${marginUsed.toFixed(2)} USDC\n`;

      const periodLabels = {
        "1j": "📅 **DERNIÈRES 24H**",
        "1sem": "📅 **DERNIÈRE SEMAINE**", 
        "1mois": "📅 **DERNIER MOIS**",
        "alltime": "📅 **DEPUIS LE DÉBUT**"
      };

      Object.entries(periodStats).forEach(([period, stats]) => {
        text += `\n${periodLabels[period as keyof typeof periodLabels]}\n`;
        text += `• PnL: ${stats.pnl.toFixed(2)} USDC\n`;
        text += `• Trades: ${stats.trades}\n`;
        text += `• Win Rate: ${stats.winRate.toFixed(1)}% (${stats.winningTrades}W/${stats.losingTrades}L)\n`;
        text += `• Volume: ${stats.volume.toFixed(0)} USDC\n`;
        text += `• Frais: ${stats.totalFees.toFixed(2)} USDC\n`;
        
        if (stats.trades > 0) {
          text += `• Taille moy.: ${stats.averageTradeSize.toFixed(0)} USDC\n`;
          text += `• Plus gros gain: ${stats.largestWin.toFixed(2)} USDC\n`;
          text += `• Plus grosse perte: ${stats.largestLoss.toFixed(2)} USDC\n`;
          text += `• Profit Factor: ${stats.profitFactor.toFixed(2)}\n`;
        }
      });

      const allTimeStats = periodStats.alltime;
      if (allTimeStats.trades > 0) {
        text += `\n🔍 **ANALYSE GÉNÉRALE**\n`;
        if (allTimeStats.winRate < 50) {
          text += `• Taux de réussite faible (${allTimeStats.winRate.toFixed(1)}%) - Améliorer la sélection des trades\n`;
        } else if (allTimeStats.winRate > 60) {
          text += `• Excellent taux de réussite (${allTimeStats.winRate.toFixed(1)}%) - Maintenir la stratégie\n`;
        }
        
        if (allTimeStats.profitFactor > 1.5) {
          text += `• Excellent profit factor (${allTimeStats.profitFactor.toFixed(2)}) - Stratégie profitable\n`;
        } else if (allTimeStats.profitFactor < 1) {
          text += `• Profit factor faible (${allTimeStats.profitFactor.toFixed(2)}) - Revoir le risk management\n`;
        }
      }

      console.log("✅ Analyse par périodes terminée:", {
        "1j": periodStats["1j"].pnl.toFixed(2),
        "1sem": periodStats["1sem"].pnl.toFixed(2),
        "1mois": periodStats["1mois"].pnl.toFixed(2),
        "alltime": periodStats.alltime.pnl.toFixed(2)
      });

      return {
        text,
        values: {
          currentTradePnL: currentPnL,
          dailyPnL: periodStats["1j"].pnl,
          weeklyPnL: periodStats["1sem"].pnl,
          monthlyPnL: periodStats["1mois"].pnl,
          totalPnL: periodStats.alltime.pnl,
          totalTrades: periodStats.alltime.trades,
          winningTrades: periodStats.alltime.winningTrades,
          losingTrades: periodStats.alltime.losingTrades,
          winRate: periodStats.alltime.winRate,
          accountValue,
          marginUsed,
          totalFees: periodStats.alltime.totalFees,
          topCoins: topCoins.map(([coin, stats]) => ({ coin, ...stats })),
          periodStats,
        },
        data: { 
          state: stateData, 
          fills: sortedTrades,
          coinStats: Array.from(coinStats.entries()).map(([coin, stats]) => ({ coin, ...stats })),
          periodStats,
          summary: {
            totalPnL: periodStats.alltime.pnl,
            totalTrades: periodStats.alltime.trades,
            winRate: periodStats.alltime.winRate,
            totalFees: periodStats.alltime.totalFees,
            netPnL: periodStats.alltime.pnl + currentPnL
          }
        },
      };
    } catch (error) {
      console.error("❌ Erreur lors de l'analyse par périodes:", error);
      return {
        text: `❌ Erreur lors de l'analyse par périodes: ${error.message}`,
        values: { currentTradePnL: 0, dailyPnL: 0, weeklyPnL: 0, totalTrades: 0, totalPnL: 0 },
        data: { error: error.message },
      };
    }
  },
};

export const plugin: Plugin = {
  name: "getPnLHyperLiquid",
  description: "Analyse complète des performances de trading par périodes avec statistiques détaillées",
  providers: [pnlProvider],
  priority: 180,
};

export default plugin;
