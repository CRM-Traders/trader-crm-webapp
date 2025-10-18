import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, forkJoin, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { UiStateService } from './ui-state.service';
import { SignalRService } from './signalr.service';
import { HttpService } from '../../../core/services/http.service';

import {
  ChatUser,
  CreateGroupChatRequest,
  ChatChannel,
  ChatWindow,
  MessageStatus,
  MessageType,
  AddParticipantRequest,
  ChatDetailsDto,
  ChatSummaryDto,
  ChatType,
  CloseChatRequest,
  CreateChatCommand,
  EditMessageRequest,
  MessageDto,
  OperatorStatus,
  PagedResult,
  ParticipantDto,
  ParticipantRole,
  SendMessageRequest,
  SendMessageWithFileRequest,
  SetStatusRequest,
  TransferChatRequest,
  TypingIndicatorRequest,
} from '../../models/chat/chat.model';

// Add interface for operators
export interface OperatorItem {
  id: string;
  value: string;
  fullName?: string;
  email?: string;
  department?: string;
  role?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  chatId?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

// Add interface for clients
export interface ClientItem {
  id: string;
  userId?: string;
  value: string;
  fullName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: 'online' | 'offline';
  chatId?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private uiStateService = inject(UiStateService);
  private http = inject(HttpService);
  private signalRService = inject(SignalRService);

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private chatUsersSubject = new BehaviorSubject<ChatUser[]>([]);
  public chatUsers$ = this.chatUsersSubject.asObservable();

  private activeChatsSubject = new BehaviorSubject<ChatSummaryDto[]>([]);
  public activeChats$ = this.activeChatsSubject.asObservable();

  // Add operators cache
  private operatorsCache = new BehaviorSubject<OperatorItem[]>([]);
  public operators$ = this.operatorsCache.asObservable();

  public openChats$ = this.uiStateService.chatState$.pipe(
    map((state) => state.openChats)
  );

  constructor() {
    this.initializeSignalR();
    this.setupSignalRListeners();
    this.loadInitialData();
  }

  private async initializeSignalR(): Promise<void> {
    try {
      await this.signalRService.initializeChatHub();
      const userRole = this.getUserRole();
      if (userRole === 'operator' || userRole === 'admin') {
        await this.signalRService.initializeOperatorHub();
      }
    } catch (error) {
      console.error('Failed to initialize SignalR:', error);
    }
  }

  private setupSignalRListeners(): void {
    this.signalRService.messageReceived$.subscribe((message: any) => {
      if (message) {
        this.handleNewMessage(message);
      }
    });

    this.signalRService.typingIndicator$.subscribe((data) => {
      if (data) {
        this.handleTypingIndicator(data);
      }
    });

    this.signalRService.chatStatusChanged$.subscribe((data) => {
      if (data) {
        this.handleChatStatusChange(data);
      }
    });

    this.signalRService.messageRead$.subscribe((data) => {
      if (data) {
        this.handleMessageRead(data);
      }
    });

    this.signalRService.newChatAssigned$.subscribe((data) => {
      if (data) {
        this.handleNewChatAssigned(data);
      }
    });
  }

  private loadInitialData(): void {
    this.getMyChats().subscribe();
    this.updateUnreadCount();
  }

  getMyChats(
    pageIndex: number = 1,
    pageSize: number = 20
  ): Observable<ChatSummaryDto[]> {
    const params = new HttpParams()
      .set('pageIndex', pageIndex.toString())
      .set('pageSize', pageSize.toString());

    return this.http
      .get<ChatSummaryDto[]>('chats/api/chats/my-chats', params)
      .pipe(
        tap((chats) => {
          this.activeChatsSubject.next(chats);
          this.calculateTotalUnreadCount(chats);
        }),
        catchError((error) => {
          console.error('Error loading chats:', error);
          return of([]);
        })
      );
  }

  getChatDetails(chatId: string): Observable<ChatDetailsDto> {
    return this.http.get<ChatDetailsDto>(`chats/api/chats/${chatId}`).pipe(
      tap((details) => {
        this.signalRService.joinChat(chatId);
        // Don't automatically mark messages as read here to avoid errors
        // this.markUnreadMessagesInChat(details);
      })
    );
  }

  searchChats(searchCriteria: any): Observable<PagedResult<ChatSummaryDto>> {
    let params = new HttpParams();

    Object.keys(searchCriteria).forEach((key) => {
      if (searchCriteria[key] !== null && searchCriteria[key] !== undefined) {
        params = params.set(key, searchCriteria[key].toString());
      }
    });

    return this.http.get<PagedResult<ChatSummaryDto>>(
      'chats/api/chats/search',
      params
    );
  }

  createChat(
    title: string,
    type: ChatType = ChatType.CustomerSupport,
    description?: string,
    targetOperatorId?: string
  ): Observable<string> {
    const request: CreateChatCommand = {
      title,
      type,
      description: description || null,
      priority: 2,
      targetOperatorId: targetOperatorId || null,
    };

    return this.http.post<string>('chats/api/chats', request).pipe(
      tap((chatId) => {
        this.signalRService.joinChat(chatId);
      })
    );
  }

  createGroupChat(
    title: string,
    description: string,
    participantIds: string[]
  ): Observable<string> {
    const request: CreateGroupChatRequest = {
      title,
      description,
      participantIds,
      priority: 1,
    };

    return this.http.post<string>('chats/api/chats/group', request).pipe(
      tap((chatId) => {
        this.signalRService.joinChat(chatId);
      })
    );
  }

  closeChat(chatId: string, reason?: string): Observable<void> {
    const request: CloseChatRequest = {
      reason: reason || 'Issue resolved',
    };

    return this.http.post<void>(`chats/api/chats/${chatId}/close`, request);
  }

  transferChat(
    chatId: string,
    newOperatorId: string,
    reason: string
  ): Observable<void> {
    const request: TransferChatRequest = {
      newOperatorId,
      reason,
    };

    return this.http
      .post<void>(`chats/api/chats/${chatId}/transfer`, request)
      .pipe(
        tap(() => {
          this.signalRService.leaveChat(chatId);
        })
      );
  }

  sendTypingIndicator(chatId: string, isTyping: boolean): Observable<void> {
    const request: TypingIndicatorRequest = { isTyping };
    this.signalRService.sendTypingIndicator(chatId, isTyping);
    return this.http.post<void>(`chats/api/chats/${chatId}/typing`, request);
  }

  getChatParticipants(chatId: string): Observable<ParticipantDto[]> {
    return this.http.get<ParticipantDto[]>(
      `chats/api/chats/${chatId}/participants`
    );
  }

  addParticipant(
    chatId: string,
    userId: string,
    role: ParticipantRole = ParticipantRole.Customer
  ): Observable<void> {
    const request: AddParticipantRequest = { userId, role };
    return this.http.post<void>(
      `chats/api/chats/${chatId}/participants`,
      request
    );
  }

  removeParticipant(chatId: string, userId: string): Observable<void> {
    return this.http
      .delete<void>(`chats/api/chats/${chatId}/participants/${userId}`)
      .pipe(
        tap(() => {
          if (userId === this.getCurrentUserId()) {
            this.signalRService.leaveChat(chatId);
          }
        })
      );
  }

  getChatMessages(
    chatId: string,
    pageIndex: number = 1,
    pageSize: number = 50
  ): Observable<PagedResult<MessageDto>> {
    const params = new HttpParams()
      .set('pageIndex', pageIndex.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<MessageDto>>(
      `chats/api/messages/chat/${chatId}`,
      params
    );
  }

  sendMessage(
    chatId: string,
    content: string,
    type: MessageType = MessageType.Text
  ): Observable<string> {
    const request: SendMessageRequest = {
      chatId,
      content,
      type,
    };

    return this.http.post<string>('chats/api/messages', request);
  }

  sendMessageWithFile(
    chatId: string,
    content: string,
    fileId: string
  ): Observable<string> {
    const request: SendMessageWithFileRequest = {
      chatId,
      content: content || 'File attachment',
      fileId,
    };

    return this.http.post<string>('chats/api/messages/with-file', request);
  }

  editMessage(messageId: string, newContent: string): Observable<void> {
    const request: EditMessageRequest = { newContent };
    return this.http.put<void>(`chats/api/messages/${messageId}`, request);
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`chats/api/messages/${messageId}`);
  }

  markMessageAsRead(messageId: string): Observable<void> {
    // Only try SignalR, skip the HTTP call that's failing
    // this.signalRService.markMessageAsRead(messageId);
    return of(void 0);
  }

  setOperatorStatus(status: OperatorStatus): Observable<void> {
    const request: SetStatusRequest = { status };
    return this.http.post<void>('chats/api/operators/status', request);
  }

  getOperatorChats(activeOnly: boolean = false): Observable<ChatSummaryDto[]> {
    const params = new HttpParams().set('activeOnly', activeOnly.toString());
    return this.http.get<ChatSummaryDto[]>(
      'chats/api/operators/my-chats',
      params
    );
  }

  getOperatorChatsByOperatorId(
    operatorId: string,
    activeOnly: boolean = false
  ): Observable<ChatSummaryDto[]> {
    const params = new HttpParams().set('activeOnly', activeOnly.toString());
    return this.http.get<ChatSummaryDto[]>(
      `chats/api/operators/${operatorId}/chats`,
      params
    );
  }

  // Add operator search methods
  searchOperators(
    searchTerm: string = '',
    pageIndex: number = 0,
    pageSize: number = 100
  ): Observable<OperatorItem[]> {
    const request = {
      pageIndex,
      pageSize,
      sortField: '',
      sortDirection: 'asc',
      globalFilter: searchTerm,
    };

    return this.http.post<any>('identity/api/operators/dropdown', request).pipe(
      map((response) => {
        const operators = response.items.map((item: any) => ({
          id: item.id,
          value: item.value || item.fullName || 'Unknown',
          fullName: item.value || item.fullName || 'Unknown',
          email: item.email || '',
          department: item.department || '',
          role: item.role || '',
          status: 'offline' as const,
        }));

        this.operatorsCache.next(operators);
        return operators;
      }),
      catchError((error) => {
        console.error('Error fetching operators:', error);
        return of([]);
      })
    );
  }

  getAvailableOperators(
    pageIndex: number = 0,
    pageSize: number = 100,
    searchTerm: string = ''
  ): Observable<OperatorItem[]> {
    return this.searchOperators(searchTerm, pageIndex, pageSize);
  }

  // Add client search methods
  searchClients(
    searchTerm: string = '',
    pageIndex: number = 0,
    pageSize: number = 100
  ): Observable<ClientItem[]> {
    const request = {
      searchTerm: searchTerm || null,
      pageIndex,
      pageSize,
    };

    return this.http.post<any>('identity/api/clients/clients-for-trading-manager', request).pipe(
      map((response) => {
        console.log('Client search response:', response);
        const clients = response.items?.map((item: any) => ({
          id: item.id,
          userId: item.userId,
          value: item.fullName || 'Unknown',
          fullName: item.fullName || 'Unknown',
          email: item.email || `${item.fullName?.toLowerCase().replace(/\s+/g, '.')}@client.com` || '',
          firstName: item.firstName || '',
          lastName: item.lastName || '',
          phone: item.phone || '',
          status: 'offline' as const,
        })) || [];

        return clients;
      }),
      catchError((error) => {
        console.error('Error fetching clients:', error);
        return of([]);
      })
    );
  }

  getAvailableClients(
    pageIndex: number = 0,
    pageSize: number = 100,
    searchTerm: string = ''
  ): Observable<ClientItem[]> {
    return this.searchClients(searchTerm, pageIndex, pageSize);
  }

  getChatUsers(channel: ChatChannel): Observable<ChatUser[]> {
    if (channel === 'operators') {
      return this.getOperatorUsers();
    } else {
      return this.getClientUsers();
    }
  }

  private getClientUsers(): Observable<ChatUser[]> {
    return this.getMyChats().pipe(
      map((chats) => this.mapChatsToUsers(chats, 'clients'))
    );
  }

  private getOperatorUsers(): Observable<ChatUser[]> {
    const userRole = this.getUserRole();
    if (userRole === 'operator' || userRole === 'admin') {
      return this.getOperatorChats().pipe(
        map((chats) => this.mapChatsToUsers(chats, 'operators'))
      );
    }
    return of([]);
  }

  private mapChatsToUsers(
    chats: ChatSummaryDto[],
    channel: ChatChannel
  ): ChatUser[] {
    return chats.map((chat) => ({
      id: chat.initiatorId,
      name: chat.title,
      email: `user_${chat.initiatorId}@example.com`,
      username: undefined,
      isOnline: true,
      lastMessage: chat.lastMessage || 'No messages yet',
      lastMessageTime: chat.lastActivityAt
        ? new Date(chat.lastActivityAt)
        : new Date(chat.createdAt),
      unreadCount: chat.unreadCount,
      channel: channel,
      avatar: undefined,
    }));
  }

  openChatWindow(chatData: any) {
    const currentState = this.uiStateService.getChatState();

    if (currentState.openChats.find((c) => c.user.id === chatData.user?.id)) {
      return;
    }

    const newChat: ChatWindow = {
      id: Date.now().toString(),
      user: chatData.user,
      isMinimized: false,
    };

    this.uiStateService.addOpenChat(newChat);
  }

  closeChatWindow(chatId: string) {
    const chat = this.uiStateService
      .getChatState()
      .openChats.find((c) => c.id === chatId);
    if (chat) {
      this.signalRService.leaveChat(chat.id);
    }
    this.uiStateService.removeOpenChat(chatId);
  }

  updateChatMinimizedState(chatId: string, isMinimized: boolean) {
    this.uiStateService.updateChatMinimizedState(chatId, isMinimized);
  }

  private calculateTotalUnreadCount(chats: ChatSummaryDto[]): void {
    const total = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
    this.unreadCountSubject.next(total);
  }

  private updateUnreadCount(): void {
    this.getMyChats().subscribe((chats) => {
      this.calculateTotalUnreadCount(chats);
    });
  }

  private markUnreadMessagesInChat(details: ChatDetailsDto): void {}

  private handleNewMessage(message: MessageDto): void {
    this.updateUnreadCount();
  }

  private handleTypingIndicator(data: any): void {}

  private handleChatStatusChange(data: any): void {
    this.getMyChats().subscribe();
  }

  private handleMessageRead(data: any): void {
    this.updateUnreadCount();
  }

  private handleNewChatAssigned(data: any): void {
    this.getMyChats().subscribe();
  }

  getLastActiveChannel(): ChatChannel {
    return this.uiStateService.getChatState().lastActiveChannel;
  }

  setActiveChannel(channel: ChatChannel) {
    this.uiStateService.setLastActiveChannel(channel);
  }

  searchUsers(query: string, channel?: ChatChannel): Observable<ChatUser[]> {
    return this.getChatUsers(channel || 'clients').pipe(
      map((users) => {
        if (!query) return users;
        const lowerQuery = query.toLowerCase();
        return users.filter(
          (user) =>
            user.name.toLowerCase().includes(lowerQuery) ||
            user.email.toLowerCase().includes(lowerQuery) ||
            (user.username && user.username.toLowerCase().includes(lowerQuery))
        );
      })
    );
  }

  markAsRead(userId: string): void {
    this.updateUnreadCount();
  }

  updateMessageStatus(messageId: string, status: MessageStatus): void {
    console.log('Updating message status:', messageId, status);
  }

  markMessageAsSeen(messageId: string): void {
    this.updateMessageStatus(messageId, MessageStatus.SEEN);
  }

  markMessageAsDelivered(messageId: string): void {
    this.updateMessageStatus(messageId, MessageStatus.DELIVERED);
  }

  getCurrentUserId(): string {
    const userData = sessionStorage.getItem('user_data');

    console.log(userData);
    return userData ? JSON.parse(userData).id : '';
  }

  private getUserRole(): string {
    const userData = sessionStorage.getItem('user_data');
    return userData ? JSON.parse(userData).role : 'client';
  }

  getCurrentUserName(): string {
    const userData = sessionStorage.getItem('user_data');
    return userData
      ? JSON.parse(userData).name || JSON.parse(userData).fullName || 'You'
      : 'You';
  }
}
