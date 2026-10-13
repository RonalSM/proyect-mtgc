import test from 'node:test';
import assert from 'node:assert';
import { RoomManager } from '../src/game/room-manager.js';

test('RoomManager - KICK_PLAYER and TRANSFER_HOST (REQ-13.2, REQ-13.3 / Paso 2A.4)', () => {
  const rm = new RoomManager();

  // 1. Host creates room
  const session = rm.createRoom({
    name: 'Moderation Test Pod',
    hostName: 'AliceHost',
    hostId: 'host_alice',
    maxPlayers: 4,
    startingLife: 40,
  });

  const roomCode = session.state.code;

  // 2. Bob and Charlie join
  rm.joinRoom(roomCode, {
    playerId: 'p_bob',
    playerName: 'BobPlayer',
    isSpectator: false,
  });

  rm.joinRoom(roomCode, {
    playerId: 'p_charlie',
    playerName: 'CharliePlayer',
    isSpectator: false,
  });

  assert.strictEqual(Object.keys(session.state.players).length, 3);
  assert.strictEqual(session.state.players['host_alice']?.isHost, true);
  assert.strictEqual(session.state.players['p_bob']?.isHost, false);

  // 3. Non-host attempts to kick Bob -> must fail
  assert.throws(() => {
    rm.kickPlayer(roomCode, 'p_bob', { playerId: 'p_charlie' });
  }, /Solo el anfitrión puede expulsar jugadores/);

  // 4. Host cannot kick self
  assert.throws(() => {
    rm.kickPlayer(roomCode, 'host_alice', { playerId: 'host_alice' });
  }, /El anfitrión no puede expulsarse a sí mismo/);

  // 5. Host kicks Bob successfully
  const kickResult = rm.kickPlayer(roomCode, 'host_alice', { playerId: 'p_bob', reason: 'AFK' });
  assert.strictEqual(kickResult.kickedPlayerId, 'p_bob');
  assert.strictEqual(kickResult.kickedPlayerName, 'BobPlayer');
  assert.strictEqual(session.state.players['p_bob'], undefined);
  assert.strictEqual(session.state.playerZones['p_bob'], undefined);
  assert.strictEqual(Object.keys(session.state.players).length, 2);

  // 6. Non-host attempts to transfer host -> must fail
  assert.throws(() => {
    rm.transferHost(roomCode, 'p_charlie', { newHostId: 'p_charlie' });
  }, /Solo el anfitrión actual puede transferir el rol de anfitrión/);

  // 7. Alice transfers host to Charlie
  const transferResult = rm.transferHost(roomCode, 'host_alice', { newHostId: 'p_charlie' });
  assert.strictEqual(transferResult.newHostId, 'p_charlie');
  assert.strictEqual(session.state.players['host_alice']?.isHost, false);
  assert.strictEqual(session.state.players['p_charlie']?.isHost, true);
  assert.strictEqual(session.state.hostId, 'p_charlie');

  // 8. Now Charlie is host and can kick Alice
  const charlieKick = rm.kickPlayer(roomCode, 'p_charlie', { playerId: 'host_alice' });
  assert.strictEqual(charlieKick.kickedPlayerId, 'host_alice');
  assert.strictEqual(session.state.players['host_alice'], undefined);
  assert.strictEqual(Object.keys(session.state.players).length, 1);
});
