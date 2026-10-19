import React, { useState, useRef, useEffect } from 'react';
import type { GameLogEntry, GameActionType } from '@mtgc/shared';
import { Send, History, MessageSquare, X } from 'lucide-react';

interface GameLogAndChatProps {
  logs: GameLogEntry[];
  onAction: (type: GameActionType, payload: unknown) => void;
  onClose?: () => void;
}

export const GameLogAndChat: React.FC<GameLogAndChatProps> = ({ logs, onAction, onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'chat'>('all');
  const [chatInput, setChatInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const reactionsRef = useRef<HTMLDivElement>(null);

  const handleReactionsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (reactionsRef.current && e.deltaY !== 0) {
      reactionsRef.current.scrollLeft += e.deltaY;
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    onAction('CHAT_MESSAGE', {
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  const filteredLogs =
    activeTab === 'chat' ? logs.filter(l => l.actionText.startsWith('💬')) : logs;

  return (
    <div
      data-testid="chat-log-panel"
      className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3 h-3" />
            <span>Acciones</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'chat'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Chat</span>
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Logs / Chat Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-sans dark-custom-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">Sin actividad reciente</div>
        ) : (
          filteredLogs.map(log => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const isChat = log.actionText.startsWith('💬');
            return (
              <div
                key={log.id}
                className={`p-2 rounded-lg leading-relaxed ${
                  isChat
                    ? 'bg-sky-950/30 border border-sky-800/40 text-sky-200'
                    : 'bg-slate-950/70 border border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                  <span className="font-semibold text-slate-400">{log.playerName}</span>
                  <span>{timeStr}</span>
                </div>
                <div>{log.actionText}</div>
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>

      {/* Quick Reactions Bar / Grid (REQ-12.2: cuadrícula o desplazable por rueda) */}
      <div
        ref={reactionsRef}
        onWheel={handleReactionsWheel}
        className="px-2.5 py-1.5 border-t border-slate-800/80 bg-slate-950/90 grid grid-cols-3 gap-1 overflow-x-auto dark-custom-scrollbar"
      >
        {[
          '⚡ Respóndeme',
          '⏭️ Pasar prioridad',
          '🎯 Tengo respuesta',
          '👍 Listo',
          '🤔 Pensando...',
          '💥 En respuesta',
        ].map(reaction => (
          <button
            key={reaction}
            type="button"
            onClick={() => onAction('CHAT_MESSAGE', { message: reaction })}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 hover:border-amber-500/50 border border-slate-800 text-[10px] text-slate-300 hover:text-amber-300 transition-all active:scale-95 text-center truncate flex items-center justify-center font-medium"
            title={reaction}
          >
            {reaction}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={handleSendChat}
        className="p-2.5 border-t border-slate-800 bg-slate-950/80 flex space-x-2"
      >
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder="Escribe un mensaje en la mesa..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
        />
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
