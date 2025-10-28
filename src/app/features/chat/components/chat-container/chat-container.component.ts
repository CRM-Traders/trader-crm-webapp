import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ChatStateService } from '../../services/chat-state.service';
import { ChatService } from '../../services/chat.service';
import { ChatSection } from '../../models/chat.model';
import { ChatListComponent } from '../chat-list/chat-list.component';
import { NewChatDialogComponent } from '../new-chat-dialog/new-chat-dialog.component';

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [CommonModule, ChatListComponent, NewChatDialogComponent],
  templateUrl: './chat-container.component.html',
  styleUrl: './chat-container.component.scss',
})
export class ChatContainerComponent implements OnInit, OnDestroy {
  private chatStateService = inject(ChatStateService);
  private chatService = inject(ChatService);
  private elementRef = inject(ElementRef);

  // Add this property
  showNewChatDialog = false;

  // Add this method
  openNewChatDialog(): void {
    this.showNewChatDialog = true;
  }

  closeNewChatDialog(): void {
    this.showNewChatDialog = false;
  }

  isVisible = false;
  activeSection: ChatSection = ChatSection.Client;
  pendingSection: ChatSection | null = null;
  showSectionDialog = false;
  hasOpenWindows = false;

  // Configuration: Set to true to always ask for confirmation
  private readonly ALWAYS_CONFIRM_SECTION_CHANGE = true;

  // Enum for template
  ChatSection = ChatSection;

  private destroy$ = new Subject<void>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Don't close if clicking inside the container or on the chat icon
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    const clickedOnChatIcon = (event.target as HTMLElement).closest(
      '[data-chat-trigger]'
    );

    if (
      !clickedInside &&
      !clickedOnChatIcon &&
      this.isVisible &&
      !this.showSectionDialog
    ) {
      this.closeContainer();
    }
  }

  ngOnInit(): void {
    // Subscribe to container visibility
    this.chatStateService.isChatContainerVisible
      .pipe(takeUntil(this.destroy$))
      .subscribe((visible) => {
        this.isVisible = visible;
        if (visible && this.activeSection) {
          // Load chats when container becomes visible
          this.loadChatsForSection(this.activeSection);
        }
      });

    // Subscribe to active section changes
    this.chatStateService.state
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.activeSection = state.activeSection;
        this.hasOpenWindows = state.openWindows.length > 0;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeContainer(): void {
    this.chatStateService.hideChatContainer();
  }

  onSectionClick(section: ChatSection): void {
    if (section === this.activeSection) {
      return;
    }

    // Check if we should show confirmation dialog
    const shouldConfirm =
      this.ALWAYS_CONFIRM_SECTION_CHANGE || this.hasOpenWindows;

    if (shouldConfirm) {
      // Show confirmation dialog
      this.pendingSection = section;
      this.showSectionDialog = true;
    } else {
      // Switch immediately without confirmation
      this.switchSection(section);
    }
  }

  confirmSectionSwitch(): void {
    if (this.pendingSection) {
      this.switchSection(this.pendingSection);
    }
    this.cancelSectionSwitch();
  }

  cancelSectionSwitch(): void {
    this.pendingSection = null;
    this.showSectionDialog = false;
  }

  private switchSection(section: ChatSection): void {
    // Close all open chat windows
    if (this.hasOpenWindows) {
      this.chatStateService.closeAllWindows();
    }

    // Update active section
    this.chatStateService.setActiveSection(section);

    // Load chats for the new section
    this.loadChatsForSection(section);
  }

  private loadChatsForSection(section: ChatSection): void {
    this.chatService.loadChats(section);
  }

  getSectionLabel(section: ChatSection): string {
    switch (section) {
      case ChatSection.Client:
        return 'Client Chats';
      case ChatSection.Operator:
        return 'Operator Chats';
      default:
        return '';
    }
  }

  getSectionIcon(section: ChatSection): string {
    switch (section) {
      case ChatSection.Client:
        return 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';
      case ChatSection.Operator:
        return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z';
      default:
        return '';
    }
  }

  getPendingSectionLabel(): string {
    return this.pendingSection ? this.getSectionLabel(this.pendingSection) : '';
  }
}
