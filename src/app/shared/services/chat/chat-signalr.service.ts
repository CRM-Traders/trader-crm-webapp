import { Injectable, inject } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MessageDto } from '../../models/chat/chat-system.model';

export interface ChatHubEvents {
  NewMessage: MessageDto;
  MessageEdited: { messageId: string; newContent: string; editedAt: Date };
  MessageDeleted: { messageId: string };
  UserTyping: { userId: string; chatId: string };
  UserJoinedChat: { userId: string; chatId: string };
  UserLeftChat: { userId: string; chatId: string };
  ChatClosed: { chatId: string; closedBy: string; reason?: string };
  ChatTransferred: {
    chatId: string;
    fromOperatorId: string;
    toOperatorId: string;
  };
  ParticipantAdded: { chatId: string; userId: string };
  ParticipantRemoved: { chatId: string; userId: string };
}

@Injectable({
  providedIn: 'root',
})
export class ChatSignalRService {
  private hubConnection?: HubConnection;
  private connectionState = new BehaviorSubject<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');

  // Event subjects
  private newMessageSubject = new Subject<MessageDto>();
  private messageEditedSubject = new Subject<{
    messageId: string;
    newContent: string;
    editedAt: Date;
  }>();
  private messageDeletedSubject = new Subject<{ messageId: string }>();
  private userTypingSubject = new Subject<{ userId: string; chatId: string }>();
  private userJoinedChatSubject = new Subject<{
    userId: string;
    chatId: string;
  }>();
  private userLeftChatSubject = new Subject<{
    userId: string;
    chatId: string;
  }>();
  private chatClosedSubject = new Subject<{
    chatId: string;
    closedBy: string;
    reason?: string;
  }>();
  private chatTransferredSubject = new Subject<{
    chatId: string;
    fromOperatorId: string;
    toOperatorId: string;
  }>();
  private participantAddedSubject = new Subject<{
    chatId: string;
    userId: string;
  }>();
  private participantRemovedSubject = new Subject<{
    chatId: string;
    userId: string;
  }>();

  // Public observables
  connectionState$ = this.connectionState.asObservable();
  newMessage$ = this.newMessageSubject.asObservable();
  messageEdited$ = this.messageEditedSubject.asObservable();
  messageDeleted$ = this.messageDeletedSubject.asObservable();
  userTyping$ = this.userTypingSubject.asObservable();
  userJoinedChat$ = this.userJoinedChatSubject.asObservable();
  userLeftChat$ = this.userLeftChatSubject.asObservable();
  chatClosed$ = this.chatClosedSubject.asObservable();
  chatTransferred$ = this.chatTransferredSubject.asObservable();
  participantAdded$ = this.participantAddedSubject.asObservable();
  participantRemoved$ = this.participantRemovedSubject.asObservable();

  async connect(accessToken: string): Promise<void> {
    if (this.hubConnection?.state === 'Connected') {
      return;
    }

    this.connectionState.next('connecting');

    try {
      this.hubConnection = new HubConnectionBuilder()
        .withUrl(`${environment.socketDomain}/hubs/chat`, {
          accessTokenFactory: () => accessToken,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Information)
        .build();

      this.setupEventHandlers();

      await this.hubConnection.start();
      this.connectionState.next('connected');

      console.log('Connected to Chat Hub');
    } catch (error) {
      console.error('Failed to connect to Chat Hub:', error);
      this.connectionState.next('disconnected');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.connectionState.next('disconnected');
    }
  }

  async joinChatGroup(chatId: string): Promise<void> {
    if (this.hubConnection?.state !== 'Connected') {
      throw new Error('Not connected to chat hub');
    }

    await this.hubConnection.invoke('JoinGroup', chatId);
  }

  async leaveChatGroup(chatId: string): Promise<void> {
    if (this.hubConnection?.state !== 'Connected') {
      throw new Error('Not connected to chat hub');
    }

    await this.hubConnection.invoke('LeaveGroup', chatId);
  }

  async sendTypingIndicator(
    chatId?: string,
    receiverId?: string
  ): Promise<void> {
    if (this.hubConnection?.state !== 'Connected') {
      throw new Error('Not connected to chat hub');
    }

    await this.hubConnection.invoke('SendTyping', receiverId, chatId);
  }

  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // Message events
    this.hubConnection.on('NewMessage', (message: MessageDto) => {
      this.newMessageSubject.next(message);
    });

    this.hubConnection.on(
      'MessageEdited',
      (data: { messageId: string; newContent: string; editedAt: Date }) => {
        this.messageEditedSubject.next(data);
      }
    );

    this.hubConnection.on('MessageDeleted', (data: { messageId: string }) => {
      this.messageDeletedSubject.next(data);
    });

    // User events
    this.hubConnection.on('UserTyping', (userId: string, chatId: string) => {
      this.userTypingSubject.next({ userId, chatId });
    });

    this.hubConnection.on(
      'UserJoinedChat',
      (data: { userId: string; chatId: string }) => {
        this.userJoinedChatSubject.next(data);
      }
    );

    this.hubConnection.on(
      'UserLeftChat',
      (data: { userId: string; chatId: string }) => {
        this.userLeftChatSubject.next(data);
      }
    );

    // Chat events
    this.hubConnection.on(
      'ChatClosed',
      (data: { chatId: string; closedBy: string; reason?: string }) => {
        this.chatClosedSubject.next(data);
      }
    );

    this.hubConnection.on(
      'ChatTransferred',
      (data: {
        chatId: string;
        fromOperatorId: string;
        toOperatorId: string;
      }) => {
        this.chatTransferredSubject.next(data);
      }
    );

    // Participant events
    this.hubConnection.on(
      'ParticipantAdded',
      (data: { chatId: string; userId: string }) => {
        this.participantAddedSubject.next(data);
      }
    );

    this.hubConnection.on(
      'ParticipantRemoved',
      (data: { chatId: string; userId: string }) => {
        this.participantRemovedSubject.next(data);
      }
    );

    this.hubConnection.onreconnecting(() => {
      this.connectionState.next('connecting');
    });

    this.hubConnection.onreconnected(() => {
      this.connectionState.next('connected');
    });

    this.hubConnection.onclose(() => {
      this.connectionState.next('disconnected');
    });
  }
}
