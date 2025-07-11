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

interface OpenOrder {
  oid: number;
  coin: string;
  px: string;
  sz: string;
  side: boolean; // true = buy (long)
}

const openOrdersProvider: Provider = {
  name: "getOpenOrdersHyperLiquid",
  description: "Récupère la liste d'ordres ouverts (spot & perp) sur Hyperliquid testnet et les expose au contexte de l'agent.",
  position: 3,

  get: async () => {
    const userAddr = process.env.PUBKEY as Address | undefined;
    console.log("🔍 PUBKEY:", userAddr ? `${userAddr.slice(0, 6)}...${userAddr.slice(-4)}` : "NON DÉFINIE");

    if (!userAddr) {
      return {
        text: "L'adresse publique n'est pas définie (env PUBKEY)",
        values: { openOrders: 0 },
        data: {},
      };
    }

    try {
      console.log("📡 Requête openOrders pour", userAddr);
      const orders = await postInfo<OpenOrder[]>({
        type: "openOrders",
        user: userAddr,
      });

      const count = Array.isArray(orders) ? orders.length : 0;
      console.log(`📊 ${count} ordre(s) ouvert(s)`);

      const textSummary = count
        ? `📑 ${count} ordre(s) ouverts actuellement sur Hyperliquid.`
        : "📑 Aucun ordre ouvert sur Hyperliquid.";

      return {
        text: textSummary,
        values: { openOrders: count },
        data: { orders },
      };
    } catch (error) {
      console.error("❌ Erreur API Hyperliquid openOrders:", error);
      return {
        text: `Erreur lors de la récupération des ordres ouverts: ${error.message}`,
        values: { openOrders: 0 },
        data: { error: error.message },
      };
    }
  },
};

export const plugin: Plugin = {
  name: "getOpenOrdersHyperLiquid",
  description: "Expose la liste des ordres ouverts Hyperliquid testnet pour l'agent",
  providers: [openOrdersProvider],
  priority: 190,
};

export default plugin; 