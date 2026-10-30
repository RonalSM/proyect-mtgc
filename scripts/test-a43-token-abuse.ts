import http from 'node:http';
import https from 'node:https';

async function testTokenAbuse() {
  const targetUrl = process.env.TEST_URL || 'https://mtgc-backend-caf950eaa8b4.herokuapp.com';
  const urlObj = new URL(targetUrl);
  const client = urlObj.protocol === 'https:' ? https : http;
  const port = urlObj.port ? parseInt(urlObj.port, 10) : (urlObj.protocol === 'https:' ? 443 : 80);

  console.log(`🛡️ [Test A4.3] Iniciando prueba de abuso con 1.000 peticiones concurrentes y tokens falsificados/rotados hacia ${targetUrl}...`);

  let count200 = 0;
  let count429 = 0;
  let first429Index = -1;
  let totalDone = 0;

  const agent = new (urlObj.protocol === 'https:' ? https.Agent : http.Agent)({
    keepAlive: true,
    maxSockets: 50,
  });

  const sendRequest = async (i: number) => {
    const fakeToken = `fake_guest_token_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    return new Promise<{ status: number; body: string }>((resolve) => {
      const req = client.request(
        {
          hostname: urlObj.hostname,
          port: port,
          path: '/api/cards/search?q=Forest',
          method: 'GET',
          agent,
          headers: {
            'x-guest-token': fakeToken,
            'User-Agent': 'MtgcTokenAbuseTest/1.0',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
        }
      );
      req.on('error', () => resolve({ status: 500, body: 'error' }));
      req.end();
    });
  };

  const CONCURRENCY = 25;
  let nextIndex = 1;

  const worker = async () => {
    while (nextIndex <= 1000) {
      const idx = nextIndex++;
      const res = await sendRequest(idx);
      totalDone++;
      if (res.status === 200) {
        count200++;
      } else if (res.status === 429) {
        count429++;
        if (first429Index === -1 || idx < first429Index) {
          first429Index = idx;
        }
      }

      if (totalDone % 200 === 0) {
        console.log(`[Progreso ${totalDone}/1000] 200 OK: ${count200} | 429 Too Many Requests: ${count429}`);
      }
    }
  };

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`\n📊 [Resultado Prueba A4.3 Abuso de Tokens]`);
  console.log(`Total peticiones: ${totalDone}`);
  console.log(`Peticiones exitosas (200): ${count200}`);
  console.log(`Peticiones bloqueadas con 429: ${count429}`);
  console.log(`Primera petición bloqueada con 429: #${first429Index}`);

  if (count429 > 0 && first429Index <= 400) {
    console.log(`✅ [ÉXITO A4.3] Los tokens falsos no saltan el rate limit. La IP bloqueó el tráfico abusivo con HTTP 429.`);
  } else {
    console.error(`❌ [FALLO A4.3] No se bloquearon las peticiones con 429.`);
    process.exit(1);
  }
}

testTokenAbuse().catch((err) => {
  console.error(err);
  process.exit(1);
});
