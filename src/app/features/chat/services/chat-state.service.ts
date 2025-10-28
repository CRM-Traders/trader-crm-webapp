import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ChatSection, ChatWindowState, ChatState } from '../models/chat.model';

interface StorageEvent {
  key: string;
  newValue: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ChatStateService {
  private readonly STORAGE_KEY = 'crm_chat_state';
  private readonly MAX_OPEN_WINDOWS = 3;
  private chatContainerVisible$ = new BehaviorSubject<boolean>(false);

  private state$ = new BehaviorSubject<ChatState>(this.loadState());
  private storageChanges$: Observable<ChatState>;

  constructor() {
    // Listen for changes from other tabs
    this.storageChanges$ = fromEvent<StorageEvent>(window, 'storage').pipe(
      filter((event) => event.key === this.STORAGE_KEY),
      map((event) =>
        event.newValue ? JSON.parse(event.newValue) : this.getDefaultState()
      ),
      filter((state) => state !== null)
    );

    // Sync state when other tabs make changes
    this.storageChanges$.subscribe((state) => {
      this.state$.next(state);
    });

    // Save state whenever it changes
    this.state$.subscribe((state) => {
      this.saveState(state);
    });
  }

  // Public observables
  get state(): Observable<ChatState> {
    return this.state$.asObservable();
  }

  get currentState(): ChatState {
    return this.state$.value;
  }

  get activeSection(): ChatSection {
    return this.state$.value.activeSection;
  }

  get openWindows(): ChatWindowState[] {
    return this.state$.value.openWindows;
  }

  get isChatContainerVisible(): Observable<boolean> {
    return this.chatContainerVisible$.asObservable();
  }

  toggleChatContainer(): void {
    this.chatContainerVisible$.next(!this.chatContainerVisible$.value);
  }

  showChatContainer(): void {
    this.chatContainerVisible$.next(true);
  }

  hideChatContainer(): void {
    this.chatContainerVisible$.next(false);
  }

  getChatContainerVisibility(): boolean {
    return this.chatContainerVisible$.value;
  }

  // Section management
  setActiveSection(section: ChatSection): void {
    const currentState = this.state$.value;
    this.state$.next({
      ...currentState,
      activeSection: section,
    });
  }

  // Window management
  openChatWindow(chatId: string): boolean {
    const currentState = this.state$.value;
    const existingWindow = currentState.openWindows.find(
      (w) => w.chatId === chatId
    );

    if (existingWindow) {
      // If already open, just unminimize it
      this.maximizeWindow(chatId);
      return true;
    }

    // Check if we've reached the maximum
    const nonMinimizedWindows = currentState.openWindows.filter(
      (w) => !w.isMinimized
    );
    if (nonMinimizedWindows.length >= this.MAX_OPEN_WINDOWS) {
      // Minimize the oldest window
      const oldestWindow = nonMinimizedWindows.reduce((oldest, current) =>
        current.position < oldest.position ? current : oldest
      );
      this.minimizeWindow(oldestWindow.chatId);
    }

    // Add new window
    const maxPosition =
      currentState.openWindows.length > 0
        ? Math.max(...currentState.openWindows.map((w) => w.position))
        : -1;

    const newWindow: ChatWindowState = {
      chatId,
      isMinimized: false,
      position: maxPosition + 1,
    };

    this.state$.next({
      ...currentState,
      openWindows: [...currentState.openWindows, newWindow],
      lastActiveChat: chatId,
    });

    return true;
  }

  closeChatWindow(chatId: string): void {
    const currentState = this.state$.value;
    const openWindows = currentState.openWindows.filter(
      (w) => w.chatId !== chatId
    );

    // Reorder positions
    const reorderedWindows = openWindows.map((window, index) => ({
      ...window,
      position: index,
    }));

    this.state$.next({
      ...currentState,
      openWindows: reorderedWindows,
      lastActiveChat:
        currentState.lastActiveChat === chatId
          ? reorderedWindows[0]?.chatId || undefined
          : currentState.lastActiveChat,
    });
  }

  minimizeWindow(chatId: string): void {
    const currentState = this.state$.value;
    const updatedWindows = currentState.openWindows.map((w) =>
      w.chatId === chatId ? { ...w, isMinimized: true } : w
    );

    this.state$.next({
      ...currentState,
      openWindows: updatedWindows,
    });
  }

  maximizeWindow(chatId: string): void {
    const currentState = this.state$.value;

    // Check if maximizing would exceed the limit
    const nonMinimizedWindows = currentState.openWindows.filter(
      (w) => !w.isMinimized && w.chatId !== chatId
    );

    let updatedWindows = [...currentState.openWindows];

    if (nonMinimizedWindows.length >= this.MAX_OPEN_WINDOWS) {
      // Minimize the oldest non-minimized window
      const oldestWindow = nonMinimizedWindows.reduce((oldest, current) =>
        current.position < oldest.position ? current : oldest
      );
      updatedWindows = updatedWindows.map((w) =>
        w.chatId === oldestWindow.chatId ? { ...w, isMinimized: true } : w
      );
    }

    // Maximize the requested window
    updatedWindows = updatedWindows.map((w) =>
      w.chatId === chatId ? { ...w, isMinimized: false } : w
    );

    this.state$.next({
      ...currentState,
      openWindows: updatedWindows,
      lastActiveChat: chatId,
    });
  }

  toggleWindowMinimize(chatId: string): void {
    const currentState = this.state$.value;
    const window = currentState.openWindows.find((w) => w.chatId === chatId);

    if (!window) return;

    if (window.isMinimized) {
      this.maximizeWindow(chatId);
    } else {
      this.minimizeWindow(chatId);
    }
  }

  isChatOpen(chatId: string): boolean {
    return this.state$.value.openWindows.some((w) => w.chatId === chatId);
  }

  isChatMinimized(chatId: string): boolean {
    const window = this.state$.value.openWindows.find(
      (w) => w.chatId === chatId
    );
    return window?.isMinimized ?? false;
  }

  getWindowPosition(chatId: string): number {
    const window = this.state$.value.openWindows.find(
      (w) => w.chatId === chatId
    );
    return window?.position ?? -1;
  }

  getMinimizedWindows(): ChatWindowState[] {
    return this.state$.value.openWindows
      .filter((w) => w.isMinimized)
      .sort((a, b) => a.position - b.position);
  }

  getMaximizedWindows(): ChatWindowState[] {
    return this.state$.value.openWindows
      .filter((w) => !w.isMinimized)
      .sort((a, b) => a.position - b.position);
  }

  // Clear all open windows
  closeAllWindows(): void {
    const currentState = this.state$.value;
    this.state$.next({
      ...currentState,
      openWindows: [],
      lastActiveChat: undefined,
    });
  }

  // Reset to default state
  resetState(): void {
    this.state$.next(this.getDefaultState());
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Private methods
  private loadState(): ChatState {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the loaded state
        return this.validateState(parsed);
      }
    } catch (error) {
      console.error('Error loading chat state from localStorage:', error);
    }
    return this.getDefaultState();
  }

  private saveState(state: ChatState): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving chat state to localStorage:', error);
    }
  }

  private validateState(state: any): ChatState {
    // ✅ FIX: Only validate against Client and Operators sections
    const validSections = [ChatSection.Client, ChatSection.Operator];

    return {
      activeSection: validSections.includes(state.activeSection)
        ? state.activeSection
        : ChatSection.Client,
      openWindows: Array.isArray(state.openWindows)
        ? state.openWindows.filter(
            (w: any) =>
              w &&
              typeof w.chatId === 'string' &&
              typeof w.isMinimized === 'boolean'
          )
        : [],
      lastActiveChat:
        typeof state.lastActiveChat === 'string'
          ? state.lastActiveChat
          : undefined,
    };
  }

  private getDefaultState(): ChatState {
    return {
      activeSection: ChatSection.Client,
      openWindows: [],
      lastActiveChat: undefined,
    };
  }
}
