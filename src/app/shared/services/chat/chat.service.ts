// src/app/core/services/chat.service.ts

import { Injectable, inject, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  map,
  takeUntil,
  tap,
  catchError,
  of,
} from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { HttpService } from '../../../core/services/http.service';
import { SocketService } from '../../../core/services/socket.service';
import {
  ChatUser,
  ChatConversation,
  ChatMessage,
  ChatNotification,
} from '../../models/chat/chat.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
  private httpService = inject(HttpService);
  private socketService = inject(SocketService);
  private authService = inject(AuthService);

  private destroy$ = new Subject<void>();

  // State management
  private usersSubject = new BehaviorSubject<ChatUser[]>([]);
  private conversationsSubject = new BehaviorSubject<ChatConversation[]>([]);
  private activeConversationSubject = new BehaviorSubject<string | null>(null);
  private messagesSubject = new BehaviorSubject<Map<string, ChatMessage[]>>(
    new Map()
  );
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationsSubject = new BehaviorSubject<ChatNotification[]>([]);
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  users$ = this.usersSubject.asObservable();
  conversations$ = this.conversationsSubject.asObservable();
  activeConversation$ = this.activeConversationSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();
  notifications$ = this.notificationsSubject.asObservable();
  isOpen$ = this.isOpenSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  currentMessages$ = combineLatest([
    this.messagesSubject,
    this.activeConversation$,
  ]).pipe(
    map(([messagesMap, activeId]) => {
      if (!activeId) return [];
      return messagesMap.get(activeId) || [];
    })
  );

  private currentUserId: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.authService.hasValidToken()) {
      this.connectToChat();
      this.loadInitialData();
    }

    if (this.authService.isAuthenticated()) {
      this.connectToChat();
      this.loadInitialData();
    } else {
      this.disconnect();
      this.clearData();
    }
  }

  private connectToChat(): void {
    this.socketService
      .connect('chat', {
        url: 'wss://api.example.com/chat',
        reconnectAttempts: 10,
        reconnectInterval: 5000,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.socketService
      .messagesOfType('chat', 'message')
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => this.handleIncomingMessage(message));

    this.socketService
      .messagesOfType('chat', 'user-status')
      .pipe(takeUntil(this.destroy$))
      .subscribe((update) => this.handleUserStatusUpdate(update));

    this.socketService
      .messagesOfType('chat', 'typing')
      .pipe(takeUntil(this.destroy$))
      .subscribe((typing) => this.handleTypingIndicator(typing));
  }

  private loadInitialData(): void {
    this.loadingSubject.next(true);

    this.httpService
      .get<{ userId: string }>('auth/me')
      .pipe(
        tap((data) => (this.currentUserId = data.userId)),
        catchError(() => of({ userId: null }))
      )
      .subscribe();

    this.loadUsers();

    this.loadConversations();

    this.loadingSubject.next(false);
  }

  loadUsers(): void {
    this.httpService
      .get<ChatUser[]>('chat/users')
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([]))
      )
      .subscribe((users) => {
        this.usersSubject.next(users);
      });
  }

  loadConversations(): void {
    this.httpService
      .get<ChatConversation[]>('chat/conversations')
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([]))
      )
      .subscribe((conversations) => {
        this.conversationsSubject.next(conversations);
        this.updateUnreadCount(conversations);
      });
  }

  loadMessages(conversationId: string): Observable<ChatMessage[]> {
    const cached = this.messagesSubject.getValue().get(conversationId);
    if (cached && cached.length > 0) {
      return of(cached);
    }

    return this.httpService
      .get<ChatMessage[]>(`chat/conversations/${conversationId}/messages`)
      .pipe(
        tap((messages) => {
          const currentMap = this.messagesSubject.getValue();
          currentMap.set(conversationId, messages);
          this.messagesSubject.next(new Map(currentMap));
        }),
        catchError(() => of([]))
      );
  }

  sendMessage(
    conversationId: string,
    content: string
  ): Observable<ChatMessage> {
    const message = {
      conversationId,
      content,
      timestamp: new Date(),
    };

    // Send via WebSocket for real-time delivery
    this.socketService.send('chat', {
      type: 'message',
      payload: message,
    });

    // Also send via HTTP for persistence
    return this.httpService
      .post<ChatMessage>(`chat/conversations/${conversationId}/messages`, {
        content,
      })
      .pipe(
        tap((sentMessage) => {
          this.addMessageToConversation(conversationId, sentMessage);
        }),
        catchError((error) => {
          console.error('Failed to send message:', error);
          throw error;
        })
      );
  }

  createOrGetConversation(userId: string): Observable<string> {
    return this.httpService
      .post<{ conversationId: string }>('chat/conversations', {
        participantId: userId,
      })
      .pipe(
        map((response) => response.conversationId),
        tap((conversationId) => {
          this.setActiveConversation(conversationId);
          this.loadConversations();
        })
      );
  }

  setActiveConversation(conversationId: string | null): void {
    this.activeConversationSubject.next(conversationId);

    if (conversationId) {
      this.loadMessages(conversationId).subscribe();
      this.markConversationAsRead(conversationId);
    }
  }

  markConversationAsRead(conversationId: string): void {
    this.httpService
      .post<void>(`chat/conversations/${conversationId}/read`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const conversations = this.conversationsSubject.getValue();
        const updated = conversations.map((conv) =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        );
        this.conversationsSubject.next(updated);
        this.updateUnreadCount(updated);
      });
  }

  toggleChat(): void {
    const isOpen = !this.isOpenSubject.getValue();
    this.isOpenSubject.next(isOpen);

    if (isOpen && this.authService.hasValidToken()) {
      this.loadConversations();
    }
  }

  closeChat(): void {
    this.isOpenSubject.next(false);
    this.activeConversationSubject.next(null);
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    this.socketService.send('chat', {
      type: 'typing',
      payload: { conversationId, isTyping },
    });
  }

  private handleIncomingMessage(message: ChatMessage): void {
    // Add to messages
    this.addMessageToConversation(message.conversationId, message);

    // Update conversation last message
    const conversations = this.conversationsSubject.getValue();
    const updated = conversations.map((conv) =>
      conv.id === message.conversationId
        ? { ...conv, lastMessage: message, updatedAt: new Date() }
        : conv
    );
    this.conversationsSubject.next(updated);

    // Add notification if not in active conversation
    if (message.conversationId !== this.activeConversationSubject.getValue()) {
      this.addNotification({
        conversationId: message.conversationId,
        messageId: message.id,
        senderUsername: message.senderUsername,
        preview:
          message.content.substring(0, 50) +
          (message.content.length > 50 ? '...' : ''),
        timestamp: new Date(),
      });

      // Update unread count
      const conversation = conversations.find(
        (c) => c.id === message.conversationId
      );
      if (conversation) {
        conversation.unreadCount++;
        this.updateUnreadCount(conversations);
      }
    }
  }

  private handleUserStatusUpdate(update: {
    userId: string;
    status: 'online' | 'offline' | 'away';
  }): void {
    const users = this.usersSubject.getValue();
    const updated = users.map((user) =>
      user.id === update.userId
        ? { ...user, status: update.status, lastSeen: new Date() }
        : user
    );
    this.usersSubject.next(updated);
  }

  private handleTypingIndicator(typing: {
    userId: string;
    conversationId: string;
    isTyping: boolean;
  }): void {
    // Handle typing indicators - could emit to a separate observable if needed
  }

  private addMessageToConversation(
    conversationId: string,
    message: ChatMessage
  ): void {
    const currentMap = this.messagesSubject.getValue();
    const messages = currentMap.get(conversationId) || [];

    // Check if message already exists to avoid duplicates
    if (!messages.find((m) => m.id === message.id)) {
      currentMap.set(conversationId, [...messages, message]);
      this.messagesSubject.next(new Map(currentMap));
    }
  }

  private addNotification(notification: ChatNotification): void {
    const current = this.notificationsSubject.getValue();
    this.notificationsSubject.next([notification, ...current].slice(0, 10)); // Keep last 10
  }

  private updateUnreadCount(conversations: ChatConversation[]): void {
    const totalUnread = conversations.reduce(
      (sum, conv) => sum + conv.unreadCount,
      0
    );
    this.unreadCountSubject.next(totalUnread);
  }

  private disconnect(): void {
    this.socketService.disconnect('chat');
  }

  private clearData(): void {
    this.usersSubject.next([]);
    this.conversationsSubject.next([]);
    this.messagesSubject.next(new Map());
    this.activeConversationSubject.next(null);
    this.unreadCountSubject.next(0);
    this.notificationsSubject.next([]);
    this.isOpenSubject.next(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
