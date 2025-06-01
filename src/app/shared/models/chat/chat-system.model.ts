// src/app/shared/models/chat/chat-system.model.ts

export enum ChatType {
  CustomerSupport = 1,
  PersonToPerson = 2,
  GroupChat = 3,
}

export enum MessageType {
  Text = 1,
  Image = 2,
  File = 3,
  System = 4,
  Typing = 5,
}

export enum OperatorStatus {
  Online = 1,
  Away = 2,
  Busy = 3,
  Offline = 4,
}

export enum ParticipantRole {
  Member = 1,
  Moderator = 2,
  Admin = 3,
}

export interface CreateChatCommand {
  title: string;
  type: ChatType;
  description?: string | null;
  priority?: number;
  targetOperatorId?: string | null;
}

export interface ChatSummaryDto {
  id: string;
  title: string;
  type: string;
  status: string;
  initiatorId: string;
  priority: number;
  assignedOperatorId?: string | null;
  createdAt: Date;
  lastActivityAt?: Date | null;
  unreadCount: number;
  lastMessage?: string | null;
}

export interface ChatDetailsDto {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  initiatorId: string;
  assignedOperatorId?: string | null;
  createdAt: Date;
  lastActivityAt?: Date | null;
  closedAt?: Date | null;
  closeReason?: string | null;
  priority: number;
  participants: ChatParticipantDto[];
  messages: ChatMessageDto[];
}

export interface ChatParticipantDto {
  userId: string;
  role: string;
  joinedAt: Date;
  leftAt?: Date | null;
  isActive: boolean;
}

export interface ChatMessageDto {
  id: string;
  senderId: string;
  content: string;
  type: string;
  isRead: boolean;
  readAt?: Date | null;
  readBy?: string | null;
  isEdited: boolean;
  createdAt: Date;
}

export interface MessageDto {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: string;
  fileId?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  readBy?: string | null;
  isEdited: boolean;
  editedAt?: Date | null;
  createdAt: Date;
}

export interface ParticipantDto {
  userId: string;
  role: string;
  joinedAt: Date;
  leftAt?: Date | null;
  isActive: boolean;
  lastSeenAt?: Date | null;
  unreadCount: number;
}

export interface PagedResult<T> {
  items: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface SendMessageRequest {
  chatId: string;
  content: string;
  type?: MessageType;
}

export interface SendMessageWithFileRequest {
  chatId: string;
  content: string;
  fileId: string;
}

export interface EditMessageRequest {
  newContent: string;
}

export interface CloseChatRequest {
  reason?: string | null;
}

export interface TransferChatRequest {
  newOperatorId: string;
  reason: string;
}

export interface TypingIndicatorRequest {
  isTyping: boolean;
}

export interface AddParticipantRequest {
  userId: string;
  role?: ParticipantRole;
}

export interface SetStatusRequest {
  status: OperatorStatus;
}

export interface ChatSearchParams {
  searchTerm?: string;
  type?: string;
  status?: string;
  operatorId?: string;
  startDate?: Date;
  endDate?: Date;
  pageIndex?: number;
  pageSize?: number;
}
