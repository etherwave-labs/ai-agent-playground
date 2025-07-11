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

interface PerpPosition {
  position: {
    coin: string;
    szi: string;
    entryPx: string;
  };
  type: string;
}

interface ClearinghouseState {
  marginSummary: { accountValue: string };
  withdrawable: string;
  assetPositions: PerpPosition[];
}

const hyperliquidBalanceProvider: Provider = {
  name: "getBalanceHyperLiquid",
  description:
    "Expose uniquement les positions perp BTC ouvertes sur Hyperliquid testnet pour guider les décisions de trading",
  position: 2,

  get: async () => {
    const userAddr = process.env.PUBKEY as Address | undefined;
    console.log("🔍 PUBKEY:", userAddr ? `${userAddr.slice(0, 6)}...${userAddr.slice(-4)}` : "NON DÉFINIE");
    
    if (!userAddr) {
      return {
        text: "L'adresse publique n'est pas définie (env PUBKEY)",
        values: { accountValue: 0, withdrawable: 0, btcPerp: 0 },
        data: {},
      };
    }

    try {
      console.log("📡 Appel API Hyperliquid pour:", userAddr);
      
      let spotClearinghouse = null;
      try {
        spotClearinghouse = await postInfo<any>({
          type: "spotClearinghouseState", 
          user: userAddr,
        });
        console.log("📊 Spot Clearinghouse:", JSON.stringify(spotClearinghouse, null, 2));
      } catch (spotError) {
        console.log("⚠️ Pas de spotClearinghouseState, utilisation de clearinghouseState uniquement");
      }
      
      const perpState = await postInfo<ClearinghouseState>({
        type: "clearinghouseState",
        user: userAddr,
      });
      
      console.log("📊 Réponse Perp API:", JSON.stringify(perpState, null, 2));

      const accountValue = Number(perpState.marginSummary?.accountValue || 0);
      const withdrawable = Number(perpState.withdrawable || 0);

      const btcPositions = (perpState.assetPositions ?? []).filter(
        (p: any) => p.position.coin.toUpperCase() === "BTC"
      );

      const btcPerp = btcPositions.reduce(
        (acc: number, pos: any) => acc + parseFloat(pos.position.szi),
        0
      );
      
      let spotBalance = 0;
      if (spotClearinghouse && spotClearinghouse.balances) {
        const usdcSpot = spotClearinghouse.balances.find((b: any) => b.coin === "USDC");
        spotBalance = usdcSpot ? Number(usdcSpot.total || 0) : 0;
      }
      
      console.log("✅ Positions BTC récupérées:", { btcPositions: btcPositions.length, btcPerp });

      const btcDesc = btcPositions.length
        ? btcPositions
            .map((p: any, idx: number) => {
              const sz = parseFloat(p.position.szi);
              const side = sz > 0 ? "long" : "short";
              const lev = p.position.leverage?.value ?? "?";
              const mode = p.position.leverage?.type ?? "";
              return `#${idx + 1} ${side} ${Math.abs(sz)} BTC @ ${p.position.entryPx} (levier ${lev}x ${mode})`;
            })
            .join(" | ")
        : "Aucune position perp BTC ouverte";

      return {
        text: `📈 Positions perp BTC: ${btcDesc}`,
        values: { btcPerp, btcPositions: btcPositions.length },
        data: { positions: btcPositions },
      };
    } catch (error) {
      console.error("❌ Erreur API Hyperliquid:", error);
      return {
        text: `Erreur lors de la récupération de la balance Hyperliquid: ${error.message}`,
        values: { btcPerp: 0, btcPositions: 0 },
        data: { error: error.message },
      };
    }
  },
};

export const plugin: Plugin = {
  name: "getBalanceHyperLiquid",
  description: "Expose la valeur de compte USDC + position perp BTC Hyperliquid testnet pour les décisions de trading",
  providers: [hyperliquidBalanceProvider],
  priority: 200,
};
export default plugin;