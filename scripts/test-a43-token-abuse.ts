import http from 'node:http';

async function testTokenAbuse() {
  const host = process.env.TEST_HOST || '127.0.0.1';
  const port = parseInt(process.env.TEST_PORT || '3001', 10);
  console.log(`🛡️ [Test A4.3] Iniciando prueba de abuso con 1.000 peticiones y tokens falsificados/rotados hacia ${host}:${port}...`);

  let count200 = 0;
  let count429 = 0;
  let first429Index = -1;

  for (let i = 1; i <= 1000; i++) {
    const fakeToken = `fake_guest_token_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    const result = await new Promise<{ status: number; body: string }>((resolve) => {
      const req = http.request(
        {
          hostname: host,
          port: port,
          path: '/api/cards/search?q=Forest',
          method: 'GET',
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

    if (result.status === 200) {
      count200++;
    } else if (result.status === 429) {
      count429++;
      if (first429Index === -1) {
        first429Index = i;
      }
    }

    if (i % 200 === 0) {
      console.log(`[Petición ${i}/1000] 200 OK: ${count200} | 429 Too Many Requests: ${count429}`);
    }
  }

  console.log(`\n📊 [Resultado Prueba A4.3 Abuso de Tokens]`);
  console.log(`Total peticiones: 1000`);
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
