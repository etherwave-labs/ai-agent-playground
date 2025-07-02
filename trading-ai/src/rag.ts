import type { Plugin, Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import fs from 'fs';

interface Trade {
  trade: 'long' | 'short';
  allocation: number;     // en %
  stoploss: number;       // en $
  takeprofit: number;     // en $
  sentiment: number;      // en %
  id?: number;            // optionnel
  timestamp?: string;     // optionnel
  state?: string;         // optionnel
}

function extractLastTrade(runtime: IAgentRuntime): Trade | null {
  const TRADE_REGEX =
    /trade:\s*(?<trade>long|short)\s*,\s*allocation:\s*(?<allocation>\d+(?:\.\d+)?)%\s*,\s*stoploss:\s*\$(?<stoploss>\d+(?:\.\d+)?)\s*,\s*takeprofit:\s*\$(?<takeprofit>\d+(?:\.\d+)?)\s*,\s*sentiment:\s*(?<sentiment>\d+(?:\.\d+)?)%(?:\s*,\s*id:\s*(?<id>\d+))?/gi;

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

  const { trade, allocation, stoploss, takeprofit, sentiment, id } = lastMatch.groups;

  const result: Trade = {
    trade: trade as 'long' | 'short',
    allocation: Number(allocation),
    stoploss: Number(stoploss),
    takeprofit: Number(takeprofit),
    sentiment: Number(sentiment),
  };

  if (id) {
    result.id = Number(id);
  }

  return result;
}

function extractDeleteCommand(runtime: IAgentRuntime): number | null {
  const DELETE_REGEX = /id:\s*(?<id>\d+)\s*,\s*DELETE/gi;

  let lastMatch: RegExpMatchArray | null = null;

  const stateCache = (runtime as any).stateCache;
  if (!stateCache) return null;

  for (const [, entry] of stateCache) {
    const matches = [...(entry.text || '').matchAll(DELETE_REGEX)];
    if (matches.length) {
      lastMatch = matches[matches.length - 1];
    }
  }

  if (!lastMatch || !lastMatch.groups) return null;

  const { id } = lastMatch.groups;
  return Number(id);
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
      "execute trade",
      "execute trades",
      "execute trade",
      "analyze trade",
      "analyze trades",
      "analyze trade",
      "analyse ça",
      "delete trade",
      "remove trade",
      "supprimer trade",
      "supprimer le trade",
      "enlever trade",
      "delete",
      "remove",
      "supprimer",
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
      const deleteId = extractDeleteCommand(_runtime);
      if (deleteId) {
        console.log("id trouvé, suppression du trade");
        const filePath = './trades.json';
        const ragData = fs.readFileSync(filePath, "utf-8");
        const trades = JSON.parse(ragData);
        const updatedTrades = trades.filter((trade: any) => trade.id !== deleteId);

        fs.writeFileSync(filePath, JSON.stringify(updatedTrades, null, 2));

        console.log(`Trade avec l'id ${deleteId} supprimé.`);
        await callback({
          text: "trade deleted from memory",
          actions: ["RAG"],
          source: message.content.source,
        });
        return true;
      }
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
          
          // Vérifier si on doit modifier un trade existant basé sur l'id
          if (trade.id && trade.id > 0) {
            const existingTradeIndex = trades.findIndex(t => t.id === trade.id);
            if (existingTradeIndex !== -1) {
              console.log("id existant, modification du trade");
              trades[existingTradeIndex] = {
                ...trades[existingTradeIndex],
                trade: trade.trade,
                allocation: trade.allocation,
                stoploss: trade.stoploss,
                takeprofit: trade.takeprofit,
                sentiment: trade.sentiment,
                timestamp: new Date().toISOString()
              };
              
              const data = JSON.stringify(trades, null, 2);
              fs.writeFileSync(filePath, data);
              console.log(`Trade modifié avec id ${trade.id}`);
              
              await callback({
                text: "trade updated in memory",
                actions: ["RAG"],
                source: message.content.source,
              });
              return true;
            }
          }
          
          // Vérifier si ce trade existe déjà (éviter les doublons)
          const isDuplicate = trades.some(existingTrade => 
            existingTrade.trade.toLowerCase() === trade.trade.toLowerCase() &&
            existingTrade.allocation === trade.allocation &&
            existingTrade.stoploss === trade.stoploss &&
            existingTrade.takeprofit === trade.takeprofit &&
            existingTrade.sentiment === trade.sentiment
          );
          
          if (isDuplicate) {
            console.log("Trade identique déjà existant, pas de sauvegarde");
            await callback({
              text: "trade already exists in memory",
              actions: ["RAG"],
              source: message.content.source,
            });
            return true;
          }
          
          const newTrade: Trade = {
            ...trade,
            timestamp: new Date().toISOString(),
            id: trade.id || Date.now(),
            state: "open"
          };
          
          trades.push(newTrade);
          
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
        { name: "{{user}}", content: { text: "analyse ça" } },
        { name: "{{agent}}", content: { text: "trades saved in memory", actions: ["RAG"] } },
      ],
      [
        { name: "{{user}}", content: { text: "btc pump last night" } },
        { name: "{{agent}}", content: { text: "trades saved in memory", actions: ["RAG"] } },
      ],
      [
        { name: "{{user}}", content: { text: "powell speech today" } },
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