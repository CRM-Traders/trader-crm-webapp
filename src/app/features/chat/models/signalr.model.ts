import { MessageType } from './chat.model';

export interface SendMessageRequest {
  chatId: string;
  content: string;
  messageType: MessageType;
  fileUrl?: string;
  fileName?: string;
}

export interface EditMessageRequest {
  content: string;
}

export interface AddParticipantsRequest {
  operatorIds: string[];
}

export interface UserTypingEvent {
  chatId: string;
  userId: string;
  isTyping: boolean;
}
