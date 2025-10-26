import { Injectable, inject, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  interval,
} from 'rxjs';
import {
  map,
  tap,
  catchError,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
} from 'rxjs/operators';
import { ChatHttpService, SendMessageRequest } from './chat-http.service';
import { ChatSignalRService } from './chat-signalr.service';
import { ChatStateService } from './chat-state.service';
import { ChatNotificationService } from './chat-notification.service';
import {
  Chat,
  Message,
  ChatType,
  ChatSection,
  MessageType,
} from '../models/chat.model';
import * as signalR from '@microsoft/signalr';
import { AuthService } from '../../../core/services/auth.service';
import { ChatTransformerService } from './chat-transformer.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
  private httpService = inject(ChatHttpService);
  private signalRService = inject(ChatSignalRService);
  private authService = inject(AuthService);
  private stateService = inject(ChatStateService);
  private notificationService = inject(ChatNotificationService);
  private transformerService = inject(ChatTransformerService); // Add this

  // State
  private chats$ = new BehaviorSubject<Map<string, Chat>>(new Map());
  private messages$ = new BehaviorSubject<Map<string, Message[]>>(new Map());
  private typingUsers$ = new BehaviorSubject<Map<string, Set<string>>>(
    new Map()
  );
  private unreadCount$ = new BehaviorSubject<number>(0);
  private loading$ = new BehaviorSubject<boolean>(false);

  // Typing indicator timeout tracking
  private typingTimeouts = new Map<string, any>();

  // Add destroy$ for cleanup
  private destroy$ = new Subject<void>();

  constructor() {
    this.initializeSignalRListeners();
    this.startUnreadCountPolling();
    this.monitorConnection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Cleanup typing timeouts
    this.typingTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.typingTimeouts.clear();
  }

  // Public observables
  get chats(): Observable<Chat[]> {
    return this.chats$.pipe(
      map((chatMap) =>
        Array.from(chatMap.values()).sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      )
    );
  }

  get unreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  get isLoading(): Observable<boolean> {
    return this.loading$.asObservable();
  }

  getChatById(chatId: string): Observable<Chat | undefined> {
    return this.chats$.pipe(map((chatMap) => chatMap.get(chatId)));
  }

  getMessages(chatId: string): Observable<Message[]> {
    return this.messages$.pipe(
      map((messagesMap) => messagesMap.get(chatId) || [])
    );
  }

  getTypingUsers(chatId: string): Observable<string[]> {
    return this.typingUsers$.pipe(
      map((typingMap) => Array.from(typingMap.get(chatId) || []))
    );
  }

  // Initialize SignalR connection and listeners
  async initializeConnection(): Promise<void> {
    await this.signalRService.start();
  }

  async disconnect(): Promise<void> {
    await this.signalRService.stop();
  }

  // Load chats by type/section
  async loadChats(section: ChatSection): Promise<void> {
    this.loading$.next(true);

    try {
      const apiChats = await this.httpService.getUserChats().toPromise();

      if (apiChats) {
        console.log('API Chats received:', apiChats);

        // Transform API response to our model
        let chats = this.transformerService.transformChatsFromApi(apiChats);

        console.log('Transformed chats:', chats);

        const currentChats = this.chats$.value;
        const chatType = this.sectionToChatType(section);

        // Filter chats by type
        const filteredChats = chats.filter((chat) => chat.type === chatType);

        console.log('Filtered chats:', filteredChats);

        // Clear existing chats for this section
        const existingChatIds = Array.from(currentChats.keys());
        existingChatIds.forEach((id) => {
          const existingChat = currentChats.get(id);
          if (existingChat && existingChat.type === chatType) {
            currentChats.delete(id);
          }
        });

        // Add filtered chats and enrich with names
        for (const chat of filteredChats) {
          currentChats.set(chat.id, chat);

          // Enrich with participant names asynchronously
          this.enrichChatNames(chat.id);
        }

        this.chats$.next(new Map(currentChats));

        console.log('Updated chat map:', currentChats);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      this.notificationService.error('Failed to load chats');
    } finally {
      this.loading$.next(false);
    }
  }

  private async enrichChatNames(chatId: string): Promise<void> {
    try {
      const currentChats = this.chats$.value;
      const chat = currentChats.get(chatId);

      if (!chat) return;

      const enrichedChat =
        await this.transformerService.enrichChatWithParticipantNames(chat);

      currentChats.set(chatId, enrichedChat);
      this.chats$.next(new Map(currentChats));
    } catch (error) {
      console.error(`Error enriching chat ${chatId}:`, error);
    }
  }

  async loadChatById(chatId: string): Promise<Chat | undefined> {
    try {
      const apiChat = await this.httpService.getChatById(chatId).toPromise();
      if (apiChat) {
        const chat = this.transformerService.transformChatFromApi(apiChat);
        const enrichedChat =
          await this.transformerService.enrichChatWithParticipantNames(chat);

        // Add to local state
        const currentChats = this.chats$.value;
        currentChats.set(enrichedChat.id, enrichedChat);
        this.chats$.next(new Map(currentChats));

        return enrichedChat;
      }
    } catch (error) {
      console.error('Error loading chat by ID:', error);
    }
    return undefined;
  }

  // Load messages for a chat
  async loadMessages(chatId: string, page: number = 1): Promise<void> {
    try {
      const response = await this.httpService
        .getChatMessages(chatId, page)
        .toPromise();

      if (response?.messages) {
        const currentMessages = this.messages$.value;
        const existingMessages = currentMessages.get(chatId) || [];

        // Prepend older messages (for pagination)
        const allMessages =
          page > 1
            ? [...response.messages.reverse(), ...existingMessages]
            : response.messages.reverse();

        currentMessages.set(chatId, allMessages);
        this.messages$.next(new Map(currentMessages));

        // Join the chat room via SignalR
        if (page === 1) {
          await this.signalRService.joinChat(chatId);
          await this.markAsRead(chatId);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      this.notificationService.error('Failed to load messages');
    }
  }

  // Send a message
  async sendMessage(
    chatId: string,
    content: string,
    messageType: MessageType = MessageType.Text
  ): Promise<void> {
    try {
      const request: SendMessageRequest = {
        chatId,
        content,
        messageType,
      };

      await this.httpService.sendMessage(request).toPromise();
    } catch (error) {
      console.error('Error sending message:', error);
      this.notificationService.error(
        'Failed to send message. Please try again.'
      );
      throw error;
    }
  }

  // Send a message with file
  async sendFileMessage(chatId: string, file: File): Promise<void> {
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.notificationService.error('File size exceeds 10MB limit');
      throw new Error('File too large');
    }

    try {
      // Upload file first
      const uploadResponse = await this.httpService
        .uploadFile(file, chatId)
        .toPromise();

      if (uploadResponse) {
        // Send message with file URL
        await this.signalRService.sendMessage({
          chatId,
          content: uploadResponse.fileName,
          messageType: MessageType.File,
          fileUrl: uploadResponse.fileUrl,
          fileName: uploadResponse.fileName,
        });

        this.notificationService.success('File uploaded successfully');
      }
    } catch (error) {
      console.error('Error sending file message:', error);
      this.notificationService.error(
        'Failed to upload file. Please try again.'
      );
      throw error;
    }
  }

  // Edit message
  async editMessage(messageId: string, content: string): Promise<void> {
    try {
      await this.httpService.editMessage(messageId, { content }).toPromise();
    } catch (error) {
      console.error('Error editing message:', error);
      this.notificationService.error('Failed to edit message');
      throw error;
    }
  }

  // Delete message
  async deleteMessage(messageId: string, chatId: string): Promise<void> {
    try {
      await this.httpService.deleteMessage(messageId).toPromise();
    } catch (error) {
      console.error('Error deleting message:', error);
      this.notificationService.error('Failed to delete message');
      throw error;
    }
  }
  // Mark chat as read
  async markAsRead(chatId: string): Promise<void> {
    try {
      await this.httpService.markChatAsRead(chatId).toPromise();

      // Update local state
      const currentChats = this.chats$.value;
      const chat = currentChats.get(chatId);
      if (chat) {
        chat.unreadCount = 0;
        currentChats.set(chatId, { ...chat });
        this.chats$.next(new Map(currentChats));
      }

      // Refresh unread count
      await this.refreshUnreadCount();
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }

  // Typing indicator
  async notifyTyping(chatId: string, isTyping: boolean): Promise<void> {
    try {
      await this.signalRService.notifyTyping(chatId, isTyping);
    } catch (error) {
      console.error('Error notifying typing:', error);
    }
  }

  getCurrentUserId() {
    return this.authService.getUserId();
  }

  // Update the createChat method
  async createChat(
    type: ChatType,
    participantId?: string,
    name?: string,
    operatorIds?: string[]
  ): Promise<Chat> {
    try {
      let chat: Chat | undefined;

      if (type === ChatType.ClientToOperator) {
        // Determine if we're a client or operator creating the chat
        // For now, assuming operator is creating (you can check user role)
        if (!participantId) {
          throw new Error('Participant ID is required');
        }
        chat = await this.httpService
          .createClientToOperatorChatByOperator(
            participantId, // clientId
            this.getCurrentUserId() // operatorId (you)
          )
          .toPromise();
      } else if (type === ChatType.OperatorToOperator) {
        if (!participantId) {
          throw new Error('Operator ID is required');
        }
        chat = await this.httpService
          .createOperatorToOperatorChat(participantId)
          .toPromise();
      } else if (type === ChatType.OperatorGroup) {
        if (!name || !operatorIds || operatorIds.length === 0) {
          throw new Error('Group name and participants are required');
        }
        chat = await this.httpService
          .createOperatorGroupChat(name, operatorIds)
          .toPromise();
      }

      if (chat) {
        const currentChats = this.chats$.value;
        currentChats.set(chat.id, chat);
        this.chats$.next(new Map(currentChats));

        // Open the new chat
        this.stateService.openChatWindow(chat.id);

        this.notificationService.success('Chat created successfully');
      }

      return chat!;
    } catch (error) {
      console.error('Error creating chat:', error);
      this.notificationService.error('Failed to create chat');
      throw error;
    }
  }
  // Leave a chat room
  async leaveChat(chatId: string): Promise<void> {
    try {
      await this.signalRService.leaveChat(chatId);
    } catch (error) {
      console.error('Error leaving chat:', error);
    }
  }

  // Private methods
  private initializeSignalRListeners(): void {
    // Message received
    this.signalRService.onMessageReceived
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        this.addMessage(message);
        this.updateChatLastMessage(message);
      });

    // Message edited
    this.signalRService.onMessageEdited
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        this.updateMessage(message);
      });

    // Message deleted
    this.signalRService.onMessageDeleted
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ messageId, chatId }) => {
        this.removeMessage(messageId, chatId);
      });

    // Chat updated
    this.signalRService.onChatUpdated
      .pipe(takeUntil(this.destroy$))
      .subscribe((chat) => {
        this.updateChat(chat);
      });

    // Typing indicator
    this.signalRService.onUserTyping
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.handleTypingEvent(event);
      });

    // Online status changed
    this.signalRService.onOnlineStatusChanged
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ userId, isOnline }) => {
        this.updateUserOnlineStatus(userId, isOnline);
      });
  }

  private addMessage(message: Message): void {
    const currentMessages = this.messages$.value;
    const chatMessages = currentMessages.get(message.chatId) || [];

    // Check if message already exists (prevent duplicates)
    if (!chatMessages.find((m) => m.id === message.id)) {
      chatMessages.push(message);
      currentMessages.set(message.chatId, chatMessages);
      this.messages$.next(new Map(currentMessages));
    }
  }

  private updateMessage(message: Message): void {
    const currentMessages = this.messages$.value;
    const chatMessages = currentMessages.get(message.chatId);

    if (chatMessages) {
      const index = chatMessages.findIndex((m) => m.id === message.id);
      if (index !== -1) {
        chatMessages[index] = message;
        currentMessages.set(message.chatId, [...chatMessages]);
        this.messages$.next(new Map(currentMessages));
      }
    }
  }

  private removeMessage(messageId: string, chatId: string): void {
    const currentMessages = this.messages$.value;
    const chatMessages = currentMessages.get(chatId);

    if (chatMessages) {
      const filtered = chatMessages.filter((m) => m.id !== messageId);
      currentMessages.set(chatId, filtered);
      this.messages$.next(new Map(currentMessages));
    }
  }

  private updateChat(chat: Chat): void {
    const currentChats = this.chats$.value;
    currentChats.set(chat.id, chat);
    this.chats$.next(new Map(currentChats));
  }

  private updateChatLastMessage(message: Message): void {
    const currentChats = this.chats$.value;
    const chat = currentChats.get(message.chatId);

    if (chat) {
      chat.lastMessage = message;
      chat.updatedAt = message.createdAt;

      // Increment unread count if window is not open
      if (!this.stateService.isChatOpen(message.chatId)) {
        chat.unreadCount = (chat.unreadCount || 0) + 1;
        this.refreshUnreadCount();
      }

      currentChats.set(message.chatId, { ...chat });
      this.chats$.next(new Map(currentChats));
    }
  }

  private handleTypingEvent(event: any): void {
    const currentTyping = this.typingUsers$.value;
    const chatTyping = currentTyping.get(event.chatId) || new Set<string>();

    if (event.isTyping) {
      chatTyping.add(event.userId);

      // Clear existing timeout
      const timeoutKey = `${event.chatId}-${event.userId}`;
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey));
      }

      // Set new timeout to remove typing indicator after 3 seconds
      const timeout = setTimeout(() => {
        chatTyping.delete(event.userId);
        currentTyping.set(event.chatId, new Set(chatTyping));
        this.typingUsers$.next(new Map(currentTyping));
        this.typingTimeouts.delete(timeoutKey);
      }, 3000);

      this.typingTimeouts.set(timeoutKey, timeout);
    } else {
      chatTyping.delete(event.userId);
    }

    currentTyping.set(event.chatId, new Set(chatTyping));
    this.typingUsers$.next(new Map(currentTyping));
  }

  private updateUserOnlineStatus(userId: string, isOnline: boolean): void {
    const currentChats = this.chats$.value;

    currentChats.forEach((chat) => {
      const participant = chat.participants.find((p) => p.id === userId);
      if (participant) {
        participant.isOnline = isOnline;
        currentChats.set(chat.id, { ...chat });
      }
    });

    this.chats$.next(new Map(currentChats));
  }

  private async refreshUnreadCount(): Promise<void> {
    try {
      // If endpoint doesn't exist, calculate from chats
      const allChats = Array.from(this.chats$.value.values());
      const totalUnread = allChats.reduce(
        (sum, chat) => sum + (chat.unreadCount || 0),
        0
      );
      this.unreadCount$.next(totalUnread);
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  }
  private startUnreadCountPolling(): void {
    // Poll unread count every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshUnreadCount();
      });

    // Initial fetch
    this.refreshUnreadCount();
  }

  private monitorConnection(): void {
    this.signalRService.connectionState
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        if (state === signalR.HubConnectionState.Connected) {
          this.notificationService.success('Chat connected', 2000);
        } else if (state === signalR.HubConnectionState.Reconnecting) {
          this.notificationService.warning('Reconnecting to chat...', 3000);
        } else if (state === signalR.HubConnectionState.Disconnected) {
          this.notificationService.error(
            'Chat disconnected. Trying to reconnect...',
            5000
          );
        }
      });
  }

  private sectionToChatType(section: ChatSection): ChatType | undefined {
    switch (section) {
      case ChatSection.Client:
        return ChatType.ClientToOperator;
      case ChatSection.Operator:
        return ChatType.OperatorToOperator;
      case ChatSection.Group:
        return ChatType.OperatorGroup;
      default:
        return undefined;
    }
  }
}
