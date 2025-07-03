import { Provider, Plugin } from '@elizaos/core';

async function fetchCoindeskArticles(
    lang = 'EN',
    limit = 10,
    apiKey = 'bd0c072a109efe7c2fd33a317951442406021daa9a55504583e78024cecada25',
    category = 'BTC'
  ): Promise<any> {
    const base = 'https://data-api.coindesk.com/news/v1/article/list';
    const url = `${base}?${new URLSearchParams({ lang, limit: limit.toString(), api_key: apiKey, category: category })}`;
  
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log("successfully fetched articles");
    return res.json();
}

function extractTitles(response: any): string[] {
    return response.Data.map((article: any) => article.TITLE);
}

const fetchNewsCoinDeskProvider: Provider = {
    name: 'fetchNewsCoinDesk',
    description: 'Récupère les derniers articles de CoinDesk',
    position: 10,
    get: async () => {
        const articles = await fetchCoindeskArticles();
        const titles = extractTitles(articles);
        return {
            text: `Les derniers articles de CoinDesk sont : ${titles.join(', ')}`,
        }
    }
}

const plugin: Plugin = {
    name: 'fetchNewsCoinDesk',
    description: 'Récupère les derniers articles de CoinDesk',
    providers: [fetchNewsCoinDeskProvider],
    priority: 150,
};

export default plugin;