import { apiClient } from "./client";

export interface DataChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export const sendDataChatMessage = async (
  messages: DataChatMessage[]
): Promise<{ reply?: string; error?: string }> => {
  try {
    const payload = messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    const { data } = await apiClient.post("/ai/data-chat/", {
      messages: payload,
    });
    return data;
  } catch (error: any) {
    if (error.response?.data?.error) {
      return { error: error.response.data.error };
    }
    return { error: "Failed to connect to AI. Please try again." };
  }
};
