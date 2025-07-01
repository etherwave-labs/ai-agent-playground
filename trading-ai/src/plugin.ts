import type { Plugin, Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";

//exemple pour tester
const solanaGoatAction: Action = {
  name: "SOLANAGOAT",
  similes: [
    "solana le goat",
    "solana goat",
    "solana quel goat",
  ],
  description: "Répond \"REEL\" pour confirmer que Solana est le GOAT.",

  validate: async () => true,

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    await callback({
      text: "REEL",
      actions: ["SOLANAGOAT"],
      source: message.content.source,
    });
    return true;
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "solana quel goat" } },
      { name: "{{agent}}", content: { text: "REEL", actions: ["SOLANAGOAT"] } },
    ],
    [
      { name: "{{user}}", content: { text: "solana goat" } },
      { name: "{{agent}}", content: { text: "REEL", actions: ["SOLANAGOAT"] } },
    ],
  ],
};

const plugin: Plugin = {
  name: "solanagoat",
  description: "Un plugin minimal qui affirme que Solana est le GOAT.",
  priority: 50, // Priorité plus faible que RAG
  actions: [solanaGoatAction],
};

export default plugin;
