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
                contextText += `- Dernier trade: ${lastTrade.trade.toUpperCase()} (${lastTrade.allocation}%, Stop: $${lastTrade.stoploss}, Target: $${lastTrade.takeprofit}, Sentiment: ${lastTrade.sentiment}%, ID: ${lastTrade.id}) du ${date}`;
            }

            if (openTrades.length > 0) {
                contextText += `\n- Trades ouverts:\n`;
                openTrades.forEach(trade => {
                    const date = new Date(trade.timestamp).toLocaleString('fr-FR');
                    contextText += `  • ${trade.trade.toUpperCase()} (ID: ${trade.id}, ${trade.allocation}%, Stop: $${trade.stoploss}, Target: $${trade.takeprofit}, Sentiment: ${trade.sentiment}%) du ${date}\n`;
                });
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
            if (error.code === 'ENOENT') {
                console.log("Fichier trades.json n'existe pas encore");
                return {
                    text: "Aucun fichier de trades trouvé. Nouveau système de trading initialisé.",
                    values: { tradesCount: 0, currentTrades: [] },
                    data: { trades: [] }
                };
            } else if (error instanceof SyntaxError) {
                console.log("Fichier trades.json corrompu, réinitialisation nécessaire");
                // Sauvegarder le fichier corrompu et créer un nouveau fichier vide
                const filePath = path.join(process.cwd(), 'trades.json');
                const backupPath = path.join(process.cwd(), `trades_backup_${Date.now()}.json`);
                try {
                    const corruptedData = fs.readFileSync(filePath, 'utf8');
                    fs.writeFileSync(backupPath, corruptedData);
                    fs.writeFileSync(filePath, '[]');
                    console.log(`Fichier corrompu sauvegardé dans ${backupPath}`);
                } catch (backupError) {
                    console.log("Erreur lors de la sauvegarde du fichier corrompu:", backupError.message);
                }
                return {
                    text: "Fichier de trades corrompu détecté et réinitialisé. Système prêt pour de nouveaux trades.",
                    values: { tradesCount: 0, currentTrades: [] },
                    data: { trades: [] }
                };
            } else {
                console.log("Erreur lors de la lecture des trades:", error.message);
                return {
                    text: "Erreur lors de la lecture des données de trading. Système en mode dégradé.",
                    values: { tradesCount: 0, currentTrades: [] },
                    data: { trades: [] }
                };
            }
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