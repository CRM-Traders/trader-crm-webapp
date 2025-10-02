import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChatWindow, ChatUser } from './chat.service';

export interface ChatState {
  openChats: ChatWindow[];
  lastActiveChannel: 'clients' | 'operators';
}

export interface ProfileState {
  isEditing: boolean;
  expandedSections: string[];
}

@Injectable({
  providedIn: 'root',
})
export class UiStateService {
  private readonly CHAT_STORAGE_KEY = 'trader-crm-chat-state';
  
  private chatStateSubject = new BehaviorSubject<ChatState>({
    openChats: [],
    lastActiveChannel: 'clients'
  });

  public chatState$ = this.chatStateSubject.asObservable();

  constructor() {
    this.loadChatState();
  }

  // Chat State Management
  getChatState(): ChatState {
    return this.chatStateSubject.value;
  }

  updateChatState(updates: Partial<ChatState>): void {
    const currentState = this.chatStateSubject.value;
    const newState = { ...currentState, ...updates };
    this.chatStateSubject.next(newState);
    this.saveChatState(newState);
  }

  addOpenChat(chat: ChatWindow): void {
    const currentState = this.chatStateSubject.value;
    const existingChatIndex = currentState.openChats.findIndex(c => c.user.id === chat.user.id);
    
    let updatedChats: ChatWindow[];
    if (existingChatIndex >= 0) {
      // Update existing chat
      updatedChats = [...currentState.openChats];
      updatedChats[existingChatIndex] = chat;
    } else {
      // Add new chat
      updatedChats = [...currentState.openChats, chat];
    }
    
    this.updateChatState({ openChats: updatedChats });
  }

  removeOpenChat(chatId: string): void {
    const currentState = this.chatStateSubject.value;
    const updatedChats = currentState.openChats.filter(c => c.id !== chatId);
    this.updateChatState({ openChats: updatedChats });
  }

  updateChatMinimizedState(chatId: string, isMinimized: boolean): void {
    const currentState = this.chatStateSubject.value;
    const updatedChats = currentState.openChats.map(chat =>
      chat.id === chatId ? { ...chat, isMinimized } : chat
    );
    this.updateChatState({ openChats: updatedChats });
  }

  setLastActiveChannel(channel: 'clients' | 'operators'): void {
    this.updateChatState({ lastActiveChannel: channel });
  }

  // Storage Methods
  private saveChatState(state: ChatState): void {
    try {
      localStorage.setItem(this.CHAT_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save chat state to localStorage:', error);
    }
  }

  private loadChatState(): void {
    try {
      const stored = localStorage.getItem(this.CHAT_STORAGE_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored);
        // Validate and sanitize the loaded state
        const validatedState: ChatState = {
          openChats: this.validateChatWindows(parsedState.openChats || []),
          lastActiveChannel: parsedState.lastActiveChannel || 'clients'
        };
        this.chatStateSubject.next(validatedState);
      }
    } catch (error) {
      console.warn('Failed to load chat state from localStorage:', error);
    }
  }

  private validateChatWindows(chatWindows: any[]): ChatWindow[] {
    if (!Array.isArray(chatWindows)) {
      return [];
    }

    return chatWindows.filter(chat => {
      return chat &&
             typeof chat.id === 'string' &&
             chat.user &&
             typeof chat.user.id === 'string' &&
             typeof chat.user.name === 'string' &&
             typeof chat.user.email === 'string' &&
             typeof chat.isMinimized === 'boolean';
    }).map(chat => ({
      ...chat,
      // Ensure dates are properly converted back to Date objects
      user: {
        ...chat.user,
        lastMessageTime: chat.user.lastMessageTime ? new Date(chat.user.lastMessageTime) : new Date()
      }
    }));
  }

  // Utility methods
  clearAllState(): void {
    try {
      localStorage.removeItem(this.CHAT_STORAGE_KEY);
      this.chatStateSubject.next({
        openChats: [],
        lastActiveChannel: 'clients'
      });
    } catch (error) {
      console.warn('Failed to clear UI state from localStorage:', error);
    }
  }

  exportState(): { chat: ChatState } {
    return {
      chat: this.getChatState(),
    };
  }

  importState(state: { chat?: ChatState }): void {
    if (state.chat) {
      this.chatStateSubject.next(state.chat);
      this.saveChatState(state.chat);
    }
  }
}
