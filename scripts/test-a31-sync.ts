async function main() {
  console.log('--- TEST A3.1: FORZAR SINCRONIZACIÓN REAL EN PRODUCCIÓN ---');
  console.log('Enviando POST /api/cards/sync-bulk con { force: true }...');

  const startTime = Date.now();
  const res = await fetch('https://mtgc-backend-caf950eaa8b4.herokuapp.com/api/cards/sync-bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': 'MtgcAdminSecret2026!',
    },
    body: JSON.stringify({ force: true, limit: 15000 })
  });

  const duration = (Date.now() - startTime) / 1000;
  console.log(`Respuesta del servidor en ${duration}s: Status ${res.status}`);
  const data = await res.json();
  console.log('Resultado de sincronización:', JSON.stringify(data, null, 2));
}

main().catch(err => {
  console.error('Error al ejecutar A3.1:', err);
  process.exit(1);
});
