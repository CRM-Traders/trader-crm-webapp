import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { HttpService } from '../../../core/services/http.service';
import {
  ChatDto,
  MessageDto,
  ChatMessagesResponse,
  SendMessageRequest,
  EditMessageRequest,
  CreateClientToOperatorChatRequest,
  CreateOperatorToOperatorChatRequest,
  CreateOperatorGroupChatRequest,
  AddParticipantsRequest,
  MessageType,
  OperatorItem,
  ClientItem,
} from '../../models/chat/chat.model';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpService);
  private auth = inject(AuthService);

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private activeChatsSubject = new BehaviorSubject<ChatDto[]>([]);
  public activeChats$ = this.activeChatsSubject.asObservable();

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.getMyChats().subscribe();
  }

  getMyChats(): Observable<ChatDto[]> {
    return this.http.get<ChatDto[]>('chats/api/chats').pipe(
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

  getChatById(chatId: string): Observable<ChatDto> {
    return this.http.get<ChatDto>(`chats/api/chats/${chatId}`);
  }

  getChatMessages(
    chatId: string,
    pageNumber: number = 1,
    pageSize: number = 50
  ): Observable<ChatMessagesResponse> {
    return this.http.get<ChatMessagesResponse>(
      `chats/api/chats/${chatId}/messages?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
  }

  createClientToOperatorChat(initialMessage: string): Observable<ChatDto> {
    const request: CreateClientToOperatorChatRequest = { initialMessage };
    return this.http.post<ChatDto>(
      'chats/api/chats/client-to-operator',
      request
    );
  }

  createOperatorToOperatorChat(
    targetOperatorId: string,
    initialMessage?: string
  ): Observable<ChatDto> {
    const request: CreateOperatorToOperatorChatRequest = {
      targetOperatorId,
      initialMessage,
    };
    return this.http.post<ChatDto>(
      'chats/api/chats/operator-to-operator',
      request
    );
  }

  createOperatorGroupChat(
    groupName: string,
    operatorIds: string[]
  ): Observable<ChatDto> {
    const request: CreateOperatorGroupChatRequest = { groupName, operatorIds };
    return this.http.post<ChatDto>('chats/api/chats/operator-group', request);
  }

  addParticipantsToGroup(
    chatId: string,
    operatorIds: string[]
  ): Observable<void> {
    const request: AddParticipantsRequest = { operatorIds };
    return this.http.post<void>(
      `chats/api/chats/${chatId}/participants`,
      request
    );
  }

  // Message operations
  sendMessage(
    chatId: string,
    content: string,
    fileIds?: string[]
  ): Observable<MessageDto> {
    const request: SendMessageRequest = {
      chatId,
      content,
      messageType:
        fileIds && fileIds.length > 0 ? MessageType.File : MessageType.Text,
      fileIds,
    };
    return this.http.post<MessageDto>('chats/api/chats/messages', request);
  }

  editMessage(messageId: string, content: string): Observable<MessageDto> {
    const request: EditMessageRequest = { content };
    return this.http.put<MessageDto>(
      `chats/api/chats/messages/${messageId}`,
      request
    );
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`chats/api/chats/messages/${messageId}`);
  }

  markChatAsRead(chatId: string): Observable<void> {
    return this.http.post<void>(`chats/api/chats/${chatId}/read`, {});
  }

  // Operator search
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
        return response.items.map((item: any) => ({
          id: item.userId,
          name: item.value || item.fullName || 'Unknown',
          email: item.email || '',
          department: item.department || '',
          role: item.role || '',
          status: 'offline' as const,
        }));
      }),
      catchError((error) => {
        console.error('Error fetching operators:', error);
        return of([]);
      })
    );
  }

  // Client search
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

    return this.http
      .post<any>('identity/api/clients/clients-for-trading-manager', request)
      .pipe(
        map((response) => {
          return (
            response.items?.map((item: any) => ({
              id: item.id,
              userId: item.userId,
              name: item.fullName || 'Unknown',
              email:
                item.email ||
                `${item.fullName
                  ?.toLowerCase()
                  .replace(/\s+/g, '.')}@client.com` ||
                '',
              status: 'offline' as const,
            })) || []
          );
        }),
        catchError((error) => {
          console.error('Error fetching clients:', error);
          return of([]);
        })
      );
  }

  // File upload
  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    // This should call your file storage microservice
    const response = await fetch(`${this.http['_apiUrl']}/api/files/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    return await response.text(); // Returns fileId
  }

  private calculateTotalUnreadCount(chats: ChatDto[]): void {
    const total = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
    this.unreadCountSubject.next(total);
  }

  private getAccessToken() {
    return this.auth.getAccessToken();
  }

  getCurrentUserId(): string {
    return this.auth.getUserId();
  }

  getCurrentUserName(): string {
    return this.auth.getName();
  }

  getCurrentUserType(): number {
    return this.auth.getRole() === 'Operator' ? 2 : 1;
  }
}
