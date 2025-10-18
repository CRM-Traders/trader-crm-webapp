export interface ChatSummaryDto {
  id: string;
  title: string;
  type: string;
  status: string;
  initiatorId: string;
  assignedOperatorId: string | null;
  createdAt: string;
  lastActivityAt: string | null;
  unreadCount: number;
  lastMessage: string | null;
}

export interface ChatDetailsDto {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  initiatorId: string;
  assignedOperatorId: string | null;
  createdAt: string;
  lastActivityAt: string | null;
  closedAt: string | null;
  closeReason: string | null;
  priority: number;
  participants: ChatParticipantDto[];
  messages: ChatMessageDto[];
}

export interface ChatParticipantDto {
  userId: string;
  username: string;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  isActive: boolean;
}

export interface ChatMessageDto {
  id: string;
  senderId: string;
  content: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  readBy: string | null;
  isEdited: boolean;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  chatId: string;
  senderName: string;
  senderId: string;
  content: string;
  type: string;
  fileId: string | null;
  isRead: boolean;
  readAt: string | null;
  readBy: string | null;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
}

export interface ParticipantDto {
  userId: string;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
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

export interface CreateChatCommand {
  title: string;
  type: ChatType;
  description?: string | null;
  priority?: number;
  targetOperatorId?: string | null;
}

export interface CreateGroupChatRequest {
  title: string;
  description: string | null;
  participantIds: string[];
  priority?: number;
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
  reason: string | null;
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

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  SEEN = 'seen',
}

export enum ParticipantRole {
  Customer = 1,
  Operator = 2,
  Admin = 3,
  Observer = 4,
}

export enum OperatorStatus {
  Offline = 1,
  Available = 2,
  Busy = 3,
  Away = 4,
}

export interface OperatorItem {
  id: string;
  value: string;
  fullName?: string;
  email?: string;
  department?: string;
  role?: string;
  status?: OperatorStatus;
  chatId?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

export type ChatChannel = 'clients' | 'operators';

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  isOnline: boolean;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  channel: ChatChannel;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isSender: boolean;
  userId: string;
  status: MessageStatus;
  attachments?: string[];
}

export interface ChatWindow {
  id: string;
  user: ChatUser;
  isMinimized: boolean;
  position?: { x: number; y: number };
}
