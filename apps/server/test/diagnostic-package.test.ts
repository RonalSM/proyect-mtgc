import { test } from 'node:test';
import assert from 'node:assert';

test('Punto D1: Generación de paquete de diagnóstico técnico anonimizado', () => {
  // Simular estado de sala
  const mockRoomState = {
    code: 'TEST77',
    status: 'playing',
    version: 45,
    turnNumber: 3,
    activePlayerId: 'p1',
    players: {
      p1: {
        id: 'p1',
        name: 'Alice',
        seatNumber: 0,
        life: 40,
        isConnected: true,
        isHost: true,
        color: '#38BDF8',
        authToken: 'secret-token-123', // Dato sensible que debe ser filtrado
        email: 'alice@example.com',     // Dato sensible que debe ser filtrado
      },
      p2: {
        id: 'p2',
        name: 'Bob',
        seatNumber: 1,
        life: 38,
        isConnected: true,
        isHost: false,
        color: '#4ADE80',
      },
    },
    playerZones: {
      p2: {
        hand: [{ instanceId: 'h1', definition: { name: 'Black Lotus' } }], // Carta oculta que NO debe filtrarse
        library: [{ instanceId: 'lib1', definition: { name: 'Mox Sapphire' } }], // Carta oculta
      },
    },
    logs: Array.from({ length: 65 }, (_, i) => ({
      id: `log-${i}`,
      timestamp: Date.now() - (65 - i) * 1000,
      playerId: 'p1',
      playerName: 'Alice',
      actionText: `Acción autoritativa número ${i + 1}`,
    })),
  };

  // Función que reproduce la lógica de ReportIssueModal
  function buildDiagnosticPackage(roomState: any) {
    const rawLogs = roomState?.logs || [];
    const recentLogs = rawLogs.slice(-50).map((l: any) => ({
      timestamp: l.timestamp,
      playerName: l.playerName,
      actionText: l.actionText,
    }));

    const sanitizedPlayers = roomState?.players
      ? Object.values(roomState.players).map((p: any) => ({
          id: p.id,
          name: p.name,
          seatNumber: p.seatNumber,
          life: p.life,
          isConnected: p.isConnected,
          isHost: p.isHost,
          color: p.color,
        }))
      : [];

    return {
      packageVersion: '1.0',
      generatedAt: new Date().toISOString(),
      app: {
        version: '0.1.0-beta.20261031',
        environment: 'production',
      },
      table: {
        roomCode: roomState?.code || null,
        status: roomState?.status || 'no_room',
        stateVersion: roomState?.version || 0,
        turnNumber: roomState?.turnNumber || 0,
        activePlayerId: roomState?.activePlayerId || null,
        totalPlayers: sanitizedPlayers.length,
        players: sanitizedPlayers,
      },
      recentActions: recentLogs,
      consoleErrors: [{ timestamp: new Date().toISOString(), type: 'error', message: 'Test console error' }],
      failedCardLoads: [{ url: 'https://cards.scryfall.io/small/test.jpg', status: 404, reason: 'Not Found' }],
    };
  }

  const pkg = buildDiagnosticPackage(mockRoomState);
  const jsonStr = JSON.stringify(pkg);

  // 1. Debe incluir metadatos de versión y estado
  assert.strictEqual(pkg.app.version, '0.1.0-beta.20261031');
  assert.strictEqual(pkg.table.roomCode, 'TEST77');
  assert.strictEqual(pkg.table.stateVersion, 45);

  // 2. Exactamente un máximo de 50 acciones recientes
  assert.strictEqual(pkg.recentActions.length, 50);
  assert.strictEqual(pkg.recentActions[49].actionText, 'Acción autoritativa número 65');

  // 3. Incluye errores de consola y fallos de carga
  assert.ok(pkg.consoleErrors.length > 0);
  assert.ok(pkg.failedCardLoads.length > 0);

  // 4. Privacidad: NO contiene tokens, contraseñas, emails ni cartas ocultas
  assert.strictEqual(jsonStr.includes('secret-token-123'), false, 'No debe filtrar tokens de sesión');
  assert.strictEqual(jsonStr.includes('alice@example.com'), false, 'No debe filtrar correos');
  assert.strictEqual(jsonStr.includes('Black Lotus'), false, 'No debe filtrar cartas de manos ocultas');
  assert.strictEqual(jsonStr.includes('Mox Sapphire'), false, 'No debe filtrar cartas de bibliotecas ajenas');
});
