'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Input, Badge, Card, Button, message as antdMessage } from 'antd';
import { listConversationsForUser, listMessages, markConversationRead, sendMessage, sendMessageInConversation, listRecipients } from '@/actions/messages';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

type ThreadState = {
  conversationId: string | null;
  messages: Awaited<ReturnType<typeof listMessages>>;
  loading: boolean;
};

const menuGroups = getMenuGroupsForRoles(['parent']);

export default function ParentMessagesPage() {
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inbox, setInbox] = useState<Awaited<ReturnType<typeof listConversationsForUser>>>([]);
  const [query, setQuery] = useState('');

  const [thread, setThread] = useState<ThreadState>({ conversationId: null, messages: [], loading: false });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const [recipients, setRecipients] = useState<Awaited<ReturnType<typeof listRecipients>>>([]);
  const [newToUserId, setNewToUserId] = useState<string>('');
  const [newBody, setNewBody] = useState('');
  const [newSending, setNewSending] = useState(false);

  async function refreshInbox() {
    setInboxLoading(true);
    try {
      const rows = await listConversationsForUser();
      setInbox(rows);
    } catch (e: any) {
      antdMessage.error(e?.message || 'Error cargando conversaciones');
    } finally {
      setInboxLoading(false);
    }
  }

  async function openConversation(conversationId: string) {
    setThread((t) => ({ ...t, conversationId, loading: true }));
    try {
      const msgs = await listMessages(conversationId);
      setThread({ conversationId, messages: msgs, loading: false });
      await markConversationRead(conversationId);
      await refreshInbox();
    } catch (e: any) {
      setThread((t) => ({ ...t, loading: false }));
      antdMessage.error(e?.message || 'No se pudo abrir la conversación');
    }
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    if (!thread.conversationId) {
      antdMessage.warning('Selecciona una conversación');
      return;
    }

    const currentConversationId = thread.conversationId;

    if (sending) return;

    setSending(true);
    try {
      const res = await sendMessageInConversation({ conversationId: currentConversationId, body });
      if (!res?.messageId) throw new Error('No se recibió messageId del servidor');

      setDraft('');

      // Force a re-fetch after send and verify the created message is present.
      const msgs = await listMessages(currentConversationId);
      const found = msgs.some((m) => m.id === res.messageId);
      if (!found) throw new Error('El mensaje se envió, pero no aparece en la conversación (re-fetch)');

      setThread({ conversationId: currentConversationId, messages: msgs, loading: false });
      await markConversationRead(currentConversationId);
      await refreshInbox();
    } catch (e: any) {
      antdMessage.error(e?.message || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    refreshInbox();
    listRecipients()
      .then(setRecipients)
      .catch(() => setRecipients([]));
  }, []);

  const filteredInbox = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inbox;
    return inbox.filter((c) => {
      const name = c.otherUser?.fullName?.toLowerCase() ?? '';
      const email = c.otherUser?.email?.toLowerCase() ?? '';
      const last = c.lastMessage?.body?.toLowerCase() ?? '';
      return name.includes(q) || email.includes(q) || last.includes(q);
    });
  }, [inbox, query]);

  return (
    <DashboardLayout
      roleTitle="Tutor / Padre"
      userName="Familia"
      userRole="Tutor"
      menuGroups={menuGroups}
      breadcrumbs={['Familia', 'Mensajes']}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-1"
          title="Bandeja"
          extra={<Button onClick={refreshInbox}>Refrescar</Button>}
        >
          <div className="mb-3 p-3 rounded-lg border border-gray-100 bg-white">
            <div className="font-medium text-sm mb-2">Nuevo mensaje</div>
            <select
              className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm mb-2"
              value={newToUserId}
              onChange={(e) => setNewToUserId(e.target.value)}
            >
              <option value="">Selecciona destinatario...</option>
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName} ({r.email})
                </option>
              ))}
            </select>
            <Input.TextArea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Escribe tu mensaje inicial..."
              autoSize={{ minRows: 2, maxRows: 4 }}
              className="mb-2"
            />
            <Button
              block
              type="primary"
              loading={newSending}
              onClick={async () => {
                const toUserId = newToUserId;
                const body = newBody.trim();
                if (!toUserId) return antdMessage.warning('Selecciona destinatario');
                if (!body) return antdMessage.warning('Escribe un mensaje');

                setNewSending(true);
                try {
                  const res = await sendMessage({ toUserId, body });
                  setNewToUserId('');
                  setNewBody('');
                  await refreshInbox();
                  await openConversation(res.conversationId);
                } catch (e: any) {
                  antdMessage.error(e?.message || 'No se pudo crear la conversación');
                } finally {
                  setNewSending(false);
                }
              }}
            >
              Enviar
            </Button>
          </div>

          <Input placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} className="mb-3" />
          {inboxLoading ? (
            <div className="text-center py-4 text-gray-400">Cargando...</div>
          ) : filteredInbox.length === 0 ? (
            <div className="text-center py-4 text-gray-400">Sin conversaciones</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredInbox.map((item) => (
                <div
                  key={item.conversationId}
                  onClick={() => openConversation(item.conversationId)}
                  className="py-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.otherUser?.fullName ?? 'Conversación'}</span>
                    <Badge count={item.unreadCount} />
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {item.lastMessage ? item.lastMessage.body : 'Sin mensajes'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2" title="Conversación">
          {!thread.conversationId ? (
            <div className="text-gray-500">Selecciona una conversación.</div>
          ) : (
            <>
              <div className="h-[420px] overflow-auto border border-gray-100 rounded-lg p-3 mb-3 bg-white">
                {thread.loading ? (
                  <div className="text-gray-500">Cargando...</div>
                ) : thread.messages.length === 0 ? (
                  <div className="text-gray-500">Sin mensajes.</div>
                ) : (
                  <div className="space-y-2">
                    {thread.messages.map((m) => (
                      <div key={m.id} className="p-2 rounded-lg bg-gray-50">
                        <div className="text-xs text-gray-500">{m.sender.fullName}</div>
                        <div className="text-sm text-gray-900">{m.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Input.TextArea
                  data-testid="reply-body"
                  id="reply-body"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <Button
                  data-testid="reply-send"
                  type="primary"
                  loading={sending}
                  disabled={!draft.trim() || sending}
                  onClick={handleSend}
                >
                  Enviar
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
