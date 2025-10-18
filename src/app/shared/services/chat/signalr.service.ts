import { inject, Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { MessageDto } from '../../models/chat/chat.model';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private chatHubConnection!: signalR.HubConnection;
  private operatorHubConnection!: signalR.HubConnection;
  private authService = inject(AuthService);

  public messageReceived$ = new BehaviorSubject<MessageDto | null>(null);
  public typingIndicator$ = new BehaviorSubject<any>(null);
  public chatStatusChanged$ = new BehaviorSubject<any>(null);
  public connectionStatus$ = new BehaviorSubject<string>('disconnected');
  public messageRead$ = new BehaviorSubject<any>(null);
  public messageEdited$ = new BehaviorSubject<any>(null);
  public messageDeleted$ = new BehaviorSubject<any>(null);
  public userJoinedChat$ = new BehaviorSubject<any>(null);
  public userLeftChat$ = new BehaviorSubject<any>(null);
  public newChatAssigned$ = new BehaviorSubject<any>(null);
  public workloadUpdate$ = new BehaviorSubject<any>(null);
  public operatorStatusChanged$ = new BehaviorSubject<any>(null);

  async initializeChatHub(): Promise<void> {
    const token = this.authService.getAccessToken();

    this.chatHubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubBaseUrl}/chat`, {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupChatHubEventHandlers();

    try {
      await this.chatHubConnection.start();
      this.connectionStatus$.next('connected');
    } catch (err) {
      console.error('ChatHub connection failed:', err);
      this.connectionStatus$.next('error');
      throw err;
    }
  }

  async initializeOperatorHub(): Promise<void> {
    const token = this.authService.getAccessToken();

    this.operatorHubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubBaseUrl}/operators`, {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupOperatorHubEventHandlers();

    try {
      await this.operatorHubConnection.start();
    } catch (err) {
      console.error('OperatorHub connection failed:', err);
      throw err;
    }
  }

  private setupChatHubEventHandlers(): void {
    this.chatHubConnection.on('ReceiveMessage', (message: MessageDto) => {
      this.messageReceived$.next(message);
    });

    this.chatHubConnection.on(
      'TypingIndicator',
      (data: { chatId: string; userId: string; isTyping: boolean }) => {
        this.typingIndicator$.next(data);
      }
    );

    this.chatHubConnection.on(
      'MessageRead',
      (data: { messageId: string; readBy: string; readAt: string }) => {
        this.messageRead$.next(data);
      }
    );

    this.chatHubConnection.on(
      'MessageEdited',
      (data: { messageId: string; newContent: string; editedAt: string }) => {
        this.messageEdited$.next(data);
      }
    );

    this.chatHubConnection.on(
      'MessageDeleted',
      (data: { messageId: string; chatId: string }) => {
        this.messageDeleted$.next(data);
      }
    );

    this.chatHubConnection.on(
      'ChatStatusChanged',
      (data: { chatId: string; newStatus: string }) => {
        this.chatStatusChanged$.next(data);
      }
    );

    this.chatHubConnection.on(
      'UserJoinedChat',
      (data: { chatId: string; userId: string; userName: string }) => {
        this.userJoinedChat$.next(data);
      }
    );

    this.chatHubConnection.on(
      'UserLeftChat',
      (data: { chatId: string; userId: string; userName: string }) => {
        this.userLeftChat$.next(data);
      }
    );

    this.chatHubConnection.onreconnecting(() => {
      this.connectionStatus$.next('reconnecting');
    });

    this.chatHubConnection.onreconnected(() => {
      this.connectionStatus$.next('connected');
    });

    this.chatHubConnection.onclose(() => {
      this.connectionStatus$.next('disconnected');
    });
  }

  private setupOperatorHubEventHandlers(): void {
    this.operatorHubConnection.on(
      'NewChatAssigned',
      (data: { chatId: string; title: string; customerId: string }) => {
        this.newChatAssigned$.next(data);
      }
    );

    this.operatorHubConnection.on(
      'WorkloadUpdate',
      (data: { activeChats: number; queuedChats: number }) => {
        this.workloadUpdate$.next(data);
      }
    );

    this.operatorHubConnection.on(
      'StatusChanged',
      (data: { operatorId: string; newStatus: string }) => {
        this.operatorStatusChanged$.next(data);
      }
    );

    this.operatorHubConnection.on(
      'ChatTransferred',
      (data: {
        chatId: string;
        fromOperatorId: string;
        toOperatorId: string;
      }) => {
        if (data.toOperatorId === this.getCurrentUserId()) {
          this.newChatAssigned$.next({
            chatId: data.chatId,
            title: 'Transferred Chat',
            customerId: '',
          });
        }
      }
    );
  }

  async joinChat(chatId: string): Promise<void> {
    if (
      this.chatHubConnection?.state === signalR.HubConnectionState.Connected
    ) {
      await this.chatHubConnection.invoke('JoinChat', chatId);
    }
  }

  async leaveChat(chatId: string): Promise<void> {
    if (
      this.chatHubConnection?.state === signalR.HubConnectionState.Connected
    ) {
      await this.chatHubConnection.invoke('LeaveChat', chatId);
    }
  }

  async sendTypingIndicator(chatId: string, isTyping: boolean): Promise<void> {
    if (
      this.chatHubConnection?.state === signalR.HubConnectionState.Connected
    ) {
      await this.chatHubConnection.invoke('SendTyping', chatId, isTyping);
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    if (
      this.chatHubConnection?.state === signalR.HubConnectionState.Connected
    ) {
      await this.chatHubConnection.invoke('MarkAsRead', messageId);
    }
  }

  async disconnect(): Promise<void> {
    if (this.chatHubConnection) {
      await this.chatHubConnection.stop();
    }
    if (this.operatorHubConnection) {
      await this.operatorHubConnection.stop();
    }
  }

  private getCurrentUserId(): string {
    const userData = sessionStorage.getItem('user_data');
    return userData ? JSON.parse(userData).id : '';
  }

  isConnected(): boolean {
    return (
      this.chatHubConnection?.state === signalR.HubConnectionState.Connected
    );
  }

  isOperatorHubConnected(): boolean {
    return (
      this.operatorHubConnection?.state === signalR.HubConnectionState.Connected
    );
  }
}
