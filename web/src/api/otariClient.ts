export const OTARI_API_KEY = import.meta.env.VITE_OTARI_API_KEY || "";

export const api = {
  sendChat: async (messages: any[], model: string) => {
    const res = await fetch("/api/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(OTARI_API_KEY && { Authorization: `Bearer ${OTARI_API_KEY}` }),
      },
      body: JSON.stringify({ messages, model }),
    });

    if (!res.ok) throw new Error("Chat failed");
    
    const reader = res.body?.getReader();
    if (!reader) {
      const data = await res.json();
      return data;
    }

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return new TextDecoder().decode(new Uint8Array(chunks));
  },

  getModels: async () => {
    const res = await fetch("/api/v1/models", {
      headers: {
        ...(OTARI_API_KEY && { Authorization: `Bearer ${OTARI_API_KEY}` }),
      },
    });
    if (!res.ok) throw new Error("Failed to get models");
    return res.json();
  },
};