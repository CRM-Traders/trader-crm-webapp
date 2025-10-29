import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
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
  private transformerService = inject(ChatTransformerService);

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

  private destroy$ = new Subject<void>();

  constructor() {
    this.initializeSignalRListeners();
    this.monitorConnection();

    // Start SignalR connection immediately
    this.initializeConnection().catch((error) => {});
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Cleanup typing timeouts
    this.typingTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.typingTimeouts.clear();

    // Stop SignalR connection
    this.disconnect();
  }

  // Utility method for safe date parsing
  private parseDate(dateValue: any): Date {
    if (!dateValue) {
      return new Date();
    }

    // If already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // If string, try to parse
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      // Check if valid
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
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
    try {
      await this.signalRService.start();
    } catch (error) {
      throw error;
    }
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
        // Transform API response to our model
        const chats = this.transformerService.transformChatsFromApi(apiChats);

        const currentChats = this.chats$.value;

        // ✅ FIX: Filter chats based on section (handle Operator section specially)
        let filteredChats: Chat[];
        if (section === ChatSection.Client) {
          filteredChats = chats.filter(
            (chat) => chat.type === ChatType.ClientToOperator
          );
        } else if (section === ChatSection.Operator) {
          // ✅ Include BOTH OperatorToOperator AND OperatorGroup
          filteredChats = chats.filter(
            (chat) =>
              chat.type === ChatType.OperatorToOperator ||
              chat.type === ChatType.OperatorGroup
          );
        } else {
          filteredChats = [];
        }

        // Clear existing chats for this section
        const existingChatIds = Array.from(currentChats.keys());
        existingChatIds.forEach((id) => {
          const existingChat = currentChats.get(id);
          if (existingChat) {
            // Remove if it belongs to the current section
            if (
              section === ChatSection.Client &&
              existingChat.type === ChatType.ClientToOperator
            ) {
              currentChats.delete(id);
            } else if (
              section === ChatSection.Operator &&
              (existingChat.type === ChatType.OperatorToOperator ||
                existingChat.type === ChatType.OperatorGroup)
            ) {
              currentChats.delete(id);
            }
          }
        });

        // Add filtered chats
        filteredChats.forEach((chat) => {
          currentChats.set(chat.id, chat);
        });

        this.chats$.next(new Map(currentChats));
        this.calculateUnreadCount();

        // Load last messages for each chat
        await this.loadLastMessagesForChats(filteredChats);
      }
    } catch (error) {
      this.notificationService.error('Failed to load chats');
    } finally {
      this.loading$.next(false);
    }
  }
  // Load last messages for chats
  private async loadLastMessagesForChats(chats: Chat[]): Promise<void> {
    const currentChats = this.chats$.value;

    for (const chat of chats) {
      try {
        // Load just the first page (most recent messages)
        const response = await this.httpService
          .getChatMessages(chat.id, 1, 1) // Just get 1 message
          .toPromise();

        if (response?.messages && response.messages.length > 0) {
          const lastMessage = response.messages[0];

          // Convert date
          const messageWithDate: Message = {
            ...lastMessage,
            createdAt: this.parseDate(lastMessage.createdAt),
          };

          // Update chat with last message
          const updatedChat = currentChats.get(chat.id);
          if (updatedChat) {
            updatedChat.lastMessage = messageWithDate;
            updatedChat.updatedAt = messageWithDate.createdAt;
            currentChats.set(chat.id, { ...updatedChat });
          }
        }
      } catch (error) {}
    }

    // Update all chats at once
    this.chats$.next(new Map(currentChats));
  }

  async loadChatById(chatId: string): Promise<Chat | undefined> {
    try {
      const apiChat = await this.httpService.getChatById(chatId).toPromise();
      if (apiChat) {
        const chat = this.transformerService.transformChatFromApi(apiChat);

        // Add to local state
        const currentChats = this.chats$.value;
        currentChats.set(chat.id, chat);
        this.chats$.next(new Map(currentChats));

        // Load last message
        try {
          const response = await this.httpService
            .getChatMessages(chat.id, 1, 1)
            .toPromise();

          if (response?.messages && response.messages.length > 0) {
            const lastMessage = response.messages[0];
            chat.lastMessage = {
              ...lastMessage,
              createdAt: this.parseDate(lastMessage.createdAt),
            };
            currentChats.set(chat.id, { ...chat });
            this.chats$.next(new Map(currentChats));
          }
        } catch (error) {}

        return chat;
      }
    } catch (error) {}
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

        // Convert API date strings to Date objects with robust parsing
        const messages = response.messages.map((msg) => ({
          ...msg,
          createdAt: this.parseDate(msg.createdAt),
        }));

        // Prepend older messages (for pagination)
        const allMessages =
          page > 1
            ? [...messages.reverse(), ...existingMessages]
            : messages.reverse();

        currentMessages.set(chatId, allMessages);
        this.messages$.next(new Map(currentMessages));

        // Join the chat room via SignalR
        if (page === 1) {
          await this.signalRService.joinChat(chatId);
          await this.markAsRead(chatId);
        }
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
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

      // Send message and get response
      const sentMessage = await this.httpService
        .sendMessage(request)
        .toPromise();

      if (sentMessage) {
        // Add message immediately from HTTP response (optimistic update)
        const messageWithDate: Message = {
          ...sentMessage,
          createdAt: this.parseDate(sentMessage.createdAt),
        };

        // Add to messages immediately
        this.addMessage(messageWithDate, true); // Mark as own message

        // Update chat's last message
        this.updateChatLastMessage(messageWithDate);
      }
    } catch (error) {
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
        this.calculateUnreadCount();
      }
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

  // Create chat with proper handling
  async createChat(
    type: ChatType,
    participantId?: string,
    name?: string,
    operatorIds?: string[]
  ): Promise<Chat> {
    try {
      let chat: Chat | undefined;

      if (type === ChatType.ClientToOperator) {
        if (!participantId) {
          throw new Error('Participant ID is required');
        }
        chat = await this.httpService
          .createClientToOperatorChatByOperator(participantId, 'Hi!')
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
        // Ensure chat has a proper name saved
        chat = this.normalizeChatName(chat);

        // Add to local state immediately
        const currentChats = this.chats$.value;
        currentChats.set(chat.id, chat);
        this.chats$.next(new Map(currentChats));

        // Open the new chat window
        this.stateService.openChatWindow(chat.id);

        this.notificationService.success('Chat created successfully');

        return chat;
      }

      throw new Error('Failed to create chat');
    } catch (error) {
      this.notificationService.error('Failed to create chat');
      throw error;
    }
  }

  private normalizeChatName(chat: Chat): Chat {
    const normalized: Chat = { ...chat };

    const hasValidName =
      typeof normalized.name === 'string' && normalized.name.trim().length > 0;

    if (!hasValidName) {
      if (normalized.type === ChatType.OperatorGroup) {
        // Some APIs return groupName separately; attempt to use it if present
        const anyChat = normalized as any;
        normalized.name = (anyChat.groupName as string) || 'Group Chat';
      } else {
        const currentUserId = this.getCurrentUserId();
        const otherParticipant =
          normalized.participants?.find((p) => p.userId !== currentUserId) ||
          normalized.participants?.[0];
        normalized.name = otherParticipant?.name?.trim() || 'Chat';
      }
    }

    // Ensure unreadCount is a number
    normalized.unreadCount = normalized.unreadCount || 0;

    return normalized;
  }

  // Leave a chat room
  async leaveChat(chatId: string): Promise<void> {
    try {
      await this.signalRService.leaveChat(chatId);
    } catch (error) {}
  }

  // Private methods
  private initializeSignalRListeners(): void {
    // Message received
    this.signalRService.onMessageReceived
      .pipe(takeUntil(this.destroy$))
      .subscribe((receivedData: any) => {
        // ✅ FIX: Handle different SignalR message structures
        let message: Message;

        // Check if it's nested (e.g., {chatId: '...', message: {...}})
        if (receivedData.message) {
          message = receivedData.message;
        } else {
          // Direct message object
          message = receivedData;
        }

        const messageWithDate = {
          ...message,
          createdAt: this.parseDate(message.createdAt),
        };

        // Only add if it's not our own message (avoid double-add)
        // Only add if it's not our own message (avoid double-add)
        const currentUserId = this.getCurrentUserId();
        if (message.senderId !== currentUserId) {
          this.addMessage(messageWithDate, false);
          this.updateChatLastMessage(messageWithDate);

          // Play notification sound if chat window is not open
          if (!this.stateService.isChatOpen(message.chatId)) {
            this.playNotificationSound();
          }
        } else {
        }
      });

    // Message edited
    this.signalRService.onMessageEdited
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        const messageWithDate = {
          ...message,
          createdAt: this.parseDate(message.createdAt),
        };
        this.updateMessage(messageWithDate);
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
      .subscribe((event: any) => {
        // ✅ FIX: Extract the actual event data
        let typingEvent = event;

        // Handle if event is wrapped
        if (event.event) {
          typingEvent = event.event;
        }
        this.handleTypingEvent(typingEvent);
      });

    // Online status changed
    this.signalRService.onOnlineStatusChanged
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ userId, isOnline }) => {
        this.updateUserOnlineStatus(userId, isOnline);
      });
  }

  // ✅ FIX: Updated addMessage with better handling
  private addMessage(message: Message, isOwnMessage: boolean = false): void {
    const currentMessages = this.messages$.value;
    const chatMessages = currentMessages.get(message.chatId) || [];
    // Check if message already exists
    const exists = chatMessages.find((m) => m.id === message.id);

    if (!exists) {
      chatMessages.push(message);
      currentMessages.set(message.chatId, chatMessages);
      this.messages$.next(new Map(currentMessages));
    } else {
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
      }

      currentChats.set(message.chatId, { ...chat });
      this.chats$.next(new Map(currentChats));
      this.calculateUnreadCount();
    }
  }

  private handleTypingEvent(event: any): void {
    // Ensure we have the required fields
    if (!event.chatId || !event.userId || event.isTyping === undefined) {
      return;
    }

    const currentTyping = this.typingUsers$.value;
    const chatTyping = currentTyping.get(event.chatId) || new Set<string>();

    const currentUserId = this.getCurrentUserId();

    if (event.isTyping) {
      // Don't show typing indicator for current user
      if (event.userId !== currentUserId) {
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
      }
    } else {
      chatTyping.delete(event.userId);
    }

    currentTyping.set(event.chatId, new Set(chatTyping));
    this.typingUsers$.next(new Map(currentTyping));
  }

  private updateUserOnlineStatus(userId: string, isOnline: boolean): void {
    const currentChats = this.chats$.value;

    currentChats.forEach((chat) => {
      const participant = chat.participants.find((p) => p.userId === userId);
      if (participant) {
        participant.isOnline = isOnline;
        currentChats.set(chat.id, { ...chat });
      }
    });

    this.chats$.next(new Map(currentChats));
  }

  private calculateUnreadCount(): void {
    const allChats = Array.from(this.chats$.value.values());
    const totalUnread = allChats.reduce(
      (sum, chat) => sum + (chat.unreadCount || 0),
      0
    );
    this.unreadCount$.next(totalUnread);
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
      default:
        return undefined;
    }
  }

  private chatTypeToSection(chatType: ChatType): ChatSection {
    switch (chatType) {
      case ChatType.ClientToOperator:
        return ChatSection.Client;
      case ChatType.OperatorToOperator:
        return ChatSection.Operator;
      default:
        return ChatSection.Client;
    }
  }

  private playNotificationSound(): void {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
}
