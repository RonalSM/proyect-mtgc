import React, { useState, useEffect } from 'react';
import { MTG_KEYWORDS, MTG_COUNTERS } from '@mtgc/shared';
import {
  MtgKeywordIcon,
  MtgCounterIcon,
  MtgSymbolIcon,
  KeyruneSetIcon,
  KEYWORD_ICON_CLASSES,
  COUNTER_ICON_CLASSES,
} from '../utils/mana-icons';

export const FontGlyphsAudit: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [manaLoaded, setManaLoaded] = useState<boolean>(false);
  const [keyruneLoaded, setKeyruneLoaded] = useState<boolean>(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setManaLoaded(document.fonts.check('14px Mana'));
      setKeyruneLoaded(document.fonts.check('14px Keyrune'));
    });
  }, []);

  return (
    <div
      data-testid="font-glyphs-audit-container"
      className="fixed inset-0 z-[100] bg-slate-950/95 overflow-y-auto p-6 text-slate-100 font-sans"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Status */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-black text-amber-400">
              Auditoría de Glifos: Fuentes Mana &amp; Keyrune (Punto 4)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Verificación de auto-alojamiento, CSP compliance y renderizado de glifos vectoriales
              sin CDN.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
            >
              Cerrar
            </button>
          )}
        </div>

        {/* Font Loading Status Checks */}
        <div className="grid grid-cols-2 gap-4">
          <div
            data-testid="status-mana-font"
            className={`p-3 rounded-xl border flex items-center justify-between ${
              manaLoaded
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
            }`}
          >
            <span className="font-semibold text-xs">
              Fuente &ldquo;Mana&rdquo; (document.fonts.check):
            </span>
            <span className="font-mono font-bold text-xs">
              {manaLoaded ? '✓ CARGADA (14px Mana)' : '✗ PENDIENTE'}
            </span>
          </div>

          <div
            data-testid="status-keyrune-font"
            className={`p-3 rounded-xl border flex items-center justify-between ${
              keyruneLoaded
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
            }`}
          >
            <span className="font-semibold text-xs">
              Fuente &ldquo;Keyrune&rdquo; (document.fonts.check):
            </span>
            <span className="font-mono font-bold text-xs">
              {keyruneLoaded ? '✓ CARGADA (14px Keyrune)' : '✗ PENDIENTE'}
            </span>
          </div>
        </div>

        {/* Sección 1: Palabras Clave Oficiales (ms-ability-*) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-3">
            1. Palabras Clave Oficiales (Clases ms-ability-*)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {MTG_KEYWORDS.map(kw => {
              const cls = KEYWORD_ICON_CLASSES[kw.id] || 'ms ms-ability-static';
              return (
                <div
                  key={kw.id}
                  data-testid={`glyph-card-kw-${kw.id}`}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center space-x-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400">
                    <span
                      data-testid={`glyph-kw-${kw.id}`}
                      className="inline-flex items-center justify-center"
                    >
                      <MtgKeywordIcon keyword={kw.id} className="text-lg" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{kw.nameEs}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{kw.nameEn}</div>
                    <div className="text-[9px] text-amber-400/80 font-mono truncate">{cls}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección 2: Contadores Oficiales (ms-counter-* y SVG propio) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-3">
            2. Contadores Oficiales (Clases ms-counter-* y Vector Propio)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {MTG_COUNTERS.map(c => {
              const cls = COUNTER_ICON_CLASSES[c.id];
              return (
                <div
                  key={c.id}
                  data-testid={`glyph-card-counter-${c.id}`}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center space-x-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center flex-shrink-0 text-purple-300">
                    <span
                      data-testid={`glyph-counter-${c.id}`}
                      className="inline-flex items-center justify-center"
                    >
                      <MtgCounterIcon counterType={c.id} className="text-lg" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{c.nameEs}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{c.id}</div>
                    <div className="text-[9px] text-purple-400/80 font-mono truncate">
                      {cls || 'SVG Vector Propio'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección 3: Símbolos de Maná, Girar y Acciones Oficiales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-3">
            3. Símbolos de Maná, Girar, Lealtad y Recursos
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { sym: '{W}', label: 'Blanco' },
              { sym: '{U}', label: 'Azul' },
              { sym: '{B}', label: 'Negro' },
              { sym: '{R}', label: 'Rojo' },
              { sym: '{G}', label: 'Verde' },
              { sym: '{C}', label: 'Incoloro' },
              { sym: '{X}', label: 'Coste X' },
              { sym: '{T}', label: 'Girar' },
              { sym: '{Q}', label: 'Desgirar' },
              { sym: '{E}', label: 'Energía' },
              { sym: '{W/U}', label: 'Híbrido' },
              { sym: '{2/B}', label: 'Híbrido 2/B' },
              { sym: '{G/P}', label: 'Pirexiano' },
            ].map(item => (
              <div
                key={item.sym}
                data-testid={`glyph-card-symbol-${item.sym.replace(/[{}/]/g, '')}`}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center space-x-2"
              >
                <MtgSymbolIcon symbol={item.sym} size="md" />
                <span className="text-xs font-mono text-slate-300 font-bold">{item.sym}</span>
                <span className="text-[10px] text-slate-400">({item.label})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sección 4: Símbolos de Set / Expansiones (Keyrune ss-*) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-3">
            4. Símbolos de Set y Expansiones (Keyrune ss-*)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { code: 'cmd', name: 'Commander Original', rarity: 'mythic' },
              { code: 'c21', name: 'Commander 2021', rarity: 'rare' },
              { code: 'neo', name: 'Kamigawa Neon', rarity: 'uncommon' },
              { code: 'mh3', name: 'Modern Horizons 3', rarity: 'mythic' },
            ].map(s => (
              <div
                key={s.code}
                data-testid={`glyph-card-set-${s.code}`}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-3"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-xl">
                  <KeyruneSetIcon setCode={s.code} rarity={s.rarity} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{s.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {s.code.toUpperCase()} &bull; {s.rarity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
