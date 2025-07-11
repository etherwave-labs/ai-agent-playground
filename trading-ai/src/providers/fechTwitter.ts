import { Provider, Plugin } from '@elizaos/core';

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
if (!BEARER_TOKEN) {
  throw new Error('Erreur: la variable d\'environnement TWITTER_BEARER_TOKEN n\'est pas définie.');
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
}

interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

async function fetchWithRateLimit(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 429 && retries > 0) {
    const retryAfter = res.headers.get('retry-after');
    let waitSec = retryAfter ? parseInt(retryAfter, 10) : 1;
    const resetTs = parseInt(res.headers.get('x-rate-limit-reset') || '0', 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!retryAfter && resetTs > nowSec) {
      waitSec = resetTs - nowSec;
    }
    console.warn(`Rate limit atteint, nouvelle tentative dans ${waitSec}s`);
    await new Promise(r => setTimeout(r, waitSec * 1000));
    return fetchWithRateLimit(url, options, retries - 1);
  }
  return res;
}

async function getUserIdByUsername(username: string): Promise<string> {
  const url = `https://api.twitter.com/2/users/by/username/${username}`;
  const res = await fetchWithRateLimit(url, {
    headers: {
      Authorization: `Bearer ${BEARER_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { title: string, detail: string };
    throw new Error(`Twitter API error ${res.status}: ${err.title || res.statusText}`);
  }
  const { data } = (await res.json()) as { data: TwitterUser };
  return data.id;
}

async function getUserTweets(
  userId: string,
  maxResults = 5
): Promise<Tweet[]> {
  const params = new URLSearchParams({
    max_results: maxResults.toString(),
    'tweet.fields': 'created_at,public_metrics',
  });
  const url = `https://api.twitter.com/2/users/${userId}/tweets?${params}`;
  const res = await fetchWithRateLimit(url, {
    headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { title: string, detail: string };
    throw new Error(`Twitter API error ${res.status}: ${err.title || res.statusText}`);
  }
  const { data } = (await res.json()) as { data: Tweet[] };
  return data;
}

const fetchTwitterProvider: Provider = {
  name: 'fetchTwitter',
  description: "Récupère les derniers tweets d'un utilisateur Twitter",
  position: 10,
  get: async (context: any) => {
    const username = (context.args?.username as string) || 'CryptoastMedia';
    console.log(`Récupération des tweets de @${username}...`);
    try {
      const userId = await getUserIdByUsername(username);
      const tweets = await getUserTweets(userId, 5);
      console.log(`Tweets récupérés: ${tweets.length}`);
      if (!tweets.length) {
        return { text: `Aucun tweet trouvé pour @${username}.`, values: { tweets } };
      }
      const lines = tweets.map(t => `- [${t.created_at}] ${t.text}`);
      console.log(`Tweets formatés: ${lines.join('\n')}`);
      return {
        text: `Derniers tweets de @${username} :\n${lines.join('\n')}`,
        values: { tweets },
      };
    } catch (error: any) {
      console.error('Erreur lors de la récupération des tweets:', error);
      return {
        text: "Une erreur est survenue lors de la récupération des tweets. Veuillez réessayer plus tard.",
        values: { error: error.message },
      };
    }
  },
};

const plugin: Plugin = {
  name: 'fetchTwitter',
  description: "Plugin pour récupérer les derniers tweets d'un utilisateur Twitter",
  providers: [fetchTwitterProvider],
  priority: 150,
};

export default plugin;
