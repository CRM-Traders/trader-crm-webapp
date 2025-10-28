import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { ChatType, ChatSection } from '../../models/chat.model';
import { Client, IdentityService } from '../../services/identity.service';

interface Operator {
  id: string;
  userId: string;
  value: string;
  department: string;
  role: string;
}

type SearchResultItem = Client | Operator;

@Component({
  selector: 'app-new-chat-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-chat-dialog.component.html',
  styleUrl: './new-chat-dialog.component.scss',
})
export class NewChatDialogComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() section: ChatSection = ChatSection.Client;
  @Output() close = new EventEmitter<void>();

  private identityService = inject(IdentityService);
  private chatService = inject(ChatService);

  searchQuery = '';
  searchResults: SearchResultItem[] = [];
  selectedItems: SearchResultItem[] = [];
  isLoading = false;
  groupChatName = '';

  // NEW: Track if user wants to create a group chat (only for Operators section)
  isCreatingGroupChat = false;

  private searchSubject$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Enums for template
  ChatSection = ChatSection;

  ngOnInit(): void {
    // Setup search with debounce
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => this.performSearch(query)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Search error:', error);
          this.isLoading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    if (query.trim().length >= 2) {
      this.isLoading = true;
      this.searchSubject$.next(query);
    } else {
      this.searchResults = [];
    }
  }

  private async performSearch(query: string): Promise<SearchResultItem[]> {
    try {
      if (this.section === ChatSection.Client) {
        const response = await this.identityService
          .searchClients(query, 0, 20)
          .toPromise();
        return response?.items || [];
      } else {
        // For Operators section, always search operators (for both 1-on-1 and group)
        const response = await this.identityService
          .searchOperators(query, 0, 20)
          .toPromise();
        return response?.items || [];
      }
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  toggleSelection(item: SearchResultItem): void {
    const isSelected = this.isItemSelected(item);

    if (isSelected) {
      this.selectedItems = this.selectedItems.filter(
        (i) => this.getItemId(i) !== this.getItemId(item)
      );
    } else {
      if (this.isCreatingGroupChat) {
        // Allow multiple selections for group chats
        this.selectedItems.push(item);
      } else {
        // Only one selection for 1-on-1 chats
        this.selectedItems = [item];
      }
    }
  }

  isItemSelected(item: SearchResultItem): boolean {
    return this.selectedItems.some(
      (i) => this.getItemId(i) === this.getItemId(item)
    );
  }

  removeSelected(item: SearchResultItem): void {
    this.selectedItems = this.selectedItems.filter(
      (i) => this.getItemId(i) !== this.getItemId(item)
    );
  }

  // NEW: Toggle between 1-on-1 and group chat creation
  toggleGroupChatMode(): void {
    this.isCreatingGroupChat = !this.isCreatingGroupChat;
    // Clear selections when switching modes
    this.selectedItems = [];
    this.groupChatName = '';
  }

  async createChat(): Promise<void> {
    if (this.selectedItems.length === 0) {
      return;
    }

    try {
      this.isLoading = true;

      if (this.section === ChatSection.Client) {
        // Create ClientToOperator chat
        const client = this.selectedItems[0] as Client;
        await this.chatService.createChat(
          ChatType.ClientToOperator,
          client.userId
        );
      } else if (this.section === ChatSection.Operator) {
        if (this.isCreatingGroupChat) {
          // Create OperatorGroup chat
          if (!this.groupChatName.trim()) {
            alert('Please enter a group name');
            this.isLoading = false;
            return;
          }

          const operatorIds = this.selectedItems.map(
            (item) => (item as Operator).userId
          );
          await this.chatService.createChat(
            ChatType.OperatorGroup,
            undefined,
            this.groupChatName.trim(),
            operatorIds
          );
        } else {
          // Create OperatorToOperator chat (1-on-1)
          const operator = this.selectedItems[0] as Operator;
          await this.chatService.createChat(
            ChatType.OperatorToOperator,
            operator.userId
          );
        }
      }

      // Close dialog after successful creation
      this.closeDialog();
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  closeDialog(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedItems = [];
    this.groupChatName = '';
    this.isCreatingGroupChat = false;
    this.close.emit();
  }

  getItemId(item: SearchResultItem): string {
    return item.userId;
  }

  getItemName(item: SearchResultItem): string {
    if ('fullName' in item) {
      return (item as Client).fullName;
    } else {
      return (item as Operator).value;
    }
  }

  getItemSubtitle(item: SearchResultItem): string {
    if ('externalId' in item) {
      return `ID: ${(item as Client).externalId}`;
    } else {
      const operator = item as Operator;
      return `${operator.department} - ${operator.role}`;
    }
  }

  getItemAvatar(item: SearchResultItem): string {
    const name = this.getItemName(item);
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getDialogTitle(): string {
    if (this.section === ChatSection.Client) {
      return 'New Chat with Client';
    } else if (this.isCreatingGroupChat) {
      return 'Create Group Chat';
    } else {
      return 'New Chat with Operator';
    }
  }

  getSearchPlaceholder(): string {
    if (this.section === ChatSection.Client) {
      return 'Search clients by name or ID...';
    } else {
      return 'Search operators by name...';
    }
  }

  canCreate(): boolean {
    if (this.selectedItems.length === 0) {
      return false;
    }

    if (this.isCreatingGroupChat && !this.groupChatName.trim()) {
      return false;
    }

    return true;
  }

  // NEW: Check if we should show group chat toggle
  shouldShowGroupToggle(): boolean {
    return this.section === ChatSection.Operator;
  }
}
