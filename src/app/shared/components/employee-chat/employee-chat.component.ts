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
  ChatType,
} from '../../models/chat/chat-system.model';
import { ComprehensiveChatService } from '../../services/chat/comprehensive-chat.service';
import { EmployeeChatService } from './services/employee-chat.service';

interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  avatar?: string;
}

interface NewChatModalData {
  isOpen: boolean;
  selectedEmployeeId: string | null;
  searchQuery: string;
  employees: Employee[];
  filteredEmployees: Employee[];
}

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
  private chatService = inject(ComprehensiveChatService);
  private employeeChatService = inject(EmployeeChatService);
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
  totalUnreadCount = 0;
  onlineEmployees: Employee[] = [];

  // UI state
  messageText = '';
  searchQuery = '';
  showArchivedChats = false;

  // New chat modal
  newChatModal: NewChatModalData = {
    isOpen: false,
    selectedEmployeeId: null,
    searchQuery: '',
    employees: [],
    filteredEmployees: [],
  };

  ngOnInit(): void {
    this.initializeService();
    this.setupSubscriptions();
    this.setupTypingIndicator();
    this.setupSearch();
    this.loadEmployees();
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
      const accessToken = this.getAccessToken();
      await this.chatService.initialize(accessToken, ChatType.PersonToPerson);
      await this.employeeChatService.initialize(accessToken);
    } catch (error) {}
  }

  private setupSubscriptions(): void {
    // Active chats
    this.chatService.activeChats$
      .pipe(takeUntil(this.destroy$))
      .subscribe((chats) => {
        this.activeChats = chats.filter(
          (chat) => chat.type === 'PersonToPerson'
        );
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

    // Total unread count
    this.chatService.totalUnreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.totalUnreadCount = count;
        this.changeDetector.markForCheck();
      });

    // Online employees
    this.employeeChatService.onlineEmployees$
      .pipe(takeUntil(this.destroy$))
      .subscribe((employees) => {
        this.onlineEmployees = employees;
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
        this.filterChats(query);
      });
  }

  private async loadEmployees(): Promise<void> {
    try {
      const employees = await this.employeeChatService.getAllEmployees();
      this.newChatModal.employees = employees;
      this.newChatModal.filteredEmployees = employees;
    } catch (error) {}
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
      .catch((error) => {});
  }

  onMessageInput(): void {
    this.typingSubject.next(this.messageText.length > 0);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.searchSubject.next(this.searchQuery);
  }

  openNewChatModal(): void {
    this.newChatModal.isOpen = true;
    this.newChatModal.selectedEmployeeId = null;
    this.newChatModal.searchQuery = '';
    this.filterEmployees('');
  }

  closeNewChatModal(): void {
    this.newChatModal.isOpen = false;
    this.newChatModal.selectedEmployeeId = null;
    this.newChatModal.searchQuery = '';
  }

  filterEmployees(query: any): void {
    if (!query) {
      this.newChatModal.filteredEmployees = this.newChatModal.employees;
    } else {
      const lowerQuery = query.value.toLowerCase();
      this.newChatModal.filteredEmployees = this.newChatModal.employees.filter(
        (employee) =>
          employee.name.toLowerCase().includes(lowerQuery) ||
          employee.department.toLowerCase().includes(lowerQuery) ||
          employee.role.toLowerCase().includes(lowerQuery)
      );
    }
  }

  async startNewChat(): Promise<void> {
    if (!this.newChatModal.selectedEmployeeId) return;

    try {
      const selectedEmployee = this.newChatModal.employees.find(
        (e) => e.id === this.newChatModal.selectedEmployeeId
      );

      if (selectedEmployee) {
        const chatId = await this.employeeChatService.createDirectChat(
          selectedEmployee.id
        );
        this.closeNewChatModal();
        this.chatService.selectChat(chatId);
      }
    } catch (error) {}
  }

  getFilteredChats(): ChatSummaryDto[] {
    let filtered = this.activeChats;

    if (!this.showArchivedChats) {
      filtered = filtered.filter((chat) => chat.status !== 'Closed');
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chat) =>
          chat.title.toLowerCase().includes(query) ||
          (chat.lastMessage && chat.lastMessage.toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => {
      const dateA = a.lastActivityAt || a.createdAt;
      const dateB = b.lastActivityAt || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
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

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getEmployeeStatus(employeeId: string): string {
    const employee = this.onlineEmployees.find((e) => e.id === employeeId);
    return employee?.status || 'offline';
  }

  getEmployeeStatusColor(status: string): string {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  }

  getSenderName(message: MessageDto): string {
    if (!this.selectedChat) return 'Unknown';

    const participant = this.selectedChat.participants.find(
      (p) => p.userId === message.senderId
    );

    if (participant) {
      return message.senderId === this.getCurrentUserId()
        ? 'You'
        : this.getEmployeeName(message.senderId);
    }

    return 'System';
  }

  getEmployeeName(userId: string): string {
    // This should be retrieved from your employee service
    const employee = this.newChatModal.employees.find((e) => e.id === userId);
    return employee?.name || 'Unknown Employee';
  }

  isMessageFromCurrentUser(message: MessageDto): boolean {
    return message.senderId === this.getCurrentUserId();
  }

  private filterChats(query: string): void {
    this.changeDetector.markForCheck();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  private getAccessToken(): string {
    return localStorage.getItem('iFC03fkUWhcdYGciaclPyeqySdQE6qCd') || '';
  }

  private getCurrentUserId(): string {
    return 'current-user-id';
  }

  trackByChatId(index: number, chat: ChatSummaryDto): string {
    return chat.id;
  }

  trackByMessageId(index: number, message: MessageDto): string {
    return message.id;
  }

  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.id;
  }

  deleteMessage(messageId: string): void {
    if (confirm('Are you sure you want to delete this message?')) {
      this.employeeChatService
        .deleteMessage(messageId)
        .then(() => {})
        .catch((error) => {});
    }
  }

  editMessage(message: MessageDto): void {
    const newContent = prompt('Edit message:', message.content);
    if (newContent && newContent !== message.content) {
      this.employeeChatService
        .editMessage(message.id, newContent)
        .then(() => {})
        .catch((error) => {});
    }
  }
}
