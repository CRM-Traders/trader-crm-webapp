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
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import {
  ChatSummaryDto,
  ChatDetailsDto,
  MessageDto,
  ChatType,
  MessageType,
} from '../../models/chat/chat.model';

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
  private authService = inject(AuthService);
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

  activeChats: ChatSummaryDto[] = [];
  selectedChat: ChatDetailsDto | null = null;
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
  isLoadingOperators = false;

  showOperatorSearchDropdown = false;
  allOperators: Operator[] = [];
  operatorChats: Operator[] = [];
  searchDropdownOperators: Operator[] = [];

  showClientSearchDropdown = false;
  allClients: Client[] = [];
  clientChats: Client[] = [];
  searchDropdownClients: Client[] = [];

  selectedFile: File | null = null;
  isUploadingFile = false;
  uploadProgress = 0;
  MAX_FILE_SIZE = 10 * 1024 * 1024;
  ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
  ];
  ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];

  // Store current user info
  currentUserId: string = '';
  currentUserName: string = '';

  ngOnInit(): void {
    this.currentUserId = this.chatService.getCurrentUserId();
    this.currentUserName = this.chatService.getCurrentUserName();
    this.initializeServices();
    this.setupSubscriptions();
    this.setupTypingIndicator();
    this.setupSearch();
    this.loadInitialData();
    this.loadClients()
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      await this.signalRService.initializeChatHub();

      const userRole = this.getUserRole();
      if (userRole === 'operator' || userRole === 'admin') {
        await this.signalRService.initializeOperatorHub();
      }

      this.setupSignalRListeners();
    } catch (error) {
      console.error('Failed to initialize SignalR:', error);
      // this.alertService.error(
      //   'Failed to connect to chat server. Please refresh the page.'
      // );
    }
  }

  private setupSignalRListeners(): void {
    this.signalRService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.connectionState = status as any;
        this.changeDetector.markForCheck();
      });

    this.signalRService.messageReceived$
      .pipe(
        takeUntil(this.destroy$),
        filter((msg) => msg !== null)
      )
      .subscribe((message) => {
        if (
          message &&
          this.selectedChat &&
          message.chatId === this.selectedChat.id
        ) {
          this.handleIncomingMessage(message);
        }
        this.updateUnreadCounts();
      });

    this.signalRService.typingIndicator$
      .pipe(
        takeUntil(this.destroy$),
        filter((data) => data !== null)
      )
      .subscribe((data) => {
        if (data && this.selectedChat && data.chatId === this.selectedChat.id) {
          this.typingUsers.set(data.userId, data.isTyping);
          if (!data.isTyping) {
            this.typingUsers.delete(data.userId);
          }
          this.changeDetector.markForCheck();
        }
      });

    this.signalRService.messageRead$
      .pipe(
        takeUntil(this.destroy$),
        filter((data) => data !== null)
      )
      .subscribe((data) => {
        if (data && this.currentMessages.length > 0) {
          const message = this.currentMessages.find(
            (m) => m.id === data.messageId
          );
          if (message) {
            message.isRead = true;
          }
          this.changeDetector.markForCheck();
        }
      });

    this.signalRService.messageEdited$
      .pipe(
        takeUntil(this.destroy$),
        filter((data) => data !== null)
      )
      .subscribe((data) => {
        if (data && this.currentMessages.length > 0) {
          const message = this.currentMessages.find(
            (m) => m.id === data.messageId
          );
          if (message) {
            message.content = data.newContent;
            message.isEdited = true;
          }
          this.changeDetector.markForCheck();
        }
      });

    this.signalRService.messageDeleted$
      .pipe(
        takeUntil(this.destroy$),
        filter((data) => data !== null)
      )
      .subscribe((data) => {
        if (data && this.selectedChat && data.chatId === this.selectedChat.id) {
          this.currentMessages = this.currentMessages.filter(
            (m) => m.id !== data.messageId
          );
          this.changeDetector.markForCheck();
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
          this.chatService
            .sendTypingIndicator(this.selectedChat.id, isTyping)
            .subscribe();
        }
      });
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.filterCurrentTab();
      });
  }

  private loadInitialData(): void {
    this.loadClients();
    this.loadOperators();
    this.loadAllOperatorsForSearch();
  }

  private loadClients(): void {
    this.chatService
      .getMyChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe((chats) => {
        const clientChats = chats.filter(
          (chat) => chat.type === 'CustomerSupport'
        );
        this.clients = clientChats.map((chat) => this.mapChatToClient(chat));
        this.clientChats = [...this.clients];
        this.filteredClients = [...this.clients];
        this.changeDetector.markForCheck();
      });
  }

  private mapChatToClient(chat: ChatSummaryDto): Client {
    return {
      id: chat.id,
      chatId: chat.id,
      name: chat.title,
      email: `client_${chat.id}@chat.com`,
      status: chat.status === 'Active' ? 'online' : 'offline',
      lastMessage: chat.lastMessage || 'No messages yet',
      lastMessageTime: chat.lastActivityAt
        ? new Date(chat.lastActivityAt)
        : new Date(chat.createdAt),
      unreadCount: chat.unreadCount || 0,
    };
  }

  private loadOperators(): void {
    this.isLoadingOperators = true;

    this.chatService
      .getMyChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chats) => {
          const operatorChats = chats.filter(
            (chat) => chat.type === 'PersonToPerson'
          );
          const mappedOperators = operatorChats.map((chat) =>
            this.mapChatToOperator(chat)
          );
          this.operatorChats = [...mappedOperators];
          this.operators = [...this.operatorChats];
          this.filteredOperators = [...this.operatorChats];
          this.isLoadingOperators = false;
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Error loading operator chats:', error);
          this.isLoadingOperators = false;
          this.changeDetector.markForCheck();
        },
      });
  }

  private mapChatToOperator(chat: ChatSummaryDto): Operator {
    const operatorName = this.extractOperatorNameFromTitle(chat.title);

    return {
      id: chat.initiatorId,
      chatId: chat.id,
      name: operatorName,
      email: `${operatorName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      department: '',
      role: '',
      status: 'online' as any,
      lastMessage: chat.lastMessage || '',
      lastMessageTime: chat.lastActivityAt
        ? new Date(chat.lastActivityAt)
        : new Date(chat.createdAt),
      unreadCount: chat.unreadCount || 0,
    };
  }

  private extractOperatorNameFromTitle(title: string): string {
    const match = title.match(/^Chat with (.+)$/i);
    if (match) {
      return match[1];
    }
    return title;
  }

  private loadAllOperatorsForSearch(): void {
    this.chatService
      .searchOperators('', 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (operators) => {
          this.allOperators = operators.map((op) => ({
            id: op.id,
            name: op.fullName || op.value || 'Unknown',
            email: op.email || '',
            department: op.department || '',
            role: op.role || '',
            status: op.status || 'offline',
            lastMessage: '',
            lastMessageTime: new Date(),
            unreadCount: 0,
            chatId: op.chatId,
          }));
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Error loading operators for search:', error);
        },
      });
  }

  private handleIncomingMessage(message: MessageDto): void {
    const existingMessage = this.currentMessages.find(
      (m) => m.id === message.id
    );
    if (!existingMessage) {
      this.currentMessages.push(message);
      this.shouldScrollToBottom = true;

      // Don't try to mark as read since the endpoint returns 400
      // if (message.senderId !== this.currentUserId && !message.isRead) {
      //   this.chatService.markMessageAsRead(message.id).subscribe();
      // }

      this.changeDetector.markForCheck();
    }
  }

  private updateUnreadCounts(): void {
    this.loadClients();
    this.loadOperators();
  }

  setActiveTab(tab: ActiveTab): void {
    this.activeTab = tab;
    this.searchQuery = '';
    this.selectedUser = null;
    this.selectedChat = null;
    this.currentMessages = [];
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
    } else {
      this.filterCurrentTab();
    }
  }

  onSearchFocus(): void {
    if (this.activeTab === 'operators') {
      if (this.searchQuery.trim()) {
        this.filterOperatorsForSearch(this.searchQuery);
      } else {
        // Load operators from API when focusing on empty search
        this.chatService
          .searchOperators('', 0, 100)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (operators) => {
              this.searchDropdownOperators = operators.map((op) => ({
                id: op.id,
                name: op.fullName || op.value || 'Unknown',
                email: op.email || '',
                department: op.department || '',
                role: op.role || '',
                status: (op.status || 'offline') as 'online' | 'away' | 'busy' | 'offline',
                lastMessage: '',
                lastMessageTime: new Date(),
                unreadCount: 0,
                chatId: op.chatId,
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
    } else if (this.activeTab === 'clients') {
      if (this.searchQuery.trim()) {
        this.filterClientsForSearch(this.searchQuery);
      } else {
        // Load clients from API when focusing on empty search
        this.chatService
          .searchClients('', 0, 100)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (clients) => {
              this.searchDropdownClients = clients.map((client) => ({
                id: client.id,
                userId: client.userId,
                name: client.fullName || client.value || 'Unknown',
                email: client.email || '',
                status: client.status || 'offline',
                lastMessage: '',
                lastMessageTime: new Date(),
                unreadCount: 0,
                chatId: client.chatId,
              }));
              this.showClientSearchDropdown =
                this.searchDropdownClients.length > 0;
              this.changeDetector.markForCheck();
            },
            error: (error) => {
              console.error('Error searching clients:', error);
            },
          });
      }
    }
  }

  onSearchBlur(): void {
    setTimeout(() => {
      if (this.activeTab === 'operators' && !this.searchQuery.trim()) {
        this.showOperatorSearchDropdown = false;
        this.changeDetector.markForCheck();
      } else if (this.activeTab === 'clients' && !this.searchQuery.trim()) {
        this.showClientSearchDropdown = false;
        this.changeDetector.markForCheck();
      }
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
      }
    }
  }

  private filterOperatorsForSearch(searchTerm: string): void {
    if (!searchTerm.trim()) {
      // Load all operators from API
      this.chatService
        .searchOperators('', 0, 100)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (operators) => {
            this.searchDropdownOperators = operators.map((op) => ({
              id: op.id,
              name: op.fullName || op.value || 'Unknown',
              email: op.email || '',
              department: op.department || '',
              role: op.role || '',
              status: (op.status || 'offline') as 'online' | 'away' | 'busy' | 'offline',
              lastMessage: '',
              lastMessageTime: new Date(),
              unreadCount: 0,
              chatId: op.chatId,
            }));
            this.showOperatorSearchDropdown =
              this.searchDropdownOperators.length > 0;
            this.changeDetector.markForCheck();
          },
        });
      this.filteredOperators = [...this.operatorChats];
      return;
    }

    // Search operators from API with search term
    this.chatService
      .searchOperators(searchTerm, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (operators) => {
          this.searchDropdownOperators = operators.map((op) => ({
            id: op.id,
            name: op.fullName || op.value || 'Unknown',
            email: op.email || '',
            department: op.department || '',
            role: op.role || '',
            status: (op.status || 'offline') as 'online' | 'away' | 'busy' | 'offline',
            lastMessage: '',
            lastMessageTime: new Date(),
            unreadCount: 0,
            chatId: op.chatId,
          }));
          this.showOperatorSearchDropdown =
            this.searchDropdownOperators.length > 0;
          this.changeDetector.markForCheck();
        },
      });

    // Filter existing chats locally
    const query = searchTerm.toLowerCase();
    this.filteredOperators = this.operatorChats.filter(
      (op) =>
        op.name.toLowerCase().includes(query) ||
        (op.email && op.email.toLowerCase().includes(query))
    );
  }

  private filterClientsForSearch(searchTerm: string): void {
    if (!searchTerm.trim()) {
      // Load all clients from API
      this.chatService
        .searchClients('', 0, 100)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (clients) => {
            this.searchDropdownClients = clients.map((client) => ({
              id: client.id,
              userId: client.userId,
              name: client.fullName || client.value || 'Unknown',
              email: client.email || '',
              status: client.status || 'offline',
              lastMessage: '',
              lastMessageTime: new Date(),
              unreadCount: 0,
              chatId: client.chatId,
            }));
            this.showClientSearchDropdown =
              this.searchDropdownClients.length > 0;
            this.changeDetector.markForCheck();
          },
        });
      this.filteredClients = [...this.clientChats];
      return;
    }

    // Search clients from API with search term
    this.chatService
      .searchClients(searchTerm, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clients) => {
          this.searchDropdownClients = clients.map((client) => ({
            id: client.id,
            userId: client.userId,
            name: client.fullName || client.value || 'Unknown',
            email: client.email || '',
            status: client.status || 'offline',
            lastMessage: '',
            lastMessageTime: new Date(),
            unreadCount: 0,
            chatId: client.chatId,
          }));
          this.showClientSearchDropdown =
            this.searchDropdownClients.length > 0;
          this.changeDetector.markForCheck();
        },
      });

    // Filter existing chats locally
    const query = searchTerm.toLowerCase();
    this.filteredClients = this.clientChats.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        (client.email && client.email.toLowerCase().includes(query))
    );
  }

  selectClient(client: Client): void {
    this.selectedUser = client;
    this.typingUsers.clear();
    this.isCurrentUserTyping = false;
    this.isSendingMessage = false;
    this.messageText = '';
    this.removeSelectedFile();

    this.showClientSearchDropdown = false;
    this.searchQuery = '';

    if (client.chatId) {
      this.loadChatDetails(client.chatId);
    } else {
      this.createOrSelectClientChat(client);
    }
  }

  selectOperator(operator: Operator): void {
    this.selectedUser = operator;
    this.typingUsers.clear();
    this.isCurrentUserTyping = false;
    this.isSendingMessage = false;
    this.messageText = '';
    this.removeSelectedFile();

    this.showOperatorSearchDropdown = false;
    this.searchQuery = '';

    if (operator.chatId) {
      this.loadChatDetails(operator.chatId);
    } else {
      this.createOrSelectOperatorChat(operator);
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

  private loadChatDetails(chatId: string): void {
    this.loading = true;

    this.chatService
      .getChatDetails(chatId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          this.selectedChat = details;
          this.currentMessages = details.messages.map(
            (msg) =>
              ({
                id: msg.id,
                chatId: details.id,
                senderId: msg.senderId,
                senderName: this.resolveSenderName(details, msg.senderId),
                content: msg.content,
                type: msg.type,
                isRead: msg.isRead,
                readAt: msg.readAt,
                readBy: msg.readBy,
                createdAt: msg.createdAt,
                updatedAt: msg.createdAt,
                isEdited: msg.isEdited,
                fileId: null,
                editedAt: null,
              } as MessageDto)
          );

          this.signalRService.joinChat(chatId);

          this.shouldScrollToBottom = true;
          this.loading = false;

          setTimeout(() => {
            this.messageInput?.nativeElement?.focus();
          }, 100);

          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Error loading chat details:', error);
          this.loading = false;
          // this.alertService.error('Failed to load chat details');
          this.changeDetector.markForCheck();
        },
      });
  }

  private createOrSelectOperatorChat(operator: Operator): void {
    this.loading = true;

    this.chatService
      .createChat(
        `Chat with ${operator.name}`,
        ChatType.PersonToPerson,
        `Direct chat with ${operator.name}`,
        operator.id
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chatId) => {
          operator.chatId = chatId;
          this.loadChatDetails(chatId);

          const existingIndex = this.operatorChats.findIndex(
            (op) => op.id === operator.id
          );
          if (existingIndex === -1) {
            this.operatorChats.unshift(operator);
            this.filteredOperators = [...this.operatorChats];
          }

          this.loading = false;
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Error creating operator chat:', error);
          this.loading = false;
          // this.alertService.error('Failed to create chat');
          this.changeDetector.markForCheck();
        },
      });
  }

  private createOrSelectClientChat(client: Client): void {
    this.loading = true;

    // Use userId if available, otherwise use id
    const targetUserId = (client as any).userId || client.id;

    this.chatService
      .createChat(
        `Chat with ${client.name}`,
        ChatType.CustomerSupport,
        `Support chat with ${client.name}`,
        targetUserId
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chatId) => {
          client.chatId = chatId;
          this.loadChatDetails(chatId);

          const existingIndex = this.clientChats.findIndex(
            (c) => c.id === client.id
          );
          if (existingIndex === -1) {
            this.clientChats.unshift(client);
            this.filteredClients = [...this.clientChats];
          }

          this.loading = false;
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Error creating client chat:', error);
          this.loading = false;
          //  this.alertService.error('Failed to create chat');
          this.changeDetector.markForCheck();
        },
      });
  }

  sendMessage(): void {
    if (!this.messageText.trim() || this.isSendingMessage || !this.selectedChat)
      return;

    this.isSendingMessage = true;
    this.isCurrentUserTyping = false;
    const messageContent = this.messageText.trim();

    // Create a temporary message to show immediately
    const tempMessage: MessageDto = {
      id: 'temp-' + Date.now(),
      chatId: this.selectedChat.id,
      senderId: this.currentUserId,
      senderName: this.currentUserName,
      content: messageContent,
      type: 'text',
      isRead: false,
      readAt: null,
      readBy: null,
      createdAt: new Date().toISOString(),
      isEdited: false,
      fileId: null,
      editedAt: null,
    };

    // Add message immediately to UI
    this.currentMessages.push(tempMessage);
    this.shouldScrollToBottom = true;
    this.messageText = '';
    this.typingSubject.next(false);
    this.changeDetector.markForCheck();

    this.chatService
      .sendMessage(this.selectedChat.id, messageContent, MessageType.Text)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messageId) => {
          // Update temp message with real ID
          const tempMsgIndex = this.currentMessages.findIndex(
            (m) => m.id === tempMessage.id
          );
          if (tempMsgIndex !== -1) {
            this.currentMessages[tempMsgIndex].id = messageId;
          }
          this.isSendingMessage = false;
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Error sending message:', error);
          // Remove temp message on error
          this.currentMessages = this.currentMessages.filter(
            (m) => m.id !== tempMessage.id
          );
          this.isSendingMessage = false;
          this.messageText = messageContent;
          // this.alertService.error('Failed to send message');
          this.changeDetector.markForCheck();
        },
      });
  }

  onMessageInput(): void {
    this.isCurrentUserTyping = this.messageText.length > 0;
    this.typingSubject.next(this.isCurrentUserTyping);
  }

  async uploadAndSendFile(): Promise<void> {
    if (!this.selectedFile || !this.selectedChat) return;

    this.isUploadingFile = true;
    this.isSendingMessage = true;
    this.uploadProgress = 0;

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      const fileUploadResponse = await fetch(
        `${this.chatService['http']['_apiUrl']}/api/files/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.authService.getAccessToken()}`,
          },
          body: formData,
        }
      );

      if (!fileUploadResponse.ok) {
        throw new Error('File upload failed');
      }

      const fileId = await fileUploadResponse.text();

      const messageContent = this.messageText.trim() || this.selectedFile.name;

      await this.chatService
        .sendMessageWithFile(this.selectedChat.id, messageContent, fileId)
        .toPromise();

      this.messageText = '';
      this.selectedFile = null;
      if (this.fileInput?.nativeElement) {
        this.fileInput.nativeElement.value = '';
      }

      // this.alertService.success('File sent successfully');
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Error uploading and sending file:', error);
      // this.alertService.error('Failed to send file. Please try again.');
    } finally {
      this.isUploadingFile = false;
      this.isSendingMessage = false;
      this.uploadProgress = 0;
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
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = file.type.toLowerCase();

    return (
      this.ALLOWED_FILE_TYPES.includes(mimeType) ||
      this.ALLOWED_EXTENSIONS.includes(fileExtension)
    );
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
    // First check if message has a senderName property
    if (message.senderName) {
      return message.senderName;
    }

    // Check if it's the current user
    if (message.senderId === this.currentUserId) {
      return this.currentUserName || 'You';
    }

    // Try to get name from selectedUser (current chat partner)
    if (this.selectedUser) {
      if (
        this.activeTab === 'operators' &&
        message.senderId === this.selectedUser.id
      ) {
        return this.selectedUser.name;
      }
      if (this.activeTab === 'clients') {
        return this.selectedUser.name;
      }
    }

    // Try to find in chat participants
    if (this.selectedChat) {
      const participant = this.selectedChat.participants.find(
        (p) => p.userId === message.senderId
      );
      if (participant && participant.username) {
        return participant.username;
      }
    }

    // Default fallback
    return this.activeTab === 'clients' ? 'Client' : 'Operator';
  }

  private resolveSenderName(
    details: ChatDetailsDto,
    senderId: string
  ): string {
    if (senderId === this.currentUserId) {
      return this.currentUserName || 'You';
    }

    const participant = details.participants?.find(
      (p) => p.userId === senderId
    );
    if (participant && participant.username) {
      return participant.username;
    }

    if (this.selectedUser) {
      if (this.activeTab === 'operators' && senderId === (this.selectedUser as any).id) {
        return this.selectedUser.name;
      }
      if (this.activeTab === 'clients') {
        return this.selectedUser.name;
      }
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

  private getCurrentUserId(): string {
    const userData =
      sessionStorage.getItem('user_data') || localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : '';
  }

  private getUserRole(): string {
    const userData =
      sessionStorage.getItem('user_data') || localStorage.getItem('user');
    return userData ? JSON.parse(userData).role : 'client';
  }

  private getCurrentUserName(): string {
    const userData =
      sessionStorage.getItem('user_data') || localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.name || user.fullName || user.username || 'You';
    }
    return 'You';
  }
}
