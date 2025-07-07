import type { Plugin, Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import fs from 'fs';

interface Trade {
  trade: 'long' | 'wait' | 'short';
  allocation: number;     // en %
  stoploss: number;       // en $
  takeprofit: number;     // en $
  sentiment: number;      // en %
  id?: number;            // optionnel
  timestamp?: string;     // optionnel
  state?: string;         // optionnel
}

function extractLastTrade(runtime: IAgentRuntime, currentText?: string): Trade | null {
  const TRADE_REGEX =
  /trade:\s*(?<trade>long|wait|short)\s*,\s*allocation:\s*\$?(?<allocation>\d+(?:\.\d+)?)(?:%)?\s*,\s*stoploss:\s*\$(?<stoploss>\d+(?:\.\d+)?)\s*,\s*takeprofit:\s*\$(?<takeprofit>\d+(?:\.\d+)?)\s*,\s*sentiment:\s*(?<sentiment>\d+(?:\.\d+)?)%(?:\s*,\s*prixBTC:\s*\$(?<prixBTC>\d+(?:\.\d+)?))?(?:\s*,\s*id:\s*(?<id>\d+))?/gi;

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
      const entryText = mostRecentEntry?.text || '';
      const matches = [...entryText.matchAll(TRADE_REGEX)];
      if (matches.length) {
        lastMatch = matches[matches.length - 1];
      }
    }
  }

  if (!lastMatch || !lastMatch.groups) return null;

  const { trade, allocation, stoploss, takeprofit, sentiment, id } = lastMatch.groups;

  const result: Trade = {
    trade: trade as 'long' | 'wait' | 'short',
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

function validateDeleteCommand(runtime: IAgentRuntime): boolean {
  console.log("VALIDATION: Vérification de la validité d'une commande de suppression");
  
  const filePath = './trades.json';
  if (!fs.existsSync(filePath)) {
    console.log("VALIDATION: Aucun fichier trades.json - suppression non autorisée");
    return false;
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    if (!data.trim()) {
      console.log("VALIDATION: Fichier trades.json vide - suppression non autorisée");
      return false;
    }

    const trades = JSON.parse(data);
    if (!Array.isArray(trades) || trades.length === 0) {
      console.log("VALIDATION: Aucun trade dans le fichier - suppression non autorisée");
      return false;
    }

    console.log(`VALIDATION: ${trades.length} trades trouvés - suppression potentiellement autorisée`);
    return true;
  } catch (error) {
    console.log("VALIDATION: Erreur lors de la lecture du fichier - suppression non autorisée", error);
    return false;
  }
}

function extractLastDeleteCommand(runtime: IAgentRuntime): number | null {
  const DELETE_REGEX = /\bid:\s*(?<id>\d+)\s*,?\s*DELETE\b/gi;

  if (!validateDeleteCommand(runtime)) {
    console.log("EXTRACT_DELETE: Suppression bloquée par la validation de sécurité");
    return null;
  }

  const stateCache = (runtime as any).stateCache;
  if (!stateCache) {
    console.log("EXTRACT_DELETE: Aucun cache d'état disponible");
    return null;
  }

  let lastId: number | null = null;
  let foundInCurrentSession = false;

  const filePath = './trades.json';
  if (!fs.existsSync(filePath)) {
    console.log("EXTRACT_DELETE: Aucun fichier trades.json trouvé, pas de suppression nécessaire");
    return null;
  }

  let existingTrades: Trade[] = [];
  try {
    const existingData = fs.readFileSync(filePath, 'utf8');
    if (existingData.trim()) {
      const parsed = JSON.parse(existingData);
      if (Array.isArray(parsed)) {
        existingTrades = parsed;
      }
    }
  } catch (error) {
    console.log("EXTRACT_DELETE: Erreur lors de la lecture du fichier trades.json:", error);
    return null;
  }

  if (existingTrades.length === 0) {
    console.log("EXTRACT_DELETE: Aucun trade existant à supprimer");
    return null;
  }

  const entries = Array.from(stateCache.entries()) as [string, any][];
  const recentEntries = entries.slice(-3);

  for (const [, entry] of recentEntries) {
    const text = entry.text ?? '';
    for (const match of text.matchAll(DELETE_REGEX)) {
      const idStr = match.groups?.id;
      if (!idStr) continue;

      const idNum = Number(idStr);
      if (!Number.isNaN(idNum)) {
        const tradeExists = existingTrades.some(trade => trade.id === idNum);
        if (tradeExists) {
          lastId = idNum;
          foundInCurrentSession = true;
          console.log(`EXTRACT_DELETE: Commande de suppression valide trouvée pour le trade ID: ${idNum}`);
        } else {
          console.log(`EXTRACT_DELETE: Trade avec l'ID ${idNum} n'existe pas, commande de suppression ignorée`);
        }
      }
    }
  }

  if (!foundInCurrentSession) {
    console.log("EXTRACT_DELETE: Aucune commande de suppression valide trouvée dans la session courante");
  }

  return foundInCurrentSession ? lastId : null;
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
      const currentResponseText = _state.messages?.[_state.messages.length - 1]?.content?.text || '';
      
      const trade = extractLastTrade(_runtime, currentResponseText);
      console.log("Trade trouvé dans la réponse actuelle:", trade);
      
      if (!trade) {
        await callback({
          text: "Aucun trade trouvé dans la réponse actuelle",
          actions: ["RAG"],
          source: message.content.source,
        });
        return true;
      }
      
      if (trade.trade === "wait") {
        await callback({
          text: "Waiting for the next trade",
          actions: ["RAG"],
          source: message.content.source,
        });
        return true;
      }
      
      if (trade && trade.sentiment >= 70) {
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
                console.log("Fichier JSON corrompu, sauvegarde et création d'un nouveau tableau");
                const backupPath = `./trades_backup_${Date.now()}.json`;
                try {
                  fs.writeFileSync(backupPath, existingData);
                  console.log(`Fichier corrompu sauvegardé dans ${backupPath}`);
                } catch (backupError) {
                  console.log("Erreur lors de la sauvegarde du fichier corrompu:", backupError.message);
                }
                trades = [];
              }
            } else {
              console.log("Fichier vide, création d'un nouveau tableau");
            }
          } else {
            console.log("Pas de fichier existant, création d'un nouveau tableau");
          }
          
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
        console.log("Aucun trade trouvé à sauvegarder ou sentiment inférieur à 70");
        await callback({
          text: "Aucun trade trouvé à sauvegarder ou sentiment inférieur à 70",
          actions: ["RAG"],
          source: message.content.source,
        });
        return true;
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

  const deleteTrade: Action = {
    name: "DELETETRADE",
    description: "delete a trade from the memory",
    similes: [
      "delete trade",
      "remove trade",
      "supprimer trade",
      "supprimer le trade",
      "enlever trade",
      "delete",
      "remove",
      "supprimer",
      "supprime ce trade",
      "supprime trade",
      "supprime le trade",
      "enleve trade",
      "enleve le trade",
      "delete trade",
      "remove trade",
      "supprime trade",
    ],
    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State,
      _options: unknown,
      callback: HandlerCallback,
    ): Promise<boolean> => {
      console.log("DELETETRADE: Début de l'exécution");
      
      const deleteId = extractLastDeleteCommand(_runtime);
      console.log("DELETETRADE: ID à supprimer trouvé:", deleteId);
      
      if (!deleteId) {
        console.log("DELETETRADE: Aucun ID valide trouvé pour suppression");
        await callback({
          text: "no valid delete command found",
          actions: ["DELETETRADE"],
          source: message.content.source,
        });
        return false;
      }

      const filePath = './trades.json';
      
      if (!fs.existsSync(filePath)) {
        console.log("DELETETRADE: Aucun fichier trades.json trouvé");
        await callback({
          text: "no trades file found, nothing to delete",
          actions: ["DELETETRADE"],
          source: message.content.source,
        });
        return false;
      }

      try {
        const ragData = fs.readFileSync(filePath, "utf-8");
        
        if (!ragData.trim()) {
          console.log("DELETETRADE: Fichier trades.json vide");
          await callback({
            text: "trades file is empty, nothing to delete",
            actions: ["DELETETRADE"],
            source: message.content.source,
          });
          return false;
        }

        const trades = JSON.parse(ragData);
        
        if (!Array.isArray(trades) || trades.length === 0) {
          console.log("DELETETRADE: Aucun trade à supprimer");
          await callback({
            text: "no trades found to delete",
            actions: ["DELETETRADE"],
            source: message.content.source,
          });
          return false;
        }

        const tradeToDelete = trades.find((trade: any) => trade.id === deleteId);
        if (!tradeToDelete) {
          console.log(`DELETETRADE: Trade avec l'ID ${deleteId} n'existe pas`);
          await callback({
            text: `trade with id ${deleteId} not found`,
            actions: ["DELETETRADE"],
            source: message.content.source,
          });
          return false;
        }

        const updatedTrades = trades.filter((trade: any) => trade.id !== deleteId);

        fs.writeFileSync(filePath, JSON.stringify(updatedTrades, null, 2));

        console.log(`DELETETRADE: Trade avec l'ID ${deleteId} supprimé avec succès`);
        await callback({
          text: "trade deleted from memory",
          actions: ["DELETETRADE"],
          source: message.content.source,
        });
        return true;
        
      } catch (error) {
        console.error("DELETETRADE: Erreur lors de la suppression:", error);
        await callback({
          text: "error occurred while deleting trade",
          actions: ["DELETETRADE"],
          source: message.content.source,
        });
        return false;
      }
    },
    validate: async () => true,
    examples: [
      [
        { name: "{{user}}", content: { text: "delete trade" } },
        { name: "{{agent}}", content: { text: "trade deleted from memory", actions: ["DELETETRADE"] } },
      ],
      [
        { name: "{{user}}", content: { text: "delete last trade" } },
        { name: "{{agent}}", content: { text: "trade deleted from memory", actions: ["DELETETRADE"] } },
      ],
      [
        { name: "{{user}}", content: { text: "supprime le dernier trade" } },
        { name: "{{agent}}", content: { text: "trade deleted from memory", actions: ["DELETETRADE"] } },
      ],
    ],
  };

  const plugin: Plugin = {
    name: "rag-memory",
    description: "Un plugin qui sauvegarde les trades dans un fichier json",
    priority: 150,
    actions: [rag, deleteTrade],
  };

  export default plugin;