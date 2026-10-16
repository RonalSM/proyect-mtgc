import React, { useState } from 'react';
import type { PlayerState, GameActionType } from '@mtgc/shared';
import { Heart, Plus, Minus, Swords, Skull, Shield, ChevronDown, ChevronUp } from 'lucide-react';

interface PlayerCardProps {
  player: PlayerState;
  isLocalPlayer: boolean;
  isActiveTurn: boolean;
  allPlayers: PlayerState[];
  onAction: (type: GameActionType, payload: unknown) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isLocalPlayer,
  isActiveTurn,
  allPlayers,
  onAction,
}) => {
  const [showCommanderDamage, setShowCommanderDamage] = useState(false);
  const [isEditingLife, setIsEditingLife] = useState(false);
  const [customLife, setCustomLife] = useState(player.life.toString());

  const adjustLife = (delta: number) => {
    onAction('ADJUST_LIFE', {
      playerId: player.id,
      delta,
    });
  };

  const adjustPoison = (delta: number) => {
    onAction('SET_PLAYER_COUNTER', {
      playerId: player.id,
      counterType: 'poison',
      delta,
    });
  };

  const adjustTax = (delta: number) => {
    onAction('SET_PLAYER_COUNTER', {
      playerId: player.id,
      counterType: 'commanderTax',
      delta,
    });
  };

  const adjustCommanderDamage = (sourceCommanderId: string, delta: number) => {
    onAction('COMMANDER_DAMAGE', {
      targetPlayerId: player.id,
      sourceCommanderInstanceId: sourceCommanderId,
      delta,
    });
  };

  return (
    <div
      className={`relative bg-slate-900 border rounded-2xl p-4 shadow-xl transition-all ${
        player.isAtRisk && !player.isEliminated
          ? 'border-rose-500/80 ring-2 ring-rose-500/30'
          : isActiveTurn
          ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-amber-500/10'
          : 'border-slate-800'
      } ${player.isEliminated ? 'opacity-60 saturate-50' : ''}`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-bold flex items-center justify-center text-slate-300">
            #{player.seatNumber + 1}
          </span>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center space-x-1.5 leading-none">
              <span>{player.name}</span>
              {isLocalPlayer && (
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.2 rounded font-medium">
                  Tú
                </span>
              )}
              {player.isHost && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-medium">
                  Host
                </span>
              )}
            </h3>
            <span className="text-[10px] text-slate-400">
              Mano: {player.handCount} &bull; Biblio: {player.libraryCount}
            </span>
          </div>
        </div>

        {/* Risk / Elimination Badges & Controls */}
        <div className="flex items-center space-x-1.5">
          {player.isAtRisk && !player.isEliminated && (
            <>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold animate-pulse">
                ⚠️ En riesgo ({player.riskReason || 'derrota'})
              </span>
              <button
                onClick={() =>
                  onAction('SET_PLAYER_STATUS', {
                    playerId: player.id,
                    isEliminated: true,
                    reason: player.riskReason || 'derrota',
                  })
                }
                className="text-[10px] bg-rose-600 hover:bg-rose-500 text-white px-2 py-0.5 rounded font-bold transition-colors"
                title="Eliminar jugador manualmente"
              >
                Eliminar
              </button>
            </>
          )}

          {player.isEliminated && (
            <>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
                Derrotado ({player.eliminationReason || 'manual'})
              </span>
              <button
                onClick={() =>
                  onAction('SET_PLAYER_STATUS', {
                    playerId: player.id,
                    isEliminated: false,
                  })
                }
                className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded font-bold transition-colors"
                title="Revivir jugador"
              >
                Revivir
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Life Box */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center shadow-inner">
        <div className="flex items-center space-x-1.5 text-rose-400 mb-1">
          <Heart className="w-4 h-4 fill-rose-500/30 text-rose-400" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">Vida</span>
        </div>

        {isEditingLife ? (
          <form
            onSubmit={e => {
              e.preventDefault();
              const val = parseInt(customLife, 10);
              if (!isNaN(val)) {
                onAction('SET_LIFE', { playerId: player.id, life: val });
              }
              setIsEditingLife(false);
            }}
            className="flex items-center space-x-1 my-1"
          >
            <input
              type="number"
              value={customLife}
              onChange={e => setCustomLife(e.target.value)}
              autoFocus
              className="w-20 px-2 py-1 text-2xl font-black text-center bg-slate-900 border border-amber-400 rounded text-white focus:outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setIsEditingLife(false)}
              className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs"
            >
              ✕
            </button>
          </form>
        ) : (
          <div
            onClick={() => {
              setCustomLife(player.life.toString());
              setIsEditingLife(true);
            }}
            title="Clic para fijar vida directamente (SET_LIFE)"
            className="text-5xl font-black tracking-tight text-white my-1 cursor-pointer hover:text-amber-300 transition-colors"
          >
            {player.life}
          </div>
        )}

        {/* Life Controls (se quitan +-5 según Punto 7) */}
        <div className="flex items-center space-x-2 mt-2">
          <button
            onClick={() => adjustLife(-1)}
            title="Restar 1 vida"
            className="w-9 h-9 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 flex items-center justify-center text-rose-300 hover:text-white transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => adjustLife(1)}
            title="Sumar 1 vida"
            className="w-9 h-9 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 flex items-center justify-center text-emerald-300 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fast Badges: Poison & Commander Tax */}
      <div className="flex items-center justify-between mt-3 text-xs">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => adjustPoison(1)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md border ${
              player.counters.poison > 0
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            <span>Veneno: {player.counters.poison}/10</span>
          </button>
          {player.counters.poison > 0 && (
            <button
              onClick={() => adjustPoison(-1)}
              className="text-[10px] text-slate-500 hover:text-white px-1"
            >
              -1
            </button>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => adjustTax(2)}
            className="flex items-center space-x-1 px-2 py-1 rounded-md border bg-slate-950 border-slate-800 text-amber-300 hover:border-amber-500/40"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Tax: +{player.counters.commanderTax}</span>
          </button>
          {player.counters.commanderTax > 0 && (
            <button
              onClick={() => adjustTax(-2)}
              className="text-[10px] text-slate-500 hover:text-white px-1"
            >
              -2
            </button>
          )}
        </div>
      </div>

      {/* Custom Named Counters (REQ-5.3) */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/60">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-400 font-semibold">Contadores personalizados</span>
          <button
            onClick={() => {
              const name = prompt('Nombre del contador (ej. Rads, Boleto, etc.):');
              if (name && name.trim()) {
                onAction('SET_PLAYER_COUNTER', {
                  playerId: player.id,
                  counterType: name.trim(),
                  delta: 1,
                });
              }
            }}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700 transition-colors"
          >
            + Añadir
          </button>
        </div>

        {player.counters?.custom && Object.keys(player.counters.custom).length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {Object.entries(player.counters.custom).map(([name, count]) => (
              <div
                key={name}
                className="flex items-center space-x-1 bg-slate-950 border border-slate-800 text-xs px-2 py-0.5 rounded-md"
              >
                <span className="text-slate-300 font-medium">
                  {name}: {count}
                </span>
                <button
                  onClick={() =>
                    onAction('SET_PLAYER_COUNTER', {
                      playerId: player.id,
                      counterType: name,
                      delta: -1,
                    })
                  }
                  className="text-[10px] text-slate-500 hover:text-white px-0.5"
                >
                  -
                </button>
                <button
                  onClick={() =>
                    onAction('SET_PLAYER_COUNTER', {
                      playerId: player.id,
                      counterType: name,
                      delta: 1,
                    })
                  }
                  className="text-[10px] text-slate-500 hover:text-white px-0.5"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Commander Damage Collapsible */}
      <div className="mt-3 border-t border-slate-800/80 pt-2">
        <button
          onClick={() => setShowCommanderDamage(prev => !prev)}
          className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-1"
        >
          <span className="flex items-center space-x-1 text-amber-400/90 font-semibold">
            <Swords className="w-3.5 h-3.5" />
            <span>Daño de Comandante recibido</span>
          </span>
          {showCommanderDamage ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {showCommanderDamage && (
          <div className="mt-2 space-y-1.5 bg-slate-950/80 rounded-lg p-2 border border-slate-800">
            {allPlayers
              .filter(other => other.id !== player.id && !other.isSpectator)
              .map(opponent => {
                const dmg = player.commanderDamage[opponent.id] ?? 0;
                return (
                  <div
                    key={opponent.id}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-900/60"
                  >
                    <span className="text-slate-300 truncate max-w-[120px]">{opponent.name}</span>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-bold ${dmg >= 21 ? 'text-rose-400' : 'text-amber-200'}`}
                      >
                        {dmg}/21
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => adjustCommanderDamage(opponent.id, -1)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-[10px] text-slate-300"
                        >
                          -
                        </button>
                        <button
                          onClick={() => adjustCommanderDamage(opponent.id, 1)}
                          className="w-5 h-5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center justify-center text-[10px]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
