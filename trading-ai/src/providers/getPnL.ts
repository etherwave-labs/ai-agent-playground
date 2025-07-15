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

const pnlProvider: Provider = {
  name: "getPnLHyperLiquid",
  description: "Bilan complet des performances de trading sur Hyperliquid testnet.",
  position: 4,

  get: async () => {
    const userAddr = process.env.PUBKEY as Address | undefined;
    console.log("🔍 PUBKEY:", userAddr ? `${userAddr.slice(0, 6)}...${userAddr.slice(-4)}` : "NON DÉFINIE");

    if (!userAddr) {
      return {
        text: "L'adresse publique n'est pas définie (env PUBKEY)",
        values: { currentTradePnL: 0, dailyPnL: 0, weeklyPnL: 0, totalTrades: 0 },
        data: {},
      };
    }

    try {
      const [state, portfolio, fills] = await Promise.all([
        postInfo({ type: "clearinghouseState", user: userAddr }),
        postInfo({ type: "portfolio", user: userAddr }),
        postInfo({ type: "userFills", user: userAddr })
      ]);

      const stateData = state as ApiResponse;
      const portfolioData = portfolio as any;
      const fillsData = fills as any[] || [];

      const currentPnL = (stateData.assetPositions || [])
        .reduce((sum: number, pos: any) => sum + parseFloat(pos.position?.unrealizedPnl || "0"), 0);

      const periods = ["day", "week", "month", "allTime"];
      const pnlData = periods.map(p => {
        const data = portfolioData[p];
        if (!data?.pnlHistory || data.pnlHistory.length < 2) return 0;
        const latest = parseFloat(data.pnlHistory[data.pnlHistory.length - 1][1]);
        const oldest = parseFloat(data.pnlHistory[0][1]);
        return latest - oldest;
      });

      const totalTrades = fillsData.length || 0;
      const winningTrades = fillsData.filter((f: any) => parseFloat(f.closedPnl) > 0).length || 0;
      const accountValue = parseFloat(stateData.marginSummary?.accountValue || "0");
      const marginUsed = parseFloat(stateData.marginSummary?.totalMarginUsed || "0");

      let text = "📊 **BILAN DE PERFORMANCE TRADING**\n\n";
      
      const positions = (stateData.assetPositions || []).filter(p => parseFloat(p.position?.szi || "0") !== 0);
      text += "🔄 **POSITIONS ACTUELLES**\n";
      if (positions.length > 0) {
        text += `• ${positions.length} position(s) ouverte(s)\n`;
        text += `• PnL non réalisé: ${currentPnL.toFixed(2)} USDC\n`;
      } else {
        text += "• Aucune position ouverte\n";
      }

      text += `\n💰 **ÉTAT DU COMPTE**\n`;
      text += `• Capital: ${accountValue.toFixed(2)} USDC\n`;
      text += `• Marge utilisée: ${marginUsed.toFixed(2)} USDC\n`;
      text += `• Disponible: ${(accountValue - marginUsed).toFixed(2)} USDC\n`;

      if (totalTrades > 0) {
        text += `\n📈 **PERFORMANCE**\n`;
        text += `• Aujourd'hui: ${pnlData[0].toFixed(2)} USDC\n`;
        text += `• Cette semaine: ${pnlData[1].toFixed(2)} USDC\n`;
        text += `• Ce mois: ${pnlData[2].toFixed(2)} USDC\n`;
        text += `• All time: ${pnlData[3].toFixed(2)} USDC\n`;
        text += `\n📊 **TRADING**\n`;
        text += `• Trades: ${totalTrades}\n`;
        text += `• Gagnants: ${winningTrades} (${((winningTrades/totalTrades)*100).toFixed(1)}%)\n`;
      } else {
        text += `\n🎯 **PRÊT À COMMENCER**\n`;
        text += `• Capital disponible: ${accountValue.toFixed(2)} USDC\n`;
        text += `• Conseils: Analyser le marché, définir une stratégie, commencer petit\n`;
      }

      return {
        text,
        values: {
          currentTradePnL: currentPnL,
          dailyPnL: pnlData[0],
          weeklyPnL: pnlData[1],
          monthlyPnL: pnlData[2],
          allTimePnL: pnlData[3],
          totalTrades,
          winningTrades,
          accountValue,
          marginUsed,
        },
        data: { state: stateData, portfolio: portfolioData, fills: fillsData },
      };
    } catch (error) {
      console.error("❌ Erreur API Hyperliquid:", error);
      return {
        text: `Erreur: ${error.message}`,
        values: { currentTradePnL: 0, dailyPnL: 0, weeklyPnL: 0, totalTrades: 0 },
        data: { error: error.message },
      };
    }
  },
};

export const plugin: Plugin = {
  name: "getPnLHyperLiquid",
  description: "Bilan complet des performances de trading sur Hyperliquid testnet",
  providers: [pnlProvider],
  priority: 180,
};

export default plugin;
