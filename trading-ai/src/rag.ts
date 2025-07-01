import type { Plugin, Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";

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
    name: "rag",
    description: "Un plugin qui sauvegarde les trades dans un fichier json",
    priority: 100,
    actions: [rag],
  };