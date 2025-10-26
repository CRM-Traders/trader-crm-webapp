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
          .searchClients(query, 1, 20)
          .toPromise();
        return response?.items || [];
      } else {
        const response = await this.identityService
          .searchOperators(query, 1, 20)
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
      if (this.section === ChatSection.Group) {
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
          client.userId // This is the client's userId
        );
      } else if (this.section === ChatSection.Operator) {
        // Create OperatorToOperator chat
        const operator = this.selectedItems[0] as Operator;
        await this.chatService.createChat(
          ChatType.OperatorToOperator,
          operator.userId // This is the other operator's userId
        );
      } else if (this.section === ChatSection.Group) {
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
      }

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
    switch (this.section) {
      case ChatSection.Client:
        return 'New Chat with Client';
      case ChatSection.Operator:
        return 'New Chat with Operator';
      case ChatSection.Group:
        return 'Create Group Chat';
      default:
        return 'New Chat';
    }
  }

  getSearchPlaceholder(): string {
    switch (this.section) {
      case ChatSection.Client:
        return 'Search clients by name or ID...';
      case ChatSection.Operator:
        return 'Search operators by name...';
      case ChatSection.Group:
        return 'Search operators to add...';
      default:
        return 'Search...';
    }
  }

  canCreate(): boolean {
    if (this.selectedItems.length === 0) {
      return false;
    }

    if (this.section === ChatSection.Group && !this.groupChatName.trim()) {
      return false;
    }

    return true;
  }
}
