const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: La variable de entorno DATABASE_URL no está configurada.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function cleanup() {
  console.log('--- PURGANDO SALAS INACTIVAS Y DE PRUEBA EN PRODUCCIÓN ---');

  // 1. Contar antes
  const before = await pool.query('SELECT count(*) FROM "room_snapshots"');
  console.log(`Instantáneas antes: ${before.rows[0].count}`);

  // 2. Eliminar salas de pruebas y salas con más de 1 hora de antigüedad
  const deleteRes = await pool.query(`
    DELETE FROM "room_snapshots"
    WHERE "roomCode" LIKE 'TEST%'
       OR "state"->>'name' LIKE 'Mesa Concurrente%'
       OR "state"->>'name' LIKE 'Test Multi%'
       OR "state"->>'name' LIKE 'BancoLatencia%'
       OR "state"->>'name' LIKE 'Smoke Test%'
       OR "updatedAt" < NOW() - INTERVAL '1 hour'
  `);
  console.log(`Instantáneas eliminadas: ${deleteRes.rowCount}`);

  // 3. Contar después
  const after = await pool.query('SELECT count(*) FROM "room_snapshots"');
  console.log(`Instantáneas restantes: ${after.rows[0].count}`);

  await pool.end();
}

cleanup().catch(err => {
  console.error('Error durante la purga:', err);
  process.exit(1);
});
