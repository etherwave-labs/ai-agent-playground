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

interface AssetPosition {
  position: {
    coin: string;
    unrealizedPnl: string;
    szi: string;
  };
}

interface ClearinghouseState {
  assetPositions: AssetPosition[];
}

const pnlProvider: Provider = {
  name: "getPnLHyperLiquid",
  description: "Récupère les données de PnL (profit and loss) et l'historique de valeur de compte sur Hyperliquid testnet.",
  position: 4,

  get: async () => {
    const userAddr = process.env.PUBKEY as Address | undefined;
    console.log("🔍 PUBKEY:", userAddr ? `${userAddr.slice(0, 6)}...${userAddr.slice(-4)}` : "NON DÉFINIE");

    if (!userAddr) {
      return {
        text: "L'adresse publique n'est pas définie (env PUBKEY)",
        values: { totalPnL: 0, currentValue: 0 },
        data: {},
      };
    }

    try {
      console.log("📡 Requête clearinghouseState pour PnL non réalisé", userAddr);
      const state = await postInfo<ClearinghouseState>({
        type: "clearinghouseState",
        user: userAddr,
      });

      if (!state.assetPositions || state.assetPositions.length === 0) {
        return {
          text: "📊 Aucune position ouverte.",
          values: { currentTradePnL: 0 },
          data: { positions: [] },
        };
      }

      let totalUnrealizedPnL = 0;
      const positionsSummary = state.assetPositions
        .filter(ap => parseFloat(ap.position.szi) !== 0)
        .map(ap => {
          const pnl = parseFloat(ap.position.unrealizedPnl);
          totalUnrealizedPnL += pnl;
          return `${ap.position.coin}: PnL ${pnl.toFixed(2)} USDC`;
        });

      console.log(`📊 PnL non réalisé total: ${totalUnrealizedPnL}`);

      const pnlSummary = positionsSummary.length
        ? `💰 PnL trade en cours: ${totalUnrealizedPnL.toFixed(2)} USDC (${positionsSummary.join(' | ')})`
        : "💰 Aucun PnL trade en cours.";

      return {
        text: pnlSummary,
        values: { 
          currentTradePnL: totalUnrealizedPnL,
        },
        data: { positions: state.assetPositions },
      };
    } catch (error) {
      console.error("❌ Erreur API Hyperliquid PnL:", error);
      return {
        text: `Erreur lors de la récupération du PnL: ${error.message}`,
        values: { totalPnL: 0, currentValue: 0 },
        data: { error: error.message },
      };
    }
  },
};

export const plugin: Plugin = {
  name: "getPnLHyperLiquid",
  description: "Expose les données de PnL et l'historique de performance Hyperliquid testnet pour l'agent",
  providers: [pnlProvider],
  priority: 180,
};

export default plugin;
