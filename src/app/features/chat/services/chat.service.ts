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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Cleanup typing timeouts
    this.typingTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.typingTimeouts.clear();
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

    // Fallback to current date
    console.warn('Invalid date value:', dateValue);
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
        console.log('Raw API chats:', apiChats);

        // Transform API response to our model
        const chats = this.transformerService.transformChatsFromApi(apiChats);

        const currentChats = this.chats$.value;
        const chatType = this.sectionToChatType(section);

        // Filter chats by type
        const filteredChats = chats.filter((chat) => chat.type === chatType);

        console.log('Filtered chats for section:', filteredChats);

        // Clear existing chats for this section
        const existingChatIds = Array.from(currentChats.keys());
        existingChatIds.forEach((id) => {
          const existingChat = currentChats.get(id);
          if (existingChat && existingChat.type === chatType) {
            currentChats.delete(id);
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
      console.error('Error loading chats:', error);
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
      } catch (error) {
        console.error(`Error loading last message for chat ${chat.id}:`, error);
      }
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
        } catch (error) {
          console.error('Error loading last message:', error);
        }

        return chat;
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

        console.log('Raw messages from API:', response.messages);

        // Convert API date strings to Date objects with robust parsing
        const messages = response.messages.map((msg) => ({
          ...msg,
          createdAt: this.parseDate(msg.createdAt),
        }));

        console.log('Converted messages:', messages);

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
      console.error('Error loading messages:', error);
      this.notificationService.error('Failed to load messages');
    }
  }

  // Send a message with optimistic update
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

      console.log('Sending message:', request);

      // Send message and get response
      const sentMessage = await this.httpService
        .sendMessage(request)
        .toPromise();

      console.log('Message sent, response:', sentMessage);

      if (sentMessage) {
        // ✅ OPTIMISTIC UPDATE: Add message immediately from HTTP response
        const messageWithDate: Message = {
          ...sentMessage,
          createdAt: this.parseDate(sentMessage.createdAt),
        };

        // Add to messages immediately
        this.addMessage(messageWithDate);

        // Update chat's last message
        this.updateChatLastMessage(messageWithDate);

        console.log('Message added optimistically:', messageWithDate);
      }

      // SignalR will also send the message, but we have duplicate prevention
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
          .createClientToOperatorChatByOperator(
            participantId,
            this.getCurrentUserId()!
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
        console.log('Chat created:', chat);

        // ✅ Add to local state immediately
        const currentChats = this.chats$.value;
        currentChats.set(chat.id, chat);
        this.chats$.next(new Map(currentChats));

        console.log('Chat added to local state');

        // ✅ Trigger refresh of the chat list for the current section
        const currentSection = this.stateService.activeSection;
        const chatSection = this.chatTypeToSection(chat.type);

        // If the new chat belongs to the current section, it's already visible
        // If it's a different section, we might want to switch to it
        if (chatSection === currentSection) {
          console.log('Chat is in current section, already visible');
        } else {
          console.log('Chat is in different section:', chatSection);
        }

        // Open the new chat window
        this.stateService.openChatWindow(chat.id);

        this.notificationService.success('Chat created successfully');

        return chat;
      }

      throw new Error('Failed to create chat');
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
        console.log('Message received via SignalR:', message);
        // Convert date string to Date object
        const messageWithDate = {
          ...message,
          createdAt: this.parseDate(message.createdAt),
        };
        this.addMessage(messageWithDate);
        this.updateChatLastMessage(messageWithDate);
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
      console.log('Message added to local state:', message);
    } else {
      console.log('Message already exists, skipping:', message.id);
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
      console.log('Chat last message updated:', chat);
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
      case ChatSection.Group:
        return ChatType.OperatorGroup;
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
      case ChatType.OperatorGroup:
        return ChatSection.Group;
      default:
        return ChatSection.Client;
    }
  }
}
