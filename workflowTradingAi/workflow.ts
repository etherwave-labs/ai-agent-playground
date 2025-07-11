import cron from "node-cron";
import axios from "axios";

const BASE = "http://localhost:3000/api/messaging";

const SERVER_ZERO = "00000000-0000-0000-0000-000000000000";

const ME   = "f6a0a8d1-f28d-4538-bdab-5eb0b527430c";
const BOT  = "49352196-f6d2-0e9b-a5cd-896a96f5119d";

async function createChannel(): Promise<string> {
  const res = await axios.post(`${BASE}/central-channels`, {
    name: `btc-${Date.now()}`,
    server_id: SERVER_ZERO,
    participantCentralUserIds: [ME, BOT],
    type: "DM"
  });
  return res.data.data.id as string;
}

async function sendPrompt(roomId: string): Promise<void> {
  await axios.post(`${BASE}/central-channels/${roomId}/messages`, {
    author_id: ME,
    content: `Analyse le marché BTC en temps réel.
Calcule un sentiment compris entre 0 % et 100 %.
RENVOIE UNE SEULE LIGNE, SANS AUCUNE EXPLICATION, strictement au format :
sentiment:X%, allocation:$X, stoploss:$X, takeprofit:$X, prixBTC:$X, leverage:X

Règles :
1. Achat (bullish) → 70 % ≤ sentiment ≤ 100 %.
2. Vente (bearish) → 0 % ≤ sentiment < 30 %.
3. Attente     → 30 % ≤ sentiment ≤ 70 %.
4. Allocation ≤ 150 USDC et leverage ≤ 10 x.
5. Pour annuler une position ouverte, envoie une ligne avec un sentiment qui provoquera l’ordre inverse, même allocation & leverage.
6. Toujours adapter stop-loss et take-profit à un horizon de 15 minutes.
7. Aucune autre sortie que la ligne au format indiqué.`,
    source_type: "client_chat",
    server_id: SERVER_ZERO
  });
}

cron.schedule("*/15 * * * *", async () => {
  try {
    const id = await createChannel();
    await sendPrompt(id);
    console.log("✅ prompt envoyé dans", id);
  } catch (e: any) {
    if (e.response) {
      console.error("HTTP", e.response.status, e.response.data);
    } else {
      console.error("❌", e.message);
    }
  }
});
