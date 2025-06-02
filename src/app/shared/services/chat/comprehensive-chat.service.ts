// src/app/shared/services/chat/comprehensive-chat.service.ts

import { Injectable, inject, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Subject,
  Observable,
  combineLatest,
  timer,
  of,
  from,
} from 'rxjs';
import {
  map,
  tap,
  catchError,
  switchMap,
  filter,
  takeUntil,
  shareReplay,
  debounceTime,
  distinctUntilChanged,
  retry,
  retryWhen,
  delay,
} from 'rxjs/operators';
import { ChatApiService } from './chat-api.service';
import { ChatSignalRService } from './chat-signalr.service';
import {
  ChatSummaryDto,
  ChatDetailsDto,
  MessageDto,
  ParticipantDto,
  ChatType,
  MessageType,
  OperatorStatus,
  CreateChatCommand,
  SendMessageRequest,
  PagedResult,
} from '../../models/chat/chat-system.model';

interface ChatState {
  chats: Map<string, ChatDetailsDto>;
  activeChats: ChatSummaryDto[];
  messages: Map<string, MessageDto[]>;
  typingUsers: Map<string, Set<string>>;
  unreadCounts: Map<string, number>;
  loadingStates: Map<string, boolean>;
}

@Injectable({
  providedIn: 'root',
})
export class ComprehensiveChatService implements OnDestroy {
  private chatApi = inject(ChatApiService);
  private signalR = inject(ChatSignalRService);

  private destroy$ = new Subject<void>();
  private refreshChats$ = new Subject<void>();

  // State management
  private state: ChatState = {
    chats: new Map(),
    activeChats: [],
    messages: new Map(),
    typingUsers: new Map(),
    unreadCounts: new Map(),
    loadingStates: new Map(),
  };

  // BehaviorSubjects for reactive state
  private activeChatsSubject = new BehaviorSubject<ChatSummaryDto[]>([]);
  private selectedChatIdSubject = new BehaviorSubject<string | null>(null);
  private selectedChatSubject = new BehaviorSubject<ChatDetailsDto | null>(
    null
  );
  private messagesSubject = new BehaviorSubject<Map<string, MessageDto[]>>(
    new Map()
  );
  private typingUsersSubject = new BehaviorSubject<Map<string, Set<string>>>(
    new Map()
  );
  private unreadCountsSubject = new BehaviorSubject<Map<string, number>>(
    new Map()
  );
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private connectionStateSubject = new BehaviorSubject<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');
  private operatorStatusSubject = new BehaviorSubject<OperatorStatus>(
    OperatorStatus.Online
  );

  // Public observables
  activeChats$ = this.activeChatsSubject.asObservable();
  selectedChatId$ = this.selectedChatIdSubject.asObservable();
  selectedChat$ = this.selectedChatSubject.asObservable();
  messages$ = this.messagesSubject.asObservable();
  typingUsers$ = this.typingUsersSubject.asObservable();
  unreadCounts$ = this.unreadCountsSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  connectionState$ = this.connectionStateSubject.asObservable();
  operatorStatus$ = this.operatorStatusSubject.asObservable();

  // Computed observables
  currentChatMessages$ = combineLatest([
    this.selectedChatId$,
    this.messages$,
  ]).pipe(
    map(([chatId, messages]) => (chatId ? messages.get(chatId) || [] : [])),
    shareReplay(1)
  );

  totalUnreadCount$ = this.unreadCounts$.pipe(
    map((counts) =>
      Array.from(counts.values()).reduce((sum, count) => sum + count, 0)
    ),
    shareReplay(1)
  );

  currentChatTypingUsers$ = combineLatest([
    this.selectedChatId$,
    this.typingUsers$,
  ]).pipe(
    map(([chatId, typingUsers]) =>
      chatId ? Array.from(typingUsers.get(chatId) || []) : []
    ),
    shareReplay(1)
  );

  constructor() {
    this.initializeSignalRListeners();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  // Initialization methods
  async initialize(accessToken: string, chatType: ChatType): Promise<void> {
    try {
      this.loadingSubject.next(true);

      // Connect to SignalR
      await this.signalR.connect(accessToken);

      // Load initial data based on chat type
      if (chatType === ChatType.CustomerSupport) {
        await this.loadOperatorChats();
      } else {
        await this.loadUserChats();
      }

      this.loadingSubject.next(false);
    } catch (error) {
      console.error('Failed to initialize chat service:', error);
      this.loadingSubject.next(false);
      throw error;
    }
  }

  private initializeSignalRListeners(): void {
    // Connection state
    this.signalR.connectionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => this.connectionStateSubject.next(state));

    // New message
    this.signalR.newMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => this.handleNewMessage(message));

    // Message edited
    this.signalR.messageEdited$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ messageId, newContent, editedAt }) =>
        this.handleMessageEdited(messageId, newContent, editedAt)
      );

    // Message deleted
    this.signalR.messageDeleted$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ messageId }) => this.handleMessageDeleted(messageId));

    // Typing indicator
    this.signalR.userTyping$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ userId, chatId }) => this.handleUserTyping(userId, chatId));

    // Chat closed
    this.signalR.chatClosed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ chatId }) => this.handleChatClosed(chatId));

    // Chat transferred
    this.signalR.chatTransferred$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ chatId, toOperatorId }) =>
        this.handleChatTransferred(chatId, toOperatorId)
      );
  }

  private setupAutoRefresh(): void {
    // Refresh chats every 30 seconds
    timer(30000, 30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshChats$.next());

    // Handle refresh requests
    this.refreshChats$
      .pipe(
        debounceTime(500),
        switchMap(() => this.reloadActiveChats()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  // Chat management methods
  async loadOperatorChats(activeOnly: boolean = true): Promise<void> {
    try {
      const chats = await this.chatApi
        .getMyOperatorChats(activeOnly)
        .toPromise();
      this.state.activeChats = chats || [];
      this.activeChatsSubject.next(this.state.activeChats);

      // Join SignalR groups for each chat
      for (const chat of this.state.activeChats) {
        await this.signalR.joinChatGroup(chat.id);
      }
    } catch (error) {
      console.error('Failed to load operator chats:', error);
      throw error;
    }
  }

  async loadUserChats(): Promise<void> {
    try {
      const chats = await this.chatApi.getMyChats().toPromise();
      this.state.activeChats = chats || [];
      this.activeChatsSubject.next(this.state.activeChats);

      // Join SignalR groups for each chat
      for (const chat of this.state.activeChats) {
        await this.signalR.joinChatGroup(chat.id);
      }
    } catch (error) {
      console.error('Failed to load user chats:', error);
      throw error;
    }
  }

  async selectChat(chatId: string): Promise<void> {
    if (this.selectedChatIdSubject.value === chatId) return;

    try {
      this.loadingSubject.next(true);
      this.selectedChatIdSubject.next(chatId);

      // Load chat details if not cached
      if (!this.state.chats.has(chatId)) {
        const chatDetails = await this.chatApi
          .getChatDetails(chatId)
          .toPromise();
        if (chatDetails) {
          this.state.chats.set(chatId, chatDetails);
        }
      }

      const chat = this.state.chats.get(chatId);
      this.selectedChatSubject.next(chat || null);

      // Load messages if not cached
      if (!this.state.messages.has(chatId)) {
        await this.loadChatMessages(chatId);
      }

      // Mark messages as read
      await this.markChatAsRead(chatId);

      this.loadingSubject.next(false);
    } catch (error) {
      console.error('Failed to select chat:', error);
      this.loadingSubject.next(false);
      throw error;
    }
  }

  async createChat(command: CreateChatCommand): Promise<string> {
    try {
      const chatId = await this.chatApi.createChat(command).toPromise();
      if (chatId) {
        await this.signalR.joinChatGroup(chatId);
        this.refreshChats$.next();
        return chatId;
      }
      throw new Error('Failed to create chat');
    } catch (error) {
      console.error('Failed to create chat:', error);
      throw error;
    }
  }

  async sendMessage(
    chatId: string,
    content: string,
    type: MessageType = MessageType.Text
  ): Promise<void> {
    try {
      const request: SendMessageRequest = { chatId, content, type };
      const messageId = await this.chatApi.sendMessage(request).toPromise();

      // Optimistically add message to UI
      const optimisticMessage: MessageDto = {
        id: messageId || '',
        chatId,
        senderId: this.getCurrentUserId(),
        content,
        type: type.toString(),
        isRead: false,
        readAt: null,
        readBy: null,
        isEdited: false,
        editedAt: null,
        fileId: null,
        createdAt: new Date(),
      };

      this.addMessageToChat(chatId, optimisticMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async sendTypingIndicator(chatId: string, isTyping: boolean): Promise<void> {
    try {
      await this.chatApi.sendTypingIndicator(chatId, { isTyping }).toPromise();
      await this.signalR.sendTypingIndicator(chatId);
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  async closeChat(chatId: string, reason?: string): Promise<void> {
    try {
      await this.chatApi.closeChat(chatId, { reason }).toPromise();
      await this.signalR.leaveChatGroup(chatId);
      this.refreshChats$.next();
    } catch (error) {
      console.error('Failed to close chat:', error);
      throw error;
    }
  }

  async transferChat(
    chatId: string,
    newOperatorId: string,
    reason: string
  ): Promise<void> {
    try {
      await this.chatApi
        .transferChat(chatId, { newOperatorId, reason })
        .toPromise();
      this.refreshChats$.next();
    } catch (error) {
      console.error('Failed to transfer chat:', error);
      throw error;
    }
  }

  async setOperatorStatus(status: OperatorStatus): Promise<void> {
    try {
      await this.chatApi.setOperatorStatus({ status }).toPromise();
      this.operatorStatusSubject.next(status);
    } catch (error) {
      console.error('Failed to set operator status:', error);
      throw error;
    }
  }

  // Private helper methods
  private async loadChatMessages(
    chatId: string,
    pageIndex: number = 1
  ): Promise<void> {
    try {
      const result = await this.chatApi
        .getChatMessages(chatId, pageIndex)
        .toPromise();
      if (result) {
        const messages = result.items.reverse(); // Reverse to show oldest first
        this.state.messages.set(chatId, messages);
        this.messagesSubject.next(new Map(this.state.messages));
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      throw error;
    }
  }

  private async markChatAsRead(chatId: string): Promise<void> {
    const messages = this.state.messages.get(chatId) || [];
    const unreadMessages = messages.filter(
      (m) => !m.isRead && m.senderId !== this.getCurrentUserId()
    );

    for (const message of unreadMessages) {
      try {
        await this.chatApi.markMessageAsRead(message.id).toPromise();
      } catch (error) {
        console.error('Failed to mark message as read:', error);
      }
    }

    this.state.unreadCounts.set(chatId, 0);
    this.unreadCountsSubject.next(new Map(this.state.unreadCounts));
  }

  private handleNewMessage(message: MessageDto): void {
    this.addMessageToChat(message.chatId, message);

    // Update unread count if not current chat
    if (
      this.selectedChatIdSubject.value !== message.chatId &&
      message.senderId !== this.getCurrentUserId()
    ) {
      const currentCount = this.state.unreadCounts.get(message.chatId) || 0;
      this.state.unreadCounts.set(message.chatId, currentCount + 1);
      this.unreadCountsSubject.next(new Map(this.state.unreadCounts));
    }

    // Update last message in active chats
    const chatIndex = this.state.activeChats.findIndex(
      (c) => c.id === message.chatId
    );
    if (chatIndex !== -1) {
      this.state.activeChats[chatIndex].lastMessage = message.content;
      this.state.activeChats[chatIndex].lastActivityAt = message.createdAt;
      this.activeChatsSubject.next([...this.state.activeChats]);
    }
  }

  private handleMessageEdited(
    messageId: string,
    newContent: string,
    editedAt: Date
  ): void {
    for (const [chatId, messages] of this.state.messages) {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex !== -1) {
        messages[messageIndex].content = newContent;
        messages[messageIndex].isEdited = true;
        messages[messageIndex].editedAt = editedAt;
        this.messagesSubject.next(new Map(this.state.messages));
        break;
      }
    }
  }

  private handleMessageDeleted(messageId: string): void {
    for (const [chatId, messages] of this.state.messages) {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex !== -1) {
        messages.splice(messageIndex, 1);
        this.messagesSubject.next(new Map(this.state.messages));
        break;
      }
    }
  }

  private handleUserTyping(userId: string, chatId: string): void {
    if (!this.state.typingUsers.has(chatId)) {
      this.state.typingUsers.set(chatId, new Set());
    }

    const typingSet = this.state.typingUsers.get(chatId)!;
    typingSet.add(userId);
    this.typingUsersSubject.next(new Map(this.state.typingUsers));

    // Remove typing indicator after 3 seconds
    setTimeout(() => {
      typingSet.delete(userId);
      this.typingUsersSubject.next(new Map(this.state.typingUsers));
    }, 3000);
  }

  private handleChatClosed(chatId: string): void {
    const index = this.state.activeChats.findIndex((c) => c.id === chatId);
    if (index !== -1) {
      this.state.activeChats[index].status = 'Closed';
      this.activeChatsSubject.next([...this.state.activeChats]);
    }
  }

  private handleChatTransferred(chatId: string, toOperatorId: string): void {
    // If chat was transferred away from current operator, remove it
    if (toOperatorId !== this.getCurrentUserId()) {
      this.state.activeChats = this.state.activeChats.filter(
        (c) => c.id !== chatId
      );
      this.activeChatsSubject.next(this.state.activeChats);

      if (this.selectedChatIdSubject.value === chatId) {
        this.selectedChatIdSubject.next(null);
        this.selectedChatSubject.next(null);
      }
    }
  }

  private addMessageToChat(chatId: string, message: MessageDto): void {
    if (!this.state.messages.has(chatId)) {
      this.state.messages.set(chatId, []);
    }

    const messages = this.state.messages.get(chatId)!;
    messages.push(message);
    this.messagesSubject.next(new Map(this.state.messages));
  }

  private async reloadActiveChats(): Promise<void> {
    try {
      const chats = await this.chatApi.getMyChats().toPromise();
      if (chats) {
        this.state.activeChats = chats;
        this.activeChatsSubject.next(this.state.activeChats);
      }
    } catch (error) {
      console.error('Failed to reload active chats:', error);
    }
  }

  private getCurrentUserId(): string {
    // This should be implemented based on your auth service
    // For now, returning a placeholder
    return 'current-user-id';
  }

  private async disconnect(): Promise<void> {
    // Leave all chat groups
    for (const chat of this.state.activeChats) {
      try {
        await this.signalR.leaveChatGroup(chat.id);
      } catch (error) {
        console.error(`Failed to leave chat group ${chat.id}:`, error);
      }
    }

    // Disconnect from SignalR
    await this.signalR.disconnect();
  }
}
