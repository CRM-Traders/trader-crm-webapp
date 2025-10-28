export enum ChatType {
  ClientToOperator = 1,
  OperatorToOperator = 2,
  OperatorGroup = 3,
}

export enum MessageType {
  Text = 1,
  File = 2,
}

export enum UserType {
  Client = 1,
  Operator = 2,
}

export enum ChatSection {
  Client = 'client',
  Operator = 'operators', // Merged Operator and Group into one section
}

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  lastMessage?: Message;
  unreadCount: number;
  participants: Participant[];
  isOnline?: boolean;
  updatedAt: Date;
  createdAt: Date;
}

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  userType: UserType;
  userId: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: MessageType;
  fileUrl?: string;
  fileName?: string;
  createdAt: Date;
  isEdited: boolean;
  isDeleted: boolean;
}

export interface ChatWindowState {
  chatId: string;
  isMinimized: boolean;
  position: number;
}

export interface ChatState {
  activeSection: ChatSection;
  openWindows: ChatWindowState[];
  lastActiveChat?: string;
}

export interface ChatApiResponse {
  id: string;
  chatType: ChatType; // Note: API uses chatType, not type
  groupName: string;
  createdAt: string;
  participants: ParticipantApiResponse[];
}

export interface ParticipantApiResponse {
  id: string;
  userId: string;
  userType: UserType;
  joinedAt: string;
  name: string;
  isActive: boolean;
}
