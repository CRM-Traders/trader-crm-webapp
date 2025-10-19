import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import {
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  filter,
} from 'rxjs/operators';
import { ChatService } from '../../services/chat/chat.service';
import { SignalRService } from '../../services/chat/signalr.service';
import { AlertService } from '../../../core/services/alert.service';
import {
  ChatDto,
  MessageDto,
  ChatType,
  MessageType,
  UserType,
  OperatorItem,
  ClientItem,
} from '../../models/chat/chat.model';
import { SoundNotificationService } from '../../services/chat/sound-notification.service';

interface Client {
  id: string;
  userId?: string;
  name: string;
  email: string;
  status: 'online' | 'offline';
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  chatId?: string;
}

interface Operator {
  id: string;
  chatId?: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'online' | 'away' | 'busy' | 'offline';
}

type ActiveTab = 'clients' | 'operators';

@Component({
  selector: 'app-employee-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-chat.component.html',
  styleUrl: './employee-chat.component.scss',
})
export class EmployeeChatComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  private chatService = inject(ChatService);
  private signalRService = inject(SignalRService);
  private soundService = inject(SoundNotificationService);
  private changeDetector = inject(ChangeDetectorRef);
  private alertService = inject(AlertService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();
  private typingSubject = new Subject<boolean>();
  private searchSubject = new Subject<string>();
  private shouldScrollToBottom = true;
  private typingTimer: any;
  private currentChatId: string | null = null;
  private lastTypingSoundTime = 0;
  private typingSoundThrottle = 200; // ms between typing sounds

  selectedChat: ChatDto | null = null;
  currentMessages: MessageDto[] = [];
  typingUsers: Map<string, boolean> = new Map();
  loading = false;
  connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  totalUnreadCount = 0;

  activeTab: ActiveTab = 'clients';
  clients: Client[] = [];
  operators: Operator[] = [];
  filteredClients: Client[] = [];
  filteredOperators: Operator[] = [];

  messageText = '';
  searchQuery = '';
  selectedUser: Client | Operator | null = null;
  isSendingMessage = false;
  isCurrentUserTyping = false;

  showOperatorSearchDropdown = false;
  searchDropdownOperators: Operator[] = [];

  showClientSearchDropdown = false;
  searchDropdownClients: Client[] = [];

  selectedFile: File | null = null;
  isUploadingFile = false;
  MAX_FILE_SIZE = 10 * 1024 * 1024;
  ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
  ];

  currentUserId: string = '';
  currentUserName: string = '';
  currentUserType: number = 1;

  // Sound settings
  isSoundMuted = false;
  soundVolume = 0.5;

  ngOnInit(): void {
    this.currentUserId = this.chatService.getCurrentUserId();
    this.currentUserName = this.chatService.getCurrentUserName();
    this.currentUserType = this.chatService.getCurrentUserType();

    // Load sound preferences
    this.isSoundMuted = this.soundService.isSoundMuted();
    this.soundVolume = this.soundService.getVolume();

    this.initializeServices();
    this.setupSubscriptions();
    this.setupTypingIndicator();
    this.setupSearch();
    this.loadInitialData();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    if (this.currentChatId) {
      this.signalRService.leaveChat(this.currentChatId);
    }

    if (this.isCurrentUserTyping) {
      this.typingSubject.next(false);
    }

    this.destroy$.next();
    this.destroy$.complete();
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      await this.signalRService.initializeChatHub();
      // Resume audio context on user interaction
      await this.soundService.resumeAudioContext();
      this.setupSignalRListeners();
    } catch (error) {
      console.error('Failed to initialize SignalR:', error);
      this.alertService.error(
        'Failed to connect to chat server. Please refresh the page.'
      );
    }
  }

  private setupSignalRListeners(): void {
    // Connection status
    this.signalRService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.connectionState = status as any;
        this.changeDetector.markForCheck();
      });

    // Message received
    this.signalRService.messageReceived$
      .pipe(
        takeUntil(this.destroy$),
        filter((event) => event !== null)
      )
      .subscribe((event) => {
        if (event) {
          // Play sound for incoming messages from others
          if (event.message.senderId !== this.currentUserId) {
            this.soundService.playMessageReceived();
          }

          if (this.selectedChat && event.chatId === this.selectedChat.id) {
            this.handleIncomingMessage(event.message);
          }

          this.updateChatListWithNewMessage(event.chatId, event.message);
          this.loadChatsAndUpdateCounts();
        }
      });

    // Typing indicator
    this.signalRService.typingIndicator$
      .pipe(
        takeUntil(this.destroy$),
        filter((data) => data !== null)
      )
      .subscribe((data) => {
        if (data && this.selectedChat && data.chatId === this.selectedChat.id) {
          if (data.userId !== this.currentUserId) {
            if (data.isTyping) {
              this.typingUsers.set(data.userId, true);
              // Play typing sound when someone starts typing
              this.soundService.playTyping();
            } else {
              this.typingUsers.delete(data.userId);
            }
            this.changeDetector.markForCheck();
          }
        }
      });

    // Message edited
    this.signalRService.messageEdited$
      .pipe(
        takeUntil(this.destroy$),
        filter((data) => data !== null)
      )
      .subscribe((data) => {
        if (data && this.selectedChat && data.chatId === this.selectedChat.id) {
          const message = this.currentMessages.find(
            (m) => m.id === data.messageId
          );
          if (message) {
            message.content = data.content;
            message.isEdited = true;
            message.updatedAt = data.updatedAt;
            this.changeDetector.markForCheck();
          }
        }
      });

    // Message deleted
    this.signalRService.messageDeleted$
      .pipe(
        takeUntil(this.destroy$),
        filter((data) => data !== null)
      )
      .subscribe((data) => {
        if (data && this.selectedChat && data.chatId === this.selectedChat.id) {
          const message = this.currentMessages.find(
            (m) => m.id === data.messageId
          );
          if (message) {
            message.isDeleted = true;
            message.content = 'This message has been deleted';
            this.changeDetector.markForCheck();
          }
        }
      });

    // Online status changed
    this.signalRService.onlineStatusChanged$
      .pipe(
        takeUntil(this.destroy$),
        filter((data) => data !== null)
      )
      .subscribe((data) => {
        if (data) {
          this.updateUserOnlineStatus(data.userId, data.isOnline);
        }
      });

    // Chat marked as read
    this.signalRService.messageRead$
      .pipe(
        takeUntil(this.destroy$),
        filter((data) => data !== null)
      )
      .subscribe((data) => {
        if (data) {
          this.updateChatReadStatus(data.chatId, data.userId);
        }
      });
  }

  private setupSubscriptions(): void {
    this.chatService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.totalUnreadCount = count;
        this.changeDetector.markForCheck();
      });
  }

  private setupTypingIndicator(): void {
    this.typingSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((isTyping) => {
        if (this.selectedChat) {
          this.signalRService.sendTypingIndicator(
            this.selectedChat.id,
            isTyping
          );
        }
      });
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterCurrentTab();
      });
  }

  private loadInitialData(): void {
    this.loadChatsAndUpdateCounts();
  }

  private loadChatsAndUpdateCounts(): void {
    this.chatService
      .getMyChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe((chats) => {
        this.processChats(chats);
        this.changeDetector.markForCheck();
      });
  }

  private processChats(chats: ChatDto[]): void {
    const clientChats = chats.filter(
      (chat) => chat.chatType === ChatType.ClientToOperator
    );
    this.clients = clientChats.map((chat) => this.mapChatToClient(chat));
    this.filteredClients = [...this.clients];

    const operatorChats = chats.filter(
      (chat) =>
        chat.chatType === ChatType.OperatorToOperator ||
        chat.chatType === ChatType.OperatorGroup
    );
    this.operators = operatorChats.map((chat) => this.mapChatToOperator(chat));
    this.filteredOperators = [...this.operators];
  }

  private mapChatToClient(chat: ChatDto): Client {
    const clientParticipant = chat.participants.find(
      (p) => p.userType === UserType.Client
    );
    return {
      id: clientParticipant!.userId,
      chatId: chat.id,
      name: this.extractNameFromParticipants(chat, UserType.Client),
      email: `client_${chat.id}@chat.com`,
      status: 'online',
      lastMessage: chat.lastMessage?.content || 'No messages yet',
      lastMessageTime: chat.lastMessage
        ? new Date(chat.lastMessage.sentAt)
        : new Date(chat.createdAt),
      unreadCount: chat.unreadCount || 0,
    };
  }

  private mapChatToOperator(chat: ChatDto): Operator {
    const operatorParticipant = chat.participants.find(
      (p) => p.userType === UserType.Operator && p.userId !== this.currentUserId
    );
    return {
      id: operatorParticipant!.userId,
      chatId: chat.id,
      name:
        chat.groupName ||
        this.extractNameFromParticipants(chat, UserType.Operator),
      email: ``,
      department: '',
      role: '',
      status: 'online',
      lastMessage: chat.lastMessage?.content || 'No messages yet',
      lastMessageTime: chat.lastMessage
        ? new Date(chat.lastMessage.sentAt)
        : new Date(chat.createdAt),
      unreadCount: chat.unreadCount || 0,
    };
  }

  private extractNameFromParticipants(
    chat: ChatDto,
    userType: UserType
  ): string {
    const participant = chat.participants.find(
      (p) => p.userType === userType && p.userId !== this.currentUserId
    );
    return participant
      ? `User ${participant.userId.substring(0, 8)}`
      : 'Unknown';
  }

  private handleIncomingMessage(message: MessageDto): void {
    if (message.senderId === this.currentUserId) {
      const tempMsgIndex = this.currentMessages.findIndex((m) =>
        m.id.startsWith('temp-')
      );
      if (tempMsgIndex !== -1) {
        this.currentMessages[tempMsgIndex] = message;
      }
      return;
    }

    this.currentMessages.push(message);
    this.typingUsers.delete(message.senderId);
  }

  private updateChatListWithNewMessage(
    chatId: string,
    message: MessageDto
  ): void {
    const client = this.clients.find((c) => c.chatId === chatId);
    if (client) {
      client.lastMessage = message.content;
      client.lastMessageTime = new Date(message.sentAt);

      if (
        message.senderId !== this.currentUserId &&
        (!this.selectedChat || this.selectedChat.id !== chatId)
      ) {
        client.unreadCount++;
      }
    }

    const operator = this.operators.find((o) => o.chatId === chatId);
    if (operator) {
      operator.lastMessage = message.content;
      operator.lastMessageTime = new Date(message.sentAt);

      if (
        message.senderId !== this.currentUserId &&
        (!this.selectedChat || this.selectedChat.id !== chatId)
      ) {
        operator.unreadCount++;
      }
    }

    this.changeDetector.markForCheck();
  }

  private updateChatReadStatus(chatId: string, userId: string): void {
    if (userId === this.currentUserId && this.selectedChat?.id === chatId) {
      const client = this.clients.find((c) => c.chatId === chatId);
      if (client) {
        client.unreadCount = 0;
      }

      const operator = this.operators.find((o) => o.chatId === chatId);
      if (operator) {
        operator.unreadCount = 0;
      }

      this.changeDetector.markForCheck();
    }
  }

  private updateUserOnlineStatus(userId: string, isOnline: boolean): void {
    const client = this.clients.find(
      (c) => c.id === userId || c.userId === userId
    );
    if (client) {
      client.status = isOnline ? 'online' : 'offline';
    }

    const operator = this.operators.find((o) => o.id === userId);
    if (operator) {
      operator.status = isOnline ? 'online' : 'offline';
    }

    this.changeDetector.markForCheck();
  }

  setActiveTab(tab: ActiveTab): void {
    if (this.currentChatId) {
      this.signalRService.leaveChat(this.currentChatId);
      this.currentChatId = null;
    }

    if (this.isCurrentUserTyping) {
      this.typingSubject.next(false);
      this.isCurrentUserTyping = false;
    }

    this.activeTab = tab;
    this.searchQuery = '';
    this.selectedUser = null;
    this.selectedChat = null;
    this.currentMessages = [];
    this.typingUsers.clear();
    this.showOperatorSearchDropdown = false;
    this.searchDropdownOperators = [];
    this.showClientSearchDropdown = false;
    this.searchDropdownClients = [];
    this.removeSelectedFile();
    this.filterCurrentTab();
  }

  onTabSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;

    if (this.activeTab === 'operators') {
      this.filterOperatorsForSearch(this.searchQuery);
    } else if (this.activeTab === 'clients') {
      this.filterClientsForSearch(this.searchQuery);
    }
  }

  onSearchFocus(): void {
    if (this.activeTab === 'operators') {
      this.loadOperatorsForDropdown(this.searchQuery);
    } else if (this.activeTab === 'clients') {
      this.loadClientsForDropdown(this.searchQuery);
    }
  }

  onSearchBlur(): void {
    setTimeout(() => {
      if (this.activeTab === 'operators' && !this.searchQuery.trim()) {
        this.showOperatorSearchDropdown = false;
      } else if (this.activeTab === 'clients' && !this.searchQuery.trim()) {
        this.showClientSearchDropdown = false;
      }
      this.changeDetector.markForCheck();
    }, 200);
  }

  private filterCurrentTab(): void {
    const query = this.searchQuery.toLowerCase();

    if (this.activeTab === 'clients') {
      if (!query) {
        this.filteredClients = [...this.clients];
      } else {
        this.filteredClients = this.clients.filter(
          (client) =>
            client.name.toLowerCase().includes(query) ||
            client.email.toLowerCase().includes(query)
        );
      }
    } else {
      if (!query) {
        this.filteredOperators = [...this.operators];
      } else {
        this.filteredOperators = this.operators.filter(
          (op) =>
            op.name.toLowerCase().includes(query) ||
            (op.email && op.email.toLowerCase().includes(query))
        );
      }
    }
  }

  private filterOperatorsForSearch(searchTerm: string): void {
    this.loadOperatorsForDropdown(searchTerm);
    this.filterCurrentTab();
  }

  private filterClientsForSearch(searchTerm: string): void {
    this.loadClientsForDropdown(searchTerm);
    this.filterCurrentTab();
  }

  private loadOperatorsForDropdown(searchTerm: string): void {
    this.chatService
      .searchOperators(searchTerm, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (operators) => {
          this.searchDropdownOperators = operators.map((op) => ({
            id: op.id,
            name: op.name,
            email: op.email,
            department: op.department,
            role: op.role,
            status: op.status || 'offline',
            lastMessage: '',
            lastMessageTime: new Date(),
            unreadCount: 0,
            chatId: this.findChatIdForOperator(op.id),
          }));
          this.showOperatorSearchDropdown =
            this.searchDropdownOperators.length > 0;
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Error searching operators:', error);
        },
      });
  }

  private loadClientsForDropdown(searchTerm: string): void {
    this.chatService
      .searchClients(searchTerm, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clients) => {
          this.searchDropdownClients = clients.map((client) => ({
            id: client.id,
            userId: client.userId,
            name: client.name,
            email: client.email,
            status: client.status || 'offline',
            lastMessage: '',
            lastMessageTime: new Date(),
            unreadCount: 0,
            chatId: this.findChatIdForClient(client.userId!),
          }));
          this.showClientSearchDropdown = this.searchDropdownClients.length > 0;
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Error searching clients:', error);
        },
      });
  }

  private findChatIdForOperator(operatorId: string): string | undefined {
    return this.operators.find((op) => op.id === operatorId)?.chatId;
  }

  private findChatIdForClient(clientId: string): string | undefined {
    return this.clients.find((c) => c.id === clientId || c.userId === clientId)
      ?.chatId;
  }

  selectClient(client: Client): void {
    if (this.currentChatId) {
      this.signalRService.leaveChat(this.currentChatId);
    }

    if (this.isCurrentUserTyping) {
      this.typingSubject.next(false);
      this.isCurrentUserTyping = false;
    }

    this.selectedUser = client;
    this.typingUsers.clear();
    this.isSendingMessage = false;
    this.messageText = '';
    this.removeSelectedFile();

    this.showClientSearchDropdown = false;
    this.searchQuery = '';

    if (client.chatId) {
      this.loadChatDetails(client.chatId);
    } else {
      this.createClientChat(client);
    }
  }

  selectOperator(operator: Operator): void {
    if (this.currentChatId) {
      this.signalRService.leaveChat(this.currentChatId);
    }

    if (this.isCurrentUserTyping) {
      this.typingSubject.next(false);
      this.isCurrentUserTyping = false;
    }

    this.selectedUser = operator;
    this.typingUsers.clear();
    this.isSendingMessage = false;
    this.messageText = '';
    this.removeSelectedFile();

    this.showOperatorSearchDropdown = false;
    this.searchQuery = '';

    if (operator.chatId) {
      this.loadChatDetails(operator.chatId);
    } else {
      this.createOperatorChat(operator);
    }
  }

  selectOperatorFromDropdown(operator: Operator): void {
    this.showOperatorSearchDropdown = false;
    this.searchQuery = '';
    this.selectOperator(operator);
  }

  selectClientFromDropdown(client: Client): void {
    this.showClientSearchDropdown = false;
    this.searchQuery = '';
    this.selectClient(client);
  }

  private async loadChatDetails(chatId: string): Promise<void> {
    this.loading = true;
    this.currentChatId = chatId;

    try {
      const chat = await this.chatService.getChatById(chatId).toPromise();

      if (chat) {
        this.selectedChat = chat;
        await this.signalRService.joinChat(chatId);

        const response = await this.chatService
          .getChatMessages(chatId)
          .toPromise();

        if (response) {
          this.currentMessages = response.messages.reverse();
          this.shouldScrollToBottom = true;

          await this.markChatAsRead(chatId);

          setTimeout(() => {
            this.messageInput?.nativeElement?.focus();
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error loading chat details:', error);
      this.alertService.error('Failed to load chat. Please try again.');
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  private async markChatAsRead(chatId: string): Promise<void> {
    await this.chatService.markChatAsRead(chatId).toPromise();
    await this.signalRService.markChatAsRead(chatId);

    const client = this.clients.find((c) => c.chatId === chatId);
    if (client) client.unreadCount = 0;
  }

  private async createClientChat(client: Client): Promise<void> {
    this.loading = true;

    try {
      const chat = await this.chatService
        .createClientToOperatorChat('Hello, I need assistance', client.userId!)
        .toPromise();

      if (chat) {
        client.chatId = chat.id;
        this.currentChatId = chat.id;
        this.selectedChat = chat;
        this.currentMessages = [];

        await this.signalRService.joinChat(chat.id);

        const existingIndex = this.clients.findIndex((c) => c.id === client.id);
        if (existingIndex === -1) {
          this.clients.unshift(client);
          this.filteredClients = [...this.clients];
        }
      }
    } catch (error) {
      console.error('Error creating client chat:', error);
      this.alertService.error('Failed to create chat. Please try again.');
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  private async createOperatorChat(operator: Operator): Promise<void> {
    this.loading = true;

    try {
      const chat = await this.chatService
        .createOperatorToOperatorChat(operator.id, 'Hi there!')
        .toPromise();

      if (chat) {
        operator.chatId = chat.id;
        this.currentChatId = chat.id;
        this.selectedChat = chat;
        this.currentMessages = [];

        await this.signalRService.joinChat(chat.id);

        const existingIndex = this.operators.findIndex(
          (op) => op.id === operator.id
        );
        if (existingIndex === -1) {
          this.operators.unshift(operator);
          this.filteredOperators = [...this.operators];
        }
      }
    } catch (error) {
      console.error('Error creating operator chat:', error);
      this.alertService.error('Failed to create chat. Please try again.');
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  sendMessage(): void {
    if (!this.messageText.trim() || this.isSendingMessage || !this.selectedChat)
      return;

    this.isSendingMessage = true;
    this.isCurrentUserTyping = false;
    const messageContent = this.messageText.trim();

    const tempMessage: MessageDto = {
      id: 'temp-' + Date.now(),
      chatId: this.selectedChat.id,
      senderId: this.currentUserId,
      content: messageContent,
      messageType: MessageType.Text,
      sentAt: new Date().toISOString(),
      isEdited: false,
      isDeleted: false,
      files: [],
      senderName: this.currentUserName,
    };

    this.currentMessages.push(tempMessage);
    this.shouldScrollToBottom = true;
    this.messageText = '';
    this.typingSubject.next(false);
    this.changeDetector.markForCheck();

    this.chatService
      .sendMessage(this.selectedChat.id, messageContent)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          // Play sent sound
          this.soundService.playMessageSent();

          const tempMsgIndex = this.currentMessages.findIndex(
            (m) => m.id === tempMessage.id
          );
          if (tempMsgIndex !== -1) {
            this.currentMessages[tempMsgIndex] = message;
          }
          this.isSendingMessage = false;

          this.updateChatListWithNewMessage(this.selectedChat!.id, message);
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.currentMessages = this.currentMessages.filter(
            (m) => m.id !== tempMessage.id
          );
          this.isSendingMessage = false;
          this.messageText = messageContent;
          this.alertService.error('Failed to send message. Please try again.');
          this.changeDetector.markForCheck();
        },
      });
  }

  onMessageInput(): void {
    const wasTyping = this.isCurrentUserTyping;
    this.isCurrentUserTyping = this.messageText.length > 0;

    // Play typing sound (throttled)
    const now = Date.now();
    if (
      this.isCurrentUserTyping &&
      now - this.lastTypingSoundTime > this.typingSoundThrottle
    ) {
      this.soundService.playTyping();
      this.lastTypingSoundTime = now;
    }

    if (wasTyping !== this.isCurrentUserTyping) {
      this.typingSubject.next(this.isCurrentUserTyping);
    }

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    if (this.isCurrentUserTyping) {
      this.typingTimer = setTimeout(() => {
        this.isCurrentUserTyping = false;
        this.typingSubject.next(false);
      }, 3000);
    }
  }

  async uploadAndSendFile(): Promise<void> {
    if (!this.selectedFile || !this.selectedChat) return;

    this.isUploadingFile = true;
    this.isSendingMessage = true;

    try {
      const fileId = await this.chatService.uploadFile(this.selectedFile);
      const messageContent = this.messageText.trim() || this.selectedFile.name;
      const message = await this.chatService
        .sendMessage(this.selectedChat.id, messageContent, [fileId])
        .toPromise();

      if (message) {
        this.soundService.playMessageSent();
        this.currentMessages.push(message);
        this.shouldScrollToBottom = true;
        this.updateChatListWithNewMessage(this.selectedChat.id, message);
      }

      this.messageText = '';
      this.selectedFile = null;
      if (this.fileInput?.nativeElement) {
        this.fileInput.nativeElement.value = '';
      }

      this.alertService.success('File sent successfully');
    } catch (error) {
      console.error('Error uploading and sending file:', error);
      this.alertService.error('Failed to send file. Please try again.');
    } finally {
      this.isUploadingFile = false;
      this.isSendingMessage = false;
      this.changeDetector.markForCheck();
    }
  }

  sendMessageOrFile(): void {
    if (this.selectedFile) {
      this.uploadAndSendFile();
    } else {
      this.sendMessage();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!this.isValidFileType(file)) {
        this.alertService.error(
          'Only image files are allowed (JPG, JPEG, PNG, GIF, BMP)'
        );
        if (this.fileInput?.nativeElement) {
          this.fileInput.nativeElement.value = '';
        }
        return;
      }

      if (file.size > this.MAX_FILE_SIZE) {
        this.alertService.error(
          `File size exceeds maximum allowed size of ${this.formatFileSize(
            this.MAX_FILE_SIZE
          )}`
        );
        if (this.fileInput?.nativeElement) {
          this.fileInput.nativeElement.value = '';
        }
        return;
      }

      this.selectedFile = file;
      this.changeDetector.markForCheck();
    }
  }

  private isValidFileType(file: File): boolean {
    return this.ALLOWED_FILE_TYPES.includes(file.type.toLowerCase());
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.changeDetector.markForCheck();
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement?.click();
  }

  deleteMessage(messageId: string): void {
    if (!confirm('Are you sure you want to delete this message?')) return;

    this.chatService
      .deleteMessage(messageId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertService.success('Message deleted');
        },
        error: (error) => {
          console.error('Error deleting message:', error);
          this.alertService.error('Failed to delete message');
        },
      });
  }

  editMessage(message: MessageDto): void {
    const newContent = prompt('Edit message:', message.content);
    if (newContent && newContent !== message.content) {
      this.chatService
        .editMessage(message.id, newContent)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.alertService.success('Message updated');
          },
          error: (error) => {
            console.error('Error editing message:', error);
            this.alertService.error('Failed to edit message');
          },
        });
    }
  }

  toggleSoundMute(): void {
    this.soundService.toggleMute();
    this.isSoundMuted = this.soundService.isSoundMuted();
  }

  setSoundVolume(volume: number): void {
    this.soundService.setVolume(volume);
    this.soundVolume = volume;
  }

  formatMessageTime(date: Date | string): string {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    if (
      ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)
    ) {
      return '🖼️';
    }
    if (['pdf'].includes(extension)) {
      return '📄';
    }
    if (['doc', 'docx'].includes(extension)) {
      return '📝';
    }
    if (['xls', 'xlsx'].includes(extension)) {
      return '📊';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return '📦';
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(extension)) {
      return '🎥';
    }
    if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(extension)) {
      return '🎵';
    }

    return '📎';
  }

  getAvatarColor(userType: 'client' | 'operator', name: string): string {
    if (userType === 'client') {
      const clientColors = [
        '#10B981',
        '#14B8A6',
        '#06B6D4',
        '#0EA5E9',
        '#3B82F6',
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return clientColors[Math.abs(hash) % clientColors.length];
    } else {
      const operatorColors = [
        '#8B5CF6',
        '#A855F7',
        '#C026D3',
        '#EC4899',
        '#F43F5E',
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return operatorColors[Math.abs(hash) % operatorColors.length];
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getSenderName(message: MessageDto): string {
    if (message.senderName) {
      return message.senderName;
    }

    if (message.senderId === this.currentUserId) {
      return this.currentUserName || 'You';
    }

    if (this.selectedUser) {
      return this.selectedUser.name;
    }

    return this.activeTab === 'clients' ? 'Client' : 'Operator';
  }

  isMessageFromCurrentUser(message: MessageDto): boolean {
    return message.senderId === this.currentUserId;
  }

  get clientsUnreadCount(): number {
    return this.clients.reduce((sum, client) => sum + client.unreadCount, 0);
  }

  get operatorsUnreadCount(): number {
    return this.operators.reduce(
      (sum, operator) => sum + operator.unreadCount,
      0
    );
  }

  get typingUsersArray(): string[] {
    return Array.from(this.typingUsers.keys());
  }

  trackByClientId(index: number, client: Client): string {
    return client.id;
  }

  trackByOperatorId(index: number, operator: Operator): string {
    return operator.id;
  }

  trackByMessageId(index: number, message: MessageDto): string {
    return message.id;
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}
