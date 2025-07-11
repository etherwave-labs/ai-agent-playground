import type { Plugin, Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { placeOrder as executeHyperliquidOrder } from "../utils/hyperliquid.ts";

interface Trade {
  trade: "long" | "wait" | "short";
  allocation: number;     // en $
  stoploss: number;       // en $
  takeprofit: number;     // en $
  sentiment: number;      // en %
  leverage?: number;      // levier isolé (optionnel)
  id?: number;            // optionnel
  timestamp?: string;     // optionnel
  state?: string;         // optionnel
}

function extractLastTrade(runtime: IAgentRuntime, currentText?: string): Trade | null {
  const TRADE_REGEX =
    /sentiment:\s*(?<sentiment>\d+(?:\.\d+)?)%\s*,\s*allocation:\s*\$?(?<allocation>\d+(?:\.\d+)?)(?:%)?\s*,\s*stoploss:\s*\$(?<stoploss>\d+(?:\.\d+)?)\s*,\s*takeprofit:\s*\$(?<takeprofit>\d+(?:\.\d+)?)\s*(?:,\s*prixBTC:\s*\$(?<prixBTC>\d+(?:\.\d+)?))?(?:\s*,\s*leverage:\s*(?<leverage>\d+(?:\.\d+)?))?(?:\s*,\s*id:\s*(?<id>\d+))?/gi;

  let lastMatch: RegExpMatchArray | null = null;

  if (currentText) {
    const currentMatches = [...currentText.matchAll(TRADE_REGEX)];
    if (currentMatches.length) {
      lastMatch = currentMatches[currentMatches.length - 1];
    }
  }

  if (!lastMatch) {
    const stateCache = (runtime as any).stateCache;
    if (!stateCache) return null;

    const entries = Array.from(stateCache.entries()) as [string, any][];
    if (entries.length > 0) {
      const mostRecentEntry = entries[entries.length - 1][1];
      const entryText = mostRecentEntry?.text || "";
      const matches = [...entryText.matchAll(TRADE_REGEX)];
      if (matches.length) {
        lastMatch = matches[matches.length - 1];
      }
    }
  }

  if (!lastMatch || !lastMatch.groups) return null;

  const { allocation, stoploss, takeprofit, sentiment, leverage, id } = lastMatch.groups;

  // Déduction de la direction à partir du sentiment
  const s = Number(sentiment);
  let direction: "long" | "wait" | "short";
  if (s < 30) direction = "short";
  else if (s > 70) direction = "long";
  else direction = "wait";

  const result: Trade = {
    trade: direction,
    allocation: Number(allocation),
    stoploss: Number(stoploss),
    takeprofit: Number(takeprofit),
    sentiment: s,
  };

  if (id) {
    result.id = Number(id);
  }

  if (leverage) {
    result.leverage = Number(leverage);
  }

  return result;
}

const placeOrderAction: Action = {
  name: "PLACE_ORDER",
  description: "Exécute un trade détecté sur Hyperliquid sans toucher aux fichiers de mémoire.",
  similes: [
    "execute trade",
    "place order",
    "launch trade",
    "execute la position",
    "ouvre le trade",
    "éxécute le trade",
  ],
  validate: async () => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    const currentResponseText = state.messages?.[state.messages.length - 1]?.content?.text || "";
    const trade = extractLastTrade(runtime, currentResponseText);
    console.log("PLACE_ORDER: Trade détecté:", trade);

    if (!trade) {
      await callback({
        text: "Aucun trade détecté dans le contexte.",
        actions: ["PLACE_ORDER"],
        source: message.content.source,
      });
      return false;
    }

    if (trade.trade === "wait") {
      await callback({
        text: "En attente du prochain trade (état wait).",
        actions: ["PLACE_ORDER"],
        source: message.content.source,
      });
      return true;
    }

    try {
      await executeHyperliquidOrder({
        sizeUsd: trade.allocation,
        side: trade.trade,
        tp: trade.takeprofit.toString(),
        sl: trade.stoploss.toString(),
        isTestnet: true,
        leverage: trade.leverage,
      });

      await callback({
        text: "Trade exécuté avec succès sur Hyperliquid.",
        actions: ["PLACE_ORDER"],
        source: message.content.source,
      });
      return true;
    } catch (err: any) {
      console.error("PLACE_ORDER: Erreur lors de l'exécution du trade:", err);
      await callback({
        text: `Erreur lors de l'exécution du trade: ${err.message}`,
        actions: ["PLACE_ORDER"],
        source: message.content.source,
      });
      return false;
    }
  },
};

const plugin: Plugin = {
  name: "place-order",
  description: "Plugin qui exécute les trades sur Hyperliquid testnet.",
  priority: 160,
  actions: [placeOrderAction],
};

export default plugin;
