import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL_PUBLIC || '';

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: {
    name: string;
    role: string;
    avatar: string | null;
  };
}

interface Location {
  id: string;
  name: string;
}

export default function AdminChatWidget() {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string>('global');

  // Set initial location for STAFF
  useEffect(() => {
    if (user?.role === 'STAFF' && user.locationId) {
      setActiveLocationId(user.locationId);
    }
  }, [user]);

  // Fetch locations for SUPER_ADMIN / MANAGER
  useEffect(() => {
    if (!token || user?.role === 'STAFF') return;
    fetch('/api/locations?limit=100', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setLocations(res.data);
        }
      })
      .catch(err => console.error('Failed to fetch locations', err));
  }, [token, user]);

  // Fetch history when activeLocationId changes
  useEffect(() => {
    if (!token) return;
    const url = activeLocationId === 'global' ? '/api/chat/messages' : `/api/chat/messages?locationId=${activeLocationId}`;
    
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessages(data.data);
          scrollToBottom();
        }
      })
      .catch(err => console.error('Failed to fetch chat messages', err));
  }, [token, activeLocationId]);

  // Setup Socket.io
  useEffect(() => {
    if (!token || !user) return;

    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:chat', { locationId: activeLocationId });
    });

    socket.on('chat:newMessage', (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      setIsOpen(prevIsOpen => {
        if (!prevIsOpen) {
          setUnreadCount(prev => prev + 1);
        }
        return prevIsOpen;
      });
    });

    return () => {
      socket.emit('leave:chat', { locationId: activeLocationId });
      socket.disconnect();
    };
  }, [token, user, activeLocationId]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
  const { t } = useTranslation();

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !token) return;

    const currentInput = input.trim();
    setInput('');

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: currentInput,
          locationId: activeLocationId
        })
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Failed to send message:', data.message);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden mb-4 transition-all duration-300">
          {/* Header */}
          <div className="bg-primary-600 text-white px-4 py-3 flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="font-semibold text-sm">{t('autoGen.admin.key1')}</h3>
              {(user.role === 'SUPER_ADMIN' || user.role === 'MANAGER') && (
                <select
                  value={activeLocationId}
                  onChange={(e) => setActiveLocationId(e.target.value)}
                  className="mt-1 text-xs bg-primary-700 text-white border-transparent rounded px-1 py-0.5 focus:ring-0 cursor-pointer max-w-[150px]"
                >
                  <option value="global">{t('autoGen.admin.key2')}</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              )}
              {user.role === 'STAFF' && user.locationId && (
                <span className="text-xs text-primary-200 mt-0.5">{t('autoGen.admin.key3')}</span>
              )}
            </div>
            <button onClick={() => setIsOpen(false)} className="text-primary-100 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
            {messages.map((msg, index) => {
              const isMe = msg.senderId === user.id;
              const showName = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);
              return (
                <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showName && (
                    <span className="text-xs text-gray-500 mb-1 ml-1">{msg.sender?.name}</span>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary-500 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'}`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('autoGen.admin.key4')}
              className="flex-1 bg-gray-100 border-transparent rounded-full px-4 py-2 text-sm focus:border-primary-500 focus:bg-white focus:ring-0 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-600 text-white disabled:opacity-50 hover:bg-primary-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center hover:bg-primary-700 transition-transform hover:scale-105 active:scale-95 relative"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
