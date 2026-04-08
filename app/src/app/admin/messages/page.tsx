'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Input, List, Badge, Card, Button, message as antdMessage } from 'antd';
import { listConversationsForUser, listMessages, markConversationRead, sendMessage } from '@/actions/messages';

type ThreadState = {
  conversationId: string | null;
  messages: Awaited<ReturnType<typeof listMessages>>;
  loading: boolean;
};

export default function AdminMessagesPage() {
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inbox, setInbox] = useState<Awaited<ReturnType<typeof listConversationsForUser>>>([]);
  const [query, setQuery] = useState('');

  const [thread, setThread] = useState<ThreadState>({ conversationId: null, messages: [], loading: false });
  const [draft, setDraft] = useState('');

  const menuGroups = useMemo(
    () => [
      {
        title: 'Menú Principal',
        items: [
          { key: '1', icon: 'home', label: 'Vista General', href: '/admin' },
          { key: '8', icon: 'mail', label: 'Mensajes', href: '/admin/messages' },
        ],
      },
    ],
    []
  );

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

    // MVP UI: send requires choosing a conversation first.
    // Creating a new conversation (choose recipient) will be added in S02/S03 polish.
    if (!thread.conversationId) {
      antdMessage.warning('Selecciona una conversación');
      return;
    }

    try {
      // Infer the otherUserId from current inbox row
      const row = inbox.find((c) => c.conversationId === thread.conversationId);
      const toUserId = row?.otherUser?.id;
      if (!toUserId) {
        antdMessage.error('No se pudo determinar el destinatario');
        return;
      }

      await sendMessage({ toUserId, body });
      setDraft('');
      await openConversation(thread.conversationId);
    } catch (e: any) {
      antdMessage.error(e?.message || 'No se pudo enviar el mensaje');
    }
  }

  useEffect(() => {
    refreshInbox();
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
      roleTitle="Admin"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Mensajes']}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1" title="Bandeja" extra={<Button onClick={refreshInbox}>Refrescar</Button>}>
          <Input placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} className="mb-3" />
          <List
            loading={inboxLoading}
            dataSource={filteredInbox}
            renderItem={(item) => (
              <List.Item
                onClick={() => openConversation(item.conversationId)}
                className="cursor-pointer"
              >
                <List.Item.Meta
                  title={
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.otherUser?.fullName ?? 'Conversación'}</span>
                      <Badge count={item.unreadCount} />
                    </div>
                  }
                  description={item.lastMessage ? item.lastMessage.body : 'Sin mensajes'}
                />
              </List.Item>
            )}
          />
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
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <Button type="primary" onClick={handleSend}>
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
