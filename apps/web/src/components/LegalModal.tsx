import React from 'react';
import { X, ShieldCheck, HeartHandshake, Lock, Trash2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteAccount?: () => void;
  isLoggedIn?: boolean;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  onDeleteAccount,
  isLoggedIn = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      onDoubleClick={e => {
        e.stopPropagation();
        onClose();
      }}
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onContextMenu={e => e.stopPropagation()}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={e => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-base">
            <ShieldCheck className="w-5 h-5" />
            <span>Avisos Legales y Privacidad</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizards of the Coast Disclaimer */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <HeartHandshake className="w-4 h-4 text-amber-400" />
            <span>Política de Contenido de Fans de Wizards of the Coast</span>
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
            <strong>Mesa Virtual de Commander (MTGC)</strong> es un proyecto no oficial creado por y
            para aficionados, permitido de acuerdo con la <em>Política de Contenido de Fans</em> de
            Wizards of the Coast. Este software no está respaldado, patrocinado ni afiliado de
            ninguna manera con <strong>Wizards of the Coast LLC</strong>, una subsidiaria de Hasbro,
            Inc.
          </p>
        </section>

        {/* Scryfall Attribution */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <Lock className="w-4 h-4 text-sky-400" />
            <span>Atribución de Scryfall API</span>
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
            Toda la información literal y gráfica relacionada con las cartas de Magic: The Gathering
            (incluyendo nombres, costes de maná, textos de reglas y artes) es propiedad exclusiva de
            Wizards of the Coast. Los datos de las cartas se obtienen de manera no comercial a
            través de la API pública de <strong>Scryfall</strong>.
          </p>
        </section>

        {/* Fuentes e Iconografía: Mana y Keyrune */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <HeartHandshake className="w-4 h-4 text-amber-400" />
            <span>Fuentes e Iconografía: Mana Font y Keyrune</span>
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
            Los iconos de símbolos de maná, acciones de girar/desgirar, palabras clave y contadores
            emplean la fuente <strong>Mana</strong> (creada por Andrew Gioia; fuentes bajo SIL OFL 1.1,
            código CSS bajo licencia MIT). Los símbolos de expansiones emplean la fuente <strong>Keyrune</strong>
            (creada por Andrew Gioia; fuentes bajo SIL OFL 1.1, glifos GPL 3.0). Ambas fuentes están auto-alojadas
            localmente en el servidor para cumplir con las directivas de seguridad CSP. Respaldos vectoriales bajo MPL-2.0.
            Consulta el archivo <code>THIRD_PARTY_NOTICES.md</code> en el repositorio para los textos íntegros de las licencias.
          </p>
        </section>

        {/* Privacy & GDPR Right to Deletion */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Política de Privacidad y Eliminación de Cuenta</span>
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
            Respetamos tu privacidad. No comercializamos datos de usuarios, no empleamos
            rastreadores de terceros ni cookies con fines publicitarios. Las contraseñas se
            almacenan mediante algoritmos criptográficos con salt único. Puedes solicitar la
            eliminación completa de tus datos y salas en cualquier momento.
          </p>

          {isLoggedIn && onDeleteAccount && (
            <div className="pt-2">
              <button
                onClick={() => {
                  if (
                    confirm(
                      '¿Estás seguro de que deseas eliminar permanentemente tu cuenta y todos tus datos asociados? Esta acción no se puede deshacer.',
                    )
                  ) {
                    onDeleteAccount();
                  }
                }}
                className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/40 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar mi cuenta permanentemente</span>
              </button>
            </div>
          )}
        </section>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
