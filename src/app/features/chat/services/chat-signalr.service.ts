import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { Message, Chat } from '../models/chat.model';
import {
  UserTypingEvent,
  SendMessageRequest,
  EditMessageRequest,
  AddParticipantsRequest,
} from '../models/signalr.model';

@Injectable({
  providedIn: 'root',
})
export class ChatSignalRService {
  private authService = inject(AuthService);

  private hubConnection: signalR.HubConnection | null = null;
  private connectionState$ = new BehaviorSubject<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );

  // Event streams
  private messageReceived$ = new Subject<Message>();
  private messageEdited$ = new Subject<Message>();
  private messageDeleted$ = new Subject<{
    messageId: string;
    chatId: string;
  }>();
  private chatUpdated$ = new Subject<Chat>();
  private userTyping$ = new Subject<UserTypingEvent>();
  private onlineStatusChanged$ = new Subject<{
    userId: string;
    isOnline: boolean;
  }>();
  private participantsAdded$ = new Subject<{
    chatId: string;
    participants: any[];
  }>();

  constructor() {
    if (environment.enableChatHub) {
      this.initializeConnection();
    }
  }

  // Public observables
  get connectionState(): Observable<signalR.HubConnectionState> {
    return this.connectionState$.asObservable();
  }

  get onMessageReceived(): Observable<Message> {
    return this.messageReceived$.asObservable();
  }

  get onMessageEdited(): Observable<Message> {
    return this.messageEdited$.asObservable();
  }

  get onMessageDeleted(): Observable<{ messageId: string; chatId: string }> {
    return this.messageDeleted$.asObservable();
  }

  get onChatUpdated(): Observable<Chat> {
    return this.chatUpdated$.asObservable();
  }

  get onUserTyping(): Observable<UserTypingEvent> {
    return this.userTyping$.asObservable();
  }

  get onOnlineStatusChanged(): Observable<{
    userId: string;
    isOnline: boolean;
  }> {
    return this.onlineStatusChanged$.asObservable();
  }

  get onParticipantsAdded(): Observable<{
    chatId: string;
    participants: any[];
  }> {
    return this.participantsAdded$.asObservable();
  }

  private initializeConnection(): void {
    const token = this.authService.getAccessToken();

    if (!token) {
      console.warn('No auth token available for SignalR connection');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubBaseUrl}/hubs${environment.chatHub}`, {
        accessTokenFactory: () => token,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.ServerSentEvents,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0s, 2s, 10s, 30s, then 30s
          if (retryContext.elapsedMilliseconds < 60000) {
            return Math.min(
              1000 * Math.pow(2, retryContext.previousRetryCount),
              30000
            );
          }
          return 30000;
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupEventHandlers();
    this.setupConnectionHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // Message events
    this.hubConnection.on('ReceiveMessage', (message: Message) => {
      this.messageReceived$.next(message);
    });

    this.hubConnection.on('MessageEdited', (message: Message) => {
      this.messageEdited$.next(message);
    });

    this.hubConnection.on(
      'MessageDeleted',
      (messageId: string, chatId: string) => {
        this.messageDeleted$.next({ messageId, chatId });
      }
    );

    // Chat events
    this.hubConnection.on('ChatUpdated', (chat: Chat) => {
      this.chatUpdated$.next(chat);
    });

    // Typing indicator
    this.hubConnection.on('UserTyping', (event: UserTypingEvent) => {
      this.userTyping$.next(event);
    });

    // Online status
    this.hubConnection.on(
      'OnlineStatusChanged',
      (userId: string, isOnline: boolean) => {
        this.onlineStatusChanged$.next({ userId, isOnline });
      }
    );

    // Group chat events
    this.hubConnection.on(
      'ParticipantsAdded',
      (chatId: string, participants: any[]) => {
        this.participantsAdded$.next({ chatId, participants });
      }
    );
  }

  private setupConnectionHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.onclose((error) => {
      console.error('SignalR connection closed', error);
      this.connectionState$.next(signalR.HubConnectionState.Disconnected);
    });

    this.hubConnection.onreconnecting((error) => {
      console.warn('SignalR reconnecting...', error);
      this.connectionState$.next(signalR.HubConnectionState.Reconnecting);
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('SignalR reconnected', connectionId);
      this.connectionState$.next(signalR.HubConnectionState.Connected);
    });
  }

  async start(): Promise<void> {
    if (!this.hubConnection) {
      console.warn('Hub connection not initialized');
      return;
    }

    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.hubConnection.start();
      this.connectionState$.next(signalR.HubConnectionState.Connected);
      console.log('SignalR Connected');
    } catch (error) {
      console.error('Error starting SignalR connection:', error);
      this.connectionState$.next(signalR.HubConnectionState.Disconnected);

      // Retry connection after 5 seconds
      setTimeout(() => this.start(), 5000);
    }
  }

  async stop(): Promise<void> {
    if (!this.hubConnection) return;

    try {
      await this.hubConnection.stop();
      this.connectionState$.next(signalR.HubConnectionState.Disconnected);
      console.log('SignalR Disconnected');
    } catch (error) {
      console.error('Error stopping SignalR connection:', error);
    }
  }

  // Hub method invocations
  async sendMessage(request: SendMessageRequest): Promise<void> {
    return this.invoke('SendMessage', request);
  }

  async editMessage(
    messageId: string,
    request: EditMessageRequest
  ): Promise<void> {
    return this.invoke('EditMessage', messageId, request);
  }

  async deleteMessage(messageId: string, chatId: string): Promise<void> {
    return this.invoke('DeleteMessage', messageId, chatId);
  }

  async joinChat(chatId: string): Promise<void> {
    return this.invoke('JoinChat', chatId);
  }

  async leaveChat(chatId: string): Promise<void> {
    return this.invoke('LeaveChat', chatId);
  }

  async markChatAsRead(chatId: string): Promise<void> {
    return this.invoke('MarkChatAsRead', chatId);
  }

  async notifyTyping(chatId: string, isTyping: boolean): Promise<void> {
    return this.invoke('NotifyTyping', chatId, isTyping);
  }

  async addParticipantsToGroup(
    chatId: string,
    request: AddParticipantsRequest
  ): Promise<void> {
    return this.invoke('AddParticipantsToGroup', chatId, request);
  }

  private async invoke(methodName: string, ...args: any[]): Promise<any> {
    if (
      !this.hubConnection ||
      this.hubConnection.state !== signalR.HubConnectionState.Connected
    ) {
      throw new Error('SignalR connection is not established');
    }

    try {
      return await this.hubConnection.invoke(methodName, ...args);
    } catch (error) {
      console.error(`Error invoking ${methodName}:`, error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }
}
