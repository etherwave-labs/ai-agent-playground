import type { Plugin, Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import fs from 'fs';

interface Trade {
  trade: 'long' | 'short';
  allocation: number;     // en %
  stoploss: number;       // en $
  takeprofit: number;     // en $
  sentiment: number;      // en %
}

function extractLastTrade(runtime: IAgentRuntime): Trade | null {
  const TRADE_REGEX =
    /trade:\s*(?<trade>long|short)\s*,\s*allocation:\s*(?<allocation>\d+(?:\.\d+)?)%\s*,\s*stoploss:\s*\$(?<stoploss>\d+(?:\.\d+)?)\s*,\s*takeprofit:\s*\$(?<takeprofit>\d+(?:\.\d+)?)\s*,\s*sentiment:\s*(?<sentiment>\d+(?:\.\d+)?)%/gi;

  let lastMatch: RegExpMatchArray | null = null;

  const stateCache = (runtime as any).stateCache;
  if (!stateCache) return null;

  for (const [, entry] of stateCache) {
    const matches = [...(entry.text || '').matchAll(TRADE_REGEX)];
    if (matches.length) {
      lastMatch = matches[matches.length - 1];
    }
  }

  if (!lastMatch || !lastMatch.groups) return null;

  const { trade, allocation, stoploss, takeprofit, sentiment } = lastMatch.groups;

  return {
    trade: trade as 'long' | 'short',
    allocation: Number(allocation),
    stoploss: Number(stoploss),
    takeprofit: Number(takeprofit),
    sentiment: Number(sentiment),
  };
}

const rag: Action = {
    name: "RAG",
    similes: [
      "RAG",
      "save the trades",
      "save trades",
      "save the trades in a json file",
      "save trades in a json file",
      "memory",
      "memory of the trades",
      "memory of the trades in a json file",
      "rag",
      "rag plugin",
      "rag memory",
      "rag context",
      "rag knowledge",
      "btc pump",
      "btc pump last night",
      "bitcoin pump",
      "bitcoin analysis",
      "trade analysis",
      "crypto trade",
      "trading signal",
    ],
    description: "save the trades in a json file after each trade",
  
    validate: async () => true,
  
    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State,
      _options: unknown,
      callback: HandlerCallback,
    ): Promise<boolean> => {
      const trade = extractLastTrade(_runtime);
      console.log("Trade trouvé:", trade);
      
      if (trade) {
        try {
          const filePath = './trades.json';
          let trades: Trade[] = [];
          
          if (fs.existsSync(filePath)) {
            const existingData = fs.readFileSync(filePath, 'utf8');
            if (existingData.trim()) {
              try {
                const parsed = JSON.parse(existingData);
                if (Array.isArray(parsed)) {
                  trades = parsed;
                  console.log(`${trades.length} trades existants trouvés dans le fichier`);
                } else {
                  console.log("Le fichier ne contenait pas un tableau, création d'un nouveau tableau");
                  trades = [];
                }
              } catch (parseError) {
                console.log("Fichier JSON corrompu, création d'un nouveau tableau");
                trades = [];
              }
            } else {
              console.log("Fichier vide, création d'un nouveau tableau");
            }
          } else {
            console.log("Pas de fichier existant, création d'un nouveau tableau");
          }
          
          const timestamp = {
            ...trade,
            timestamp: new Date().toISOString(),
            id: Date.now(),
            state: "open"
          };
          
          trades.push(timestamp);
          
          const data = JSON.stringify(trades, null, 2);
          fs.writeFileSync(filePath, data);
          console.log(`Trade ajouté à ${filePath}. Total: ${trades.length} trades`);
        } catch (error) {
          console.error("Erreur lors de la sauvegarde:", error);
        }
      } else {
        console.log("Aucun trade trouvé à sauvegarder");
      }
      await callback({
        text: "trades saved in memory",
        actions: ["RAG"],
        source: message.content.source,
      });
      return true;
    },
  
    examples: [
      [
        { name: "{{user}}", content: { text: "btc pump" } },
        { name: "{{agent}}", content: { text: "trades saved in memory", actions: ["RAG"] } },
      ],
      [
        { name: "{{user}}", content: { text: "btc pump last night" } },
        { name: "{{agent}}", content: { text: "trades saved in memory", actions: ["RAG"] } },
      ],
    ],
  };
  
  const plugin: Plugin = {
    name: "rag-memory",
    description: "Un plugin qui sauvegarde les trades dans un fichier json",
    priority: 150,
    actions: [rag],
  };

  export default plugin;