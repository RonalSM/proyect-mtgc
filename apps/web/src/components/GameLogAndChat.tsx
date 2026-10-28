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
      className="bg-[#092328] border border-[#12544F] rounded-2xl flex flex-col h-full shadow-2xl overflow-hidden ring-1 ring-[#2A835F]/20"
    >
      {/* Header */}
      <div className="p-3 border-b border-[#12544F] flex items-center justify-between bg-[#040d0f]/80">
        <div className="flex space-x-1 bg-[#0c2d32] p-0.5 rounded-lg border border-[#12544F]">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#2A835F] text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-3 h-3 text-[#8BBB92]" />
            <span>Acciones</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#2A835F] text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3 h-3 text-[#8BBB92]" />
            <span>Chat</span>
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#12544F] text-zinc-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Logs / Chat Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-sans dark-custom-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs italic">Sin actividad reciente</div>
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
                    ? 'bg-[#12544F]/40 border border-[#2A835F]/50 text-[#8BBB92]'
                    : 'bg-[#040d0f]/80 border border-[#12544F] text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5">
                  <span className="font-semibold text-[#8BBB92]">{log.playerName}</span>
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
        className="px-2.5 py-1.5 border-t border-[#12544F] bg-[#040d0f]/90 grid grid-cols-3 gap-1 overflow-x-auto dark-custom-scrollbar"
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
            className="px-2 py-1 rounded-lg bg-[#0c2d32] hover:bg-[#12544F] hover:border-[#8BBB92] border border-[#12544F] text-[10px] text-zinc-300 hover:text-white transition-all active:scale-95 text-center truncate flex items-center justify-center font-medium cursor-pointer"
            title={reaction}
          >
            {reaction}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={handleSendChat}
        className="p-2.5 border-t border-[#12544F] bg-[#040d0f]/80 flex space-x-2"
      >
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder="Escribe un mensaje en la mesa..."
          className="flex-1 bg-[#092328] border border-[#12544F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2A835F] transition-colors placeholder-zinc-500"
        />
        <button
          type="submit"
          className="bg-[#2A835F] hover:bg-[#349e73] text-white p-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow border border-[#8BBB92]/40 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
