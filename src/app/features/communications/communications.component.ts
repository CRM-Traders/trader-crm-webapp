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
import { Subject, combineLatest, timer } from 'rxjs';
import {
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  map,
  filter,
} from 'rxjs/operators';
import {
  ChatSummaryDto,
  ChatDetailsDto,
  MessageDto,
  OperatorStatus,
  ChatType,
} from '../../shared/models/chat/chat-system.model';
import { ComprehensiveChatService } from '../../shared/services/chat/comprehensive-chat.service';

interface TransferModalData {
  isOpen: boolean;
  chatId: string | null;
  reason: string;
  selectedOperatorId: string;
}

interface CloseModalData {
  isOpen: boolean;
  chatId: string | null;
  reason: string;
}

@Component({
  selector: 'app-communications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './communications.component.html',
  styleUrl: './communications.component.scss',
})
export class CommunicationsComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  private chatService = inject(ComprehensiveChatService);
  private changeDetector = inject(ChangeDetectorRef);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  private destroy$ = new Subject<void>();
  private typingSubject = new Subject<boolean>();
  private searchSubject = new Subject<string>();
  private shouldScrollToBottom = true;

  // Component state
  activeChats: ChatSummaryDto[] = [];
  selectedChat: ChatDetailsDto | null = null;
  currentMessages: MessageDto[] = [];
  typingUsers: string[] = [];
  loading = false;
  connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  operatorStatus: OperatorStatus = OperatorStatus.Online;
  totalUnreadCount = 0;

  // UI state
  messageText = '';
  searchQuery = '';
  showClosedChats = false;
  selectedTab: string = 'active'; // 'active' | 'pending' | 'closed'

  // Modals
  transferModal: TransferModalData = {
    isOpen: false,
    chatId: null,
    reason: '',
    selectedOperatorId: '',
  };

  closeModal: CloseModalData = {
    isOpen: false,
    chatId: null,
    reason: '',
  };

  // Available operators for transfer (this should come from your user service)
  availableOperators = [
    { id: 'op1', name: 'John Doe', status: 'online' },
    { id: 'op2', name: 'Jane Smith', status: 'away' },
    { id: 'op3', name: 'Mike Johnson', status: 'online' },
  ];

  statusOptions = [
    { value: OperatorStatus.Online, label: 'Online', color: 'bg-green-500' },
    { value: OperatorStatus.Away, label: 'Away', color: 'bg-yellow-500' },
    { value: OperatorStatus.Busy, label: 'Busy', color: 'bg-red-500' },
    { value: OperatorStatus.Offline, label: 'Offline', color: 'bg-gray-500' },
  ];

  ngOnInit(): void {
    this.initializeService();
    this.setupSubscriptions();
    this.setupTypingIndicator();
    this.setupSearch();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeService(): Promise<void> {
    try {
      const accessToken = this.getAccessToken(); // Implement based on your auth service
      await this.chatService.initialize(accessToken, ChatType.CustomerSupport);
    } catch (error) {
      console.error('Failed to initialize communications service:', error);
    }
  }

  private setupSubscriptions(): void {
    // Active chats
    this.chatService.activeChats$
      .pipe(takeUntil(this.destroy$))
      .subscribe((chats) => {
        this.activeChats = chats;
        this.changeDetector.markForCheck();
      });

    // Selected chat
    this.chatService.selectedChat$
      .pipe(takeUntil(this.destroy$))
      .subscribe((chat) => {
        this.selectedChat = chat;
        this.changeDetector.markForCheck();
      });

    // Messages
    this.chatService.currentChatMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages) => {
        this.currentMessages = messages;
        this.shouldScrollToBottom = true;
        this.changeDetector.markForCheck();
      });

    // Typing users
    this.chatService.currentChatTypingUsers$
      .pipe(takeUntil(this.destroy$))
      .subscribe((users) => {
        this.typingUsers = users;
        this.changeDetector.markForCheck();
      });

    // Loading state
    this.chatService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
        this.changeDetector.markForCheck();
      });

    // Connection state
    this.chatService.connectionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.connectionState = state;
        this.changeDetector.markForCheck();
      });

    // Operator status
    this.chatService.operatorStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.operatorStatus = status;
        this.changeDetector.markForCheck();
      });

    // Total unread count
    this.chatService.totalUnreadCount$
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
          this.chatService.sendTypingIndicator(this.selectedChat.id, isTyping);
        }
      });
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        // Implement search logic
        this.filterChats(query);
      });
  }

  selectChat(chat: ChatSummaryDto): void {
    this.chatService.selectChat(chat.id);
    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
    }, 100);
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.selectedChat) return;

    this.chatService
      .sendMessage(this.selectedChat.id, this.messageText.trim())
      .then(() => {
        this.messageText = '';
        this.shouldScrollToBottom = true;
        this.typingSubject.next(false);
        this.changeDetector.markForCheck();
      })
      .catch((error) => {
        console.error('Failed to send message:', error);
      });
  }

  onMessageInput(): void {
    this.typingSubject.next(this.messageText.length > 0);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.searchSubject.next(this.searchQuery);
  }

  async setOperatorStatus(status: OperatorStatus): Promise<void> {
    try {
      await this.chatService.setOperatorStatus(status);
    } catch (error) {
      console.error('Failed to set operator status:', error);
    }
  }

  openTransferModal(chatId: string): void {
    this.transferModal = {
      isOpen: true,
      chatId,
      reason: '',
      selectedOperatorId: '',
    };
  }

  closeTransferModal(): void {
    this.transferModal = {
      isOpen: false,
      chatId: null,
      reason: '',
      selectedOperatorId: '',
    };
  }

  async transferChat(): Promise<void> {
    if (
      !this.transferModal.chatId ||
      !this.transferModal.selectedOperatorId ||
      !this.transferModal.reason.trim()
    ) {
      return;
    }

    try {
      await this.chatService.transferChat(
        this.transferModal.chatId,
        this.transferModal.selectedOperatorId,
        this.transferModal.reason
      );
      this.closeTransferModal();
    } catch (error) {
      console.error('Failed to transfer chat:', error);
    }
  }

  openCloseModal(chatId: string): void {
    this.closeModal = {
      isOpen: true,
      chatId,
      reason: '',
    };
  }

  closeCloseModal(): void {
    this.closeModal = {
      isOpen: false,
      chatId: null,
      reason: '',
    };
  }

  async closeChat(): Promise<void> {
    if (!this.closeModal.chatId) return;

    try {
      await this.chatService.closeChat(
        this.closeModal.chatId,
        this.closeModal.reason
      );
      this.closeCloseModal();
    } catch (error) {
      console.error('Failed to close chat:', error);
    }
  }

  getFilteredChats(): ChatSummaryDto[] {
    let filtered = this.activeChats;

    // Filter by tab
    switch (this.selectedTab) {
      case 'active':
        filtered = filtered.filter((chat) => chat.status === 'Active');
        break;
      case 'pending':
        filtered = filtered.filter((chat) => chat.status === 'Pending');
        break;
      case 'closed':
        filtered = filtered.filter((chat) => chat.status === 'Closed');
        break;
    }

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chat) =>
          chat.title.toLowerCase().includes(query) ||
          (chat.lastMessage && chat.lastMessage.toLowerCase().includes(query))
      );
    }

    return filtered;
  }

  formatMessageTime(date: Date): string {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getChatPriorityColor(priority: number): string {
    switch (priority) {
      case 1:
        return 'bg-gray-100 text-gray-800';
      case 2:
        return 'bg-blue-100 text-blue-800';
      case 3:
        return 'bg-yellow-100 text-yellow-800';
      case 4:
        return 'bg-orange-100 text-orange-800';
      case 5:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getChatPriorityLabel(priority: number): string {
    switch (priority) {
      case 1:
        return 'Low';
      case 2:
        return 'Normal';
      case 3:
        return 'Medium';
      case 4:
        return 'High';
      case 5:
        return 'Urgent';
      default:
        return 'Normal';
    }
  }

  getSenderName(message: MessageDto): string {
    if (!this.selectedChat) return 'Unknown';

    const participant = this.selectedChat.participants.find(
      (p) => p.userId === message.senderId
    );
    if (participant) {
      // You should get the actual name from your user service
      return message.senderId === this.getCurrentUserId() ? 'You' : 'Customer';
    }

    return 'System';
  }

  isMessageFromOperator(message: MessageDto): boolean {
    return message.senderId === this.getCurrentUserId();
  }

  private filterChats(query: string): void {
    // This is handled by getFilteredChats() method
    this.changeDetector.markForCheck();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }

  private getAccessToken(): string {
    // Implement based on your auth service
    return 'your-access-token';
  }

  private getCurrentUserId(): string {
    // Implement based on your auth service
    return 'current-operator-id';
  }

  trackByChatId(index: number, chat: ChatSummaryDto): string {
    return chat.id;
  }

  trackByMessageId(index: number, message: MessageDto): string {
    return message.id;
  }
}
