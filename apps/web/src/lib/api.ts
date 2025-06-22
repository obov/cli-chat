const API_BASE = '/api';

// Generate or get session ID
const getSessionId = () => {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

export const api = {
  async getSession() {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`);
    if (!res.ok) {
      // If session doesn't exist, return default
      return { sessionId, messages: [], messageCount: 0 };
    }
    return res.json();
  },

  async getTools() {
    const res = await fetch(`${API_BASE}/tools`);
    if (!res.ok) throw new Error('Failed to get tools');
    return res.json();
  },

  async sendMessage(message: string) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  async updateSettings(formData: FormData) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async getChatHistory() {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/chat/history?sessionId=${sessionId}`);
    if (!res.ok) {
      return [];
    }
    return res.json();
  },

  async clearSession() {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear session');
    return res.ok;
  },
};