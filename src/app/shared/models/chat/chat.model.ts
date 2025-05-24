// src/app/core/models/chat.model.ts

export interface ChatUser {
  id: string;
  username: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: Date;
  read: boolean;
  conversationId: string;
}

export interface ChatConversation {
  id: string;
  participants: ChatUser[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: Date;
}

export interface ChatNotification {
  conversationId: string;
  messageId: string;
  senderUsername: string;
  preview: string;
  timestamp: Date;
}
