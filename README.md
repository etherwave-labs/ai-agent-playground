# 🤖 ElizaOS Trading Bot — Autonomous Crypto Agent

Bot de trading autonome construit avec [ElizaOS](https://github.com/a16z/eliza), le framework d’agents IA développé par a16z.
Il analyse le BTC, consulte les news, prend des décisions et passe des ordres sur [Hyperliquid](https://hyperliquid.xyz) en toute autonomie.

---

## 🧠 Fonctionnalités

- 📈 Récupération de données marché (prix, RSI, MACD, etc.)
- 📰 Analyse de news crypto (via Coindesk)
- 🧠 Prise de décision par LLM (Claude via Ollama)
- 📊 Évaluation du sentiment de marché
- 💸 Passage d’ordres automatiques (Long / Short / Wait) sur Hyperliquid

---

## ⚙️ Setup

### Prérequis

- [Bun](https://bun.sh/)
- [Ollama](https://ollama.com/) (modèle `nomic-embed-text`)
- ElizaOS (v1.0.15 ou supérieur)
- Clé API [Coingecko](https://www.coingecko.com/), [TAAPI.io](https://taapi.io/)
- Clé API Hyperliquid

### Installation

#### 1. Lancer Ollama

```bash
ollama pull nomic-embed-text
ollama serve
```

#### 2. Cloner et installer le projet

```bash
git clone https://github.com/etherwave-labs/ai-agent-playground.git
cd ai-agent-playground/trading-ai
bun install
bun run dev
```

#### 3. Lancer le workflow de trading

```bash
cd ../workflowTradingAi
bun run workflow.ts
```

> Le bot tourne désormais en tâche de fond. Il effectue une analyse toutes les 15 minutes (à :00, :15, :30, :45).

### Exemple de `.env`

```env
ANTHROPIC_API_KEY=...
ANTHROPIC_SMALL_MODEL=claude-sonnet-4-20250514
ANTHROPIC_LARGE_MODEL=claude-sonnet-4-20250514

OLLAMA_API_ENDPOINT=http://localhost:11434/api
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

DISCORD_APPLICATION_ID=...
DISCORD_API_TOKEN=...
CHANNEL_IDS=...

HYPERLIQUID_PRIVKEY=...
HYPERLIQUID_PUBKEY=...
PUBKEY=...

LOG_ENABLED=true #or false
TAAPI_API_KEY=...
COINGECKO_API_KEY=...
COINDESK_API_KEY=...
```

---

## 🧰 Architecture Plugins

### 📦 Providers (entrées de données)

- `fetchBTCPrice.ts` : prix BTC temps réel + historique 7j
- `fetchNewsCoindesk.ts` : dernières news en rapport avec BTC
- `getBalanceHyperLiquid.ts` : solde Hyperliquid
- `getPnL.ts` : PnL 1j / 7j / 30j / all time
- `getDataMarket.ts` : RSI + MACD via TAAPI
- `getOpenOrder.ts` : liste des ordres ouverts

### ⚙️ Actions (exécutables par l'agent)

- `placeOrder.ts` : place un ordre sur Hyperliquid
- `log.ts` : log les pensées du LLM
- `rag.ts` : ancien système de log (remplacé)

---

## 🧠 Algorithme de décision

L’agent décide en fonction de :

- RSI + MACD
- Prix BTC
- News
- Ordres ouverts

Il retourne un **sentiment entre 0 et 100** :

| Sentiment | Action |
| --------- | ------ |
| 0-29      | SHORT  |
| 30-69     | WAIT   |
| 70-100    | LONG   |

---

## 📄 Licence

MIT — open source.
