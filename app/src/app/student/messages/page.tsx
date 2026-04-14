'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Input, message as antdMessage } from 'antd';
import { listConversationsForUser, listMessages, markConversationRead, sendMessage, sendMessageInConversation, listRecipients } from '@/actions/messages';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

type ThreadState = { conversationId: string | null; messages: Awaited<ReturnType<typeof listMessages>>; loading: boolean };

export default function StudentMessagesPage() {
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inbox, setInbox] = useState<Awaited<ReturnType<typeof listConversationsForUser>>>([]);
  const [thread, setThread] = useState<ThreadState>({ conversationId: null, messages: [], loading: false });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<Awaited<ReturnType<typeof listRecipients>>>([]);
  const [newToUserId, setNewToUserId] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newSending, setNewSending] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function refreshInbox() {
    setInboxLoading(true);
    try { const rows = await listConversationsForUser(); setInbox(rows); } catch (e: any) { antdMessage.error(e?.message || 'Error'); } finally { setInboxLoading(false); }
  }

  async function openConversation(conversationId: string) {
    setThread(t => ({ ...t, conversationId, loading: true }));
    try {
      const msgs = await listMessages(conversationId);
      setThread({ conversationId, messages: msgs, loading: false });
      await markConversationRead(conversationId);
      await refreshInbox();
    } catch (e: any) { antdMessage.error(e?.message || 'Error'); setThread(t => ({ ...t, loading: false })); }
  }

  async function handleSend() {
    if (!draft.trim() || !thread.conversationId) return;
    setSending(true);
    try { await sendMessageInConversation({ conversationId: thread.conversationId, body: draft.trim() }); setDraft(''); await openConversation(thread.conversationId); } catch (e: any) { antdMessage.error(e?.message || 'Error'); } finally { setSending(false); }
  }

  async function handleNewSend() {
    if (!newToUserId || !newBody.trim()) return antdMessage.warning('Selecciona destinatario y escribe mensaje');
    setNewSending(true);
    try { await sendMessage({ toUserId: newToUserId, body: newBody.trim() }); setNewBody(''); setNewToUserId(''); setShowNew(false); await refreshInbox(); antdMessage.success('Mensaje enviado'); } catch (e: any) { antdMessage.error(e?.message || 'Error'); } finally { setNewSending(false); }
  }

  useEffect(() => { refreshInbox(); listRecipients().then(setRecipients).catch(() => {}); }, []);

  const selectedConv = thread.conversationId;

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Mensajes']}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg">
          <span className="material-symbols-outlined text-lg">{showNew ? 'close' : 'edit'}</span>
          {showNew ? 'Cancelar' : 'Nuevo'}
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="space-y-3">
            <select value={newToUserId} onChange={e => setNewToUserId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">-- Selecciona destinatario --</option>
              {recipients.map(r => <option key={r.id} value={r.id}>{r.fullName} ({r.roles?.join(', ') || '—'})</option>)}
            </select>
            <textarea value={newBody} onChange={e => setNewBody(e.target.value)} rows={3} placeholder="Escribe tu mensaje..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
            <button onClick={handleNewSend} disabled={newSending} className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50">
              {newSending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '60vh' }}>
        {/* Inbox */}
        <div className="lg:col-span-1 space-y-1">
          {inboxLoading ? (
            <div className="text-center text-gray-400 py-8"><span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span></div>
          ) : inbox.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin conversaciones</p>
          ) : (
            inbox.map(conv => (
              <div key={conv.conversationId} onClick={() => openConversation(conv.conversationId)} className={`p-3 rounded-xl cursor-pointer transition-colors ${selectedConv === conv.conversationId ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-900">{conv.otherUser?.fullName || 'Conversación'}</span>
                  {conv.unreadCount > 0 && <span className="px-2 py-0.5 bg-violet-500 text-white text-xs font-bold rounded-full">{conv.unreadCount}</span>}
                </div>
                {conv.lastMessage && <p className="text-xs text-gray-500 mt-1 truncate">{conv.lastMessage.body}</p>}
              </div>
            ))
          )}
        </div>

        {/* Thread */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">chat</span>
                <p>Selecciona una conversación</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[60vh]">
                {thread.loading ? (
                  <div className="text-center text-gray-400 py-8"><span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span></div>
                ) : (thread.messages as any[]).map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.sender?.id === thread.conversationId ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${msg.sender?.id === thread.conversationId ? 'bg-gray-100 text-gray-900' : 'bg-violet-600 text-white'}`}>
                      <p>{msg.body}</p>
                      <div className={`text-[10px] mt-1 ${msg.sender?.id === thread.conversationId ? 'text-gray-400' : 'text-violet-200'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 flex gap-3">
                <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} placeholder="Escribe un mensaje..." className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                <button onClick={handleSend} disabled={sending || !draft.trim()} className="px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
