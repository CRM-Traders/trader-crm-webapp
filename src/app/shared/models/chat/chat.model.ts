// Enums matching backend
export enum ChatType {
  ClientToOperator = 1,
  OperatorToOperator = 2,
  OperatorGroup = 3,
}

export enum UserType {
  Client = 1,
  Operator = 2,
}

export enum MessageType {
  Text = 1,
  File = 2,
}

// DTOs matching backend
export interface ChatDto {
  id: string;
  chatType: ChatType;
  groupName?: string;
  createdAt: string;
  participants: ChatParticipantDto[];
  lastMessage?: MessageDto;
  unreadCount: number;
}

export interface ChatParticipantDto {
  id: string;
  userId: string;
  userType: UserType;
  joinedAt: string;
  isActive: boolean;
}

export interface MessageDto {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  sentAt: string;
  updatedAt?: string;
  isEdited: boolean;
  isDeleted: boolean;
  files: MessageFileDto[];
  senderName?: string; // We'll add this locally
}

export interface MessageFileDto {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ChatMessagesResponse {
  messages: MessageDto[];
  totalCount: number;
  pageSize: number;
  pageNumber: number;
}

// Request DTOs
export interface CreateClientToOperatorChatRequest {
  initialMessage: string;
}

export interface CreateOperatorToOperatorChatRequest {
  targetOperatorId: string;
  initialMessage?: string;
}

export interface CreateOperatorGroupChatRequest {
  groupName: string;
  operatorIds: string[];
}

export interface SendMessageRequest {
  chatId: string;
  content: string;
  messageType: MessageType;
  fileIds?: string[];
}

export interface EditMessageRequest {
  content: string;
}

export interface AddParticipantsRequest {
  operatorIds: string[];
}

// SignalR Events
export interface MessageReceivedEvent {
  chatId: string;
  message: MessageDto;
}

export interface MessageEditedEvent {
  chatId: string;
  messageId: string;
  content: string;
  updatedAt: string;
}

export interface MessageDeletedEvent {
  chatId: string;
  messageId: string;
  deletedAt: string;
}

export interface UserTypingEvent {
  chatId: string;
  userId: string;
  isTyping: boolean;
}

export interface ChatReadEvent {
  chatId: string;
  userId: string;
  readAt: string;
}

// Local interfaces for UI
export interface OperatorItem {
  id: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  chatId?: string;
}

export interface ClientItem {
  id: string;
  userId?: string;
  name: string;
  email: string;
  status?: 'online' | 'offline';
  chatId?: string;
}
