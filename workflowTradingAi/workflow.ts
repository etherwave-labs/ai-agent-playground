
import cron from 'node-cron';

import axios, { AxiosError } from "axios";

const URL =
  "http://localhost:3000/api/messaging/central-channels/91b0c098-b2c3-44f8-9dbb-f0d3ca2626f4/messages";

const payload = {
  author_id: "f6a0a8d1-f28d-4538-bdab-5eb0b527430c",
  content: `Analyse le marché BTC en temps réel.
Si tu détectes une opportunité claire d’achat, renvoie UNE SEULE ligne “trade: buy …” au format strict.
Si tu détectes une opportunité claire de vente, renvoie UNE SEULE ligne “id: x, DELETE” (ou x est l'id du trade a annuler) au format strict.
Si aucune opportunité n’est jugée assez forte (p. ex. sentiment < 70 %), renvoie UNE SEULE ligne "trade: wait ..." au format strict.`,
  server_id: "00000000-0000-0000-0000-000000000000",
  raw_message: {
    roomId: "91b0c098-b2c3-44f8-9dbb-f0d3ca2626f4",
    source: "client_chat",
    message: `Analyse le marché BTC en temps réel.
Si tu détectes une opportunité claire d’achat, renvoie UNE SEULE ligne “trade: buy …” au format strict.
Si tu détectes une opportunité claire de vente, renvoie UNE SEULE ligne “id: x, DELETE” (ou x est l'id du trade a annuler) au format strict.
Si aucune opportunité n’est jugée assez forte (p. ex. sentiment < 70 %), renvoie UNE SEULE ligne "trade: wait ..." au format strict.`,
    metadata: {
      isDm: true,
      channelType: "DM",
      targetUserId: "49352196-f6d2-0e9b-a5cd-896a96f5119d",
    },
    senderId: "f6a0a8d1-f28d-4538-bdab-5eb0b527430c",
    serverId: "00000000-0000-0000-0000-000000000000",
    channelId: "91b0c098-b2c3-44f8-9dbb-f0d3ca2626f4",
    messageId: "00b8ecdb-fc80-4fab-a643-93586b43cf53",
    senderName: "User-f6a0a8d1",
  },
  metadata: {
    isDm: true,
    channelType: "DM",
    targetUserId: "49352196-f6d2-0e9b-a5cd-896a96f5119d",
  },
  source_type: "client_chat",
} as const;

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
} as const;

export async function sendMessage(): Promise<void> {
  try {
    const resp = await axios.post(URL, payload, {
      headers,
      timeout: 10_000,
    });

    console.log("Message créé :", resp.status);
    console.dir(resp.data, { depth: null });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response) {
        console.error(
          "Erreur HTTP :",
          err.response.status,
          err.response.data
        );
      } else {
        console.error("Erreur réseau :", err.message);
      }
    } else {
      console.error("Erreur inconnue :", err);
    }
  }
}

cron.schedule("* * * * *", () => sendMessage());