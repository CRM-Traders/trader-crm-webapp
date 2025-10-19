import { inject, Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import {
  MessageReceivedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  UserTypingEvent,
  ChatReadEvent,
} from '../../models/chat/chat.model';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private chatHubConnection!: signalR.HubConnection;
  private authService = inject(AuthService);

  public messageReceived$ = new BehaviorSubject<MessageReceivedEvent | null>(
    null
  );
  public typingIndicator$ = new BehaviorSubject<UserTypingEvent | null>(null);
  public connectionStatus$ = new BehaviorSubject<string>('disconnected');
  public messageRead$ = new BehaviorSubject<ChatReadEvent | null>(null);
  public messageEdited$ = new BehaviorSubject<MessageEditedEvent | null>(null);
  public messageDeleted$ = new BehaviorSubject<MessageDeletedEvent | null>(
    null
  );
  public onlineStatusChanged$ = new BehaviorSubject<{
    userId: string;
    isOnline: boolean;
  } | null>(null);

  async initializeChatHub(): Promise<void> {
    const token = this.authService.getAccessToken();

    this.chatHubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubBaseUrl}/hubs/chat`, {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupChatHubEventHandlers();

    try {
      await this.chatHubConnection.start();
      this.connectionStatus$.next('connected');
      console.log('SignalR Connected');
    } catch (err) {
      console.error('ChatHub connection failed:', err);
      this.connectionStatus$.next('error');
      throw err;
    }
  }

  private setupChatHubEventHandlers(): void {
    // Server -> Client events matching backend
    this.chatHubConnection.on(
      'ReceiveMessage',
      (event: MessageReceivedEvent) => {
        console.log('Message received:', event);
        this.messageReceived$.next(event);
      }
    );

    this.chatHubConnection.on('MessageEdited', (event: MessageEditedEvent) => {
      console.log('Message edited:', event);
      this.messageEdited$.next(event);
    });

    this.chatHubConnection.on(
      'MessageDeleted',
      (event: MessageDeletedEvent) => {
        console.log('Message deleted:', event);
        this.messageDeleted$.next(event);
      }
    );

    this.chatHubConnection.on('UserTyping', (event: UserTypingEvent) => {
      this.typingIndicator$.next(event);
    });

    this.chatHubConnection.on('ChatMarkedAsRead', (event: ChatReadEvent) => {
      this.messageRead$.next(event);
    });

    this.chatHubConnection.on(
      'OnlineStatusChanged',
      (userId: string, isOnline: boolean) => {
        this.onlineStatusChanged$.next({ userId, isOnline });
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

  // Client -> Server methods matching backend
  async joinChat(chatId: string): Promise<void> {
    if (
      this.chatHubConnection?.state === signalR.HubConnectionState.Connected
    ) {
      try {
        console.log(chatId);

        await this.chatHubConnection.invoke('JoinChat', chatId);
        console.log(`Joined chat: ${chatId}`);
      } catch (error) {
        console.error('Error joining chat:', error);
      }
    }
  }

  async leaveChat(chatId: string): Promise<void> {
    if (
      this.chatHubConnection?.state === signalR.HubConnectionState.Connected
    ) {
      try {
        await this.chatHubConnection.invoke('LeaveChat', chatId);
        console.log(`Left chat: ${chatId}`);
      } catch (error) {
        console.error('Error leaving chat:', error);
      }
    }
  }

  async sendTypingIndicator(chatId: string, isTyping: boolean): Promise<void> {
    if (
      this.chatHubConnection?.state === signalR.HubConnectionState.Connected
    ) {
      try {
        console.log(chatId);
        await this.chatHubConnection.invoke('NotifyTyping', chatId, isTyping);
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    }
  }

  async markChatAsRead(chatId: string): Promise<void> {
    if (
      this.chatHubConnection?.state === signalR.HubConnectionState.Connected
    ) {
      try {
        console.log(this.chatHubConnection.baseUrl);
        await this.chatHubConnection.invoke('MarkChatAsRead', chatId);
      } catch (error) {
        console.error('Error marking chat as read:', error);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.chatHubConnection) {
      await this.chatHubConnection.stop();
    }
  }

  isConnected(): boolean {
    return (
      this.chatHubConnection?.state === signalR.HubConnectionState.Connected
    );
  }
}
