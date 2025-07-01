import { Provider, Plugin } from '@elizaos/core';
import * as fs from 'fs';
import * as path from 'path';

const getRagPlugin: Provider = {
    name: "rag",
    description: "RAG plugin pour les données des trades",
    position: 10,
    get: async () => {
        try {
            console.log("Récupération des trades...");
            const filePath = path.join(process.cwd(), 'trades.json');
            const data = fs.readFileSync(filePath, 'utf8');
            const trades = JSON.parse(data);
            
            if (!Array.isArray(trades) || trades.length === 0) {
                return {
                    text: "Aucun trade enregistré dans le système.",
                    values: { tradesCount: 0, currentTrades: [] },
                    data: { trades: [] }
                };
            }

            const lastTrade = trades[trades.length - 1];
            const openTrades = trades.filter(trade => trade.state === 'open');
            
            let contextText = `Données des trades disponibles:\n`;
            contextText += `- Total des trades: ${trades.length}\n`;
            contextText += `- Trades ouverts: ${openTrades.length}\n`;
            
            if (lastTrade) {
                const date = new Date(lastTrade.timestamp).toLocaleString('fr-FR');
                contextText += `- Dernier trade: ${lastTrade.trade.toUpperCase()} (${lastTrade.allocation}%, Stop: $${lastTrade.stoploss}, Target: $${lastTrade.takeprofit}, Sentiment: ${lastTrade.sentiment}%) du ${date}`;
            }

            return {
                text: contextText,
                values: { 
                    tradesCount: trades.length,
                    openTradesCount: openTrades.length,
                    lastTrade: lastTrade,
                    currentTrades: openTrades
                },
                data: { trades: trades, openTrades: openTrades }
            };
        } catch (error) {
            console.log("Aucun trade trouvé:", error.message);
            return {
                text: "Aucun fichier de trades trouvé.",
                values: { tradesCount: 0, currentTrades: [] },
                data: { trades: [] }
            };
        }
    }
}

const plugin: Plugin = {
    name: "get-rag-memory",
    description: "Un plugin qui récupère les trades dans un fichier json",
    providers: [getRagPlugin],
    priority: 150,
};

export default plugin;