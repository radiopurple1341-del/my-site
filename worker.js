export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/counter') {
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
      }

      const today = new Date().toISOString().slice(0, 10);
      const dailyKey = `day_${today}`;

      if (request.method === 'GET') {
        const count = parseInt(await env.COUNTER.get('total') || '0');
        const daily = parseInt(await env.COUNTER.get(dailyKey) || '0');
        return new Response(JSON.stringify({ count, today: daily }), { headers });
      }

      if (request.method === 'POST') {
        const count = parseInt(await env.COUNTER.get('total') || '0') + 1;
        const daily = parseInt(await env.COUNTER.get(dailyKey) || '0') + 1;
        await env.COUNTER.put('total', String(count));
        await env.COUNTER.put(dailyKey, String(daily), { expirationTtl: 172800 }); // 48h
        return new Response(JSON.stringify({ count, today: daily }), { headers });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
