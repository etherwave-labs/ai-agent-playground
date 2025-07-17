import type { Plugin, Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import fs from "fs/promises";      
  
  async function rest<T>(url: string): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    const res = await fetch(url, { headers });          
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }
  
  const fetchThoughts: Action = {
    name: "FETCH_THOUGHTS",
    description:
      "Récupère les derniers logs debug (priority 7) et les enregistre dans log-agent.json.",
    similes: ["dump thoughts", "récupère les pensées", "save thoughts"],
    validate: async () => true,
  
    handler: async (
      rt: IAgentRuntime,
      msg: Memory,
      _st: State,
      _opt: unknown,
      cb: HandlerCallback,
    ): Promise<boolean> => {
        if (process.env.LOG_ENABLED === "true") {
            try {
                const filename = "log-agent.json";
                const host   = process.env.ELIZA_API_HOST ?? "http://localhost:3000";
                const aid    = "49352196-f6d2-0e9b-a5cd-896a96f5119d";
                const url    = `${host}/api/agents/${aid}/logs`;
                const response = await fetch(url);
                const data = await response.json() as any;
                
                console.log("🔍 Structure complète de la réponse API:", JSON.stringify(data, null, 2));
                
                let thoughts = "N/A";
                let message = "N/A";
                
                try {
                    if (data?.data?.[0]?.body?.response?.thought) {
                        thoughts = data.data[0].body.response.thought;
                    }
                    if (data?.data?.[0]?.body?.response?.message) {
                        message = data.data[0].body.response.message;
                    }
                } catch (parseError) {
                    console.log("❌ Erreur lors de l'extraction des données:", parseError);
                }
                
                console.log("📝 Thoughts extraites:", thoughts);
                console.log("📝 Message extrait:", message);

                let tab: any[] = [];

                try {
                    await fs.stat(filename);
                    const content = await fs.readFile(filename, 'utf8');
                    if (content) tab = JSON.parse(content);
                } catch (fileError) {
                    console.log("📁 Fichier log-agent.json n'existe pas encore, création...");
                    tab = [];
                }

                const logEntry = {
                    date: new Date().toISOString(),
                    thoughts,
                    message,
                };

                tab.push(logEntry);

                await fs.writeFile(filename, JSON.stringify(tab, null, 2), 'utf8');
                await cb({
                text: `Pensées enregistrées dans log-agent.json (thoughts: ${thoughts !== "N/A" ? "✅" : "❌"}, message: ${message !== "N/A" ? "✅" : "❌"})`,
                actions: ["FETCH_THOUGHTS"],
                source: msg.content.source,
                });
                return true;
            } catch (err: any) {
                console.log("Erreur complète:", err);
                await cb({
                text: `Erreur FETCH_THOUGHTS : ${err.message}`,
                actions: ["FETCH_THOUGHTS"],
                source: msg.content.source,
                });
                return false;
            }
        }
        await cb({
            text: `log disabled`,
            actions: ["FETCH_THOUGHTS"],
            source: msg.content.source,
        });
        return false;
    },
  };
  
  const plugin: Plugin = {
    name: "fetch-thoughts",
    description: "Sauvegarde le chain-of-thought dans log-agent.json",
    priority: 200,
    actions: [fetchThoughts],
  };
  
  export default plugin;
  