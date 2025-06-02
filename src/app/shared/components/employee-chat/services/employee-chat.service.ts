// src/app/shared/services/chat/employee-chat.service.ts

import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable, timer, of } from 'rxjs';
import {
  map,
  tap,
  catchError,
  switchMap,
  takeUntil,
  shareReplay,
  distinctUntilChanged,
} from 'rxjs/operators';
import {
  CreateChatCommand,
  ChatType,
} from '../../../models/chat/chat-system.model';
import { ChatApiService } from '../../../services/chat/chat-api.service';
import { EmployeeApiService } from './employee-api.service';

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  avatar?: string;
  lastSeenAt?: Date;
}

export interface EmployeePresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeenAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeChatService implements OnDestroy {
  private chatApi = inject(ChatApiService);
  private employeeApi = inject(EmployeeApiService);

  private destroy$ = new Subject<void>();
  private accessToken: string = '';

  // State management
  private employeesSubject = new BehaviorSubject<Employee[]>([]);
  private onlineEmployeesSubject = new BehaviorSubject<Employee[]>([]);
  private employeePresenceSubject = new BehaviorSubject<
    Map<string, EmployeePresence>
  >(new Map());

  // Public observables
  employees$ = this.employeesSubject.asObservable();
  onlineEmployees$ = this.onlineEmployeesSubject.asObservable();
  employeePresence$ = this.employeePresenceSubject.asObservable();

  constructor() {
    this.setupPresencePolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async initialize(accessToken: string): Promise<void> {
    this.accessToken = accessToken;
    await this.loadEmployees();
    await this.updateEmployeePresence();
  }

  private setupPresencePolling(): void {
    // Poll for presence updates every 30 seconds
    timer(0, 30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.accessToken) {
          this.updateEmployeePresence();
        }
      });
  }

  async loadEmployees(): Promise<void> {
    try {
      const employees = await this.employeeApi.getAllEmployees().toPromise();
      if (employees) {
        this.employeesSubject.next(employees);
        this.updateOnlineEmployees();
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  }

  async updateEmployeePresence(): Promise<void> {
    try {
      const presenceData = await this.employeeApi
        .getEmployeePresence()
        .toPromise();
      if (presenceData) {
        const presenceMap = new Map<string, EmployeePresence>();
        presenceData.forEach((presence) => {
          presenceMap.set(presence.userId, presence);
        });
        this.employeePresenceSubject.next(presenceMap);
        this.updateOnlineEmployees();
      }
    } catch (error) {
      console.error('Failed to update employee presence:', error);
    }
  }

  private updateOnlineEmployees(): void {
    const employees = this.employeesSubject.value;
    const presenceMap = this.employeePresenceSubject.value;

    const onlineEmployees = employees
      .map((employee) => {
        const presence = presenceMap.get(employee.id);
        if (presence) {
          return {
            ...employee,
            status: presence.status,
            lastSeenAt: presence.lastSeenAt,
          };
        }
        return employee;
      })
      .filter((employee) => employee.status !== 'offline');

    this.onlineEmployeesSubject.next(onlineEmployees);
  }

  async getAllEmployees(): Promise<Employee[]> {
    if (this.employeesSubject.value.length === 0) {
      await this.loadEmployees();
    }
    return this.employeesSubject.value;
  }

  async createDirectChat(targetEmployeeId: string): Promise<string> {
    try {
      // Check if a direct chat already exists with this employee
      const existingChat = await this.findExistingDirectChat(targetEmployeeId);
      if (existingChat) {
        return existingChat;
      }

      // Get target employee details
      const targetEmployee = this.employeesSubject.value.find(
        (e) => e.id === targetEmployeeId
      );
      if (!targetEmployee) {
        throw new Error('Employee not found');
      }

      // Create new chat
      const command: CreateChatCommand = {
        title: targetEmployee.name,
        type: ChatType.PersonToPerson,
        description: `Direct chat with ${targetEmployee.name}`,
        priority: 2,
        targetOperatorId: targetEmployeeId,
      };

      const chatId = await this.chatApi.createChat(command).toPromise();
      if (!chatId) {
        throw new Error('Failed to create chat');
      }

      return chatId;
    } catch (error) {
      console.error('Failed to create direct chat:', error);
      throw error;
    }
  }

  async findExistingDirectChat(
    targetEmployeeId: string
  ): Promise<string | null> {
    try {
      // Search for existing direct chats with the target employee
      const searchParams = {
        type: 'PersonToPerson',
        pageIndex: 1,
        pageSize: 100,
      };

      const result = await this.chatApi.searchChats(searchParams).toPromise();
      if (result) {
        // Find a chat that includes only the current user and target employee
        const existingChat = result.items.find((chat) => {
          // This logic should be refined based on your actual chat participant structure
          return (
            chat.type === 'PersonToPerson' &&
            (chat.initiatorId === targetEmployeeId ||
              chat.assignedOperatorId === targetEmployeeId)
          );
        });

        return existingChat ? existingChat.id : null;
      }
      return null;
    } catch (error) {
      console.error('Failed to find existing direct chat:', error);
      return null;
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await this.chatApi.deleteMessage(messageId).toPromise();
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }

  async editMessage(messageId: string, newContent: string): Promise<void> {
    try {
      await this.chatApi.editMessage(messageId, { newContent }).toPromise();
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  }

  getEmployeeById(employeeId: string): Employee | undefined {
    return this.employeesSubject.value.find((e) => e.id === employeeId);
  }

  getEmployeePresence(employeeId: string): EmployeePresence | undefined {
    return this.employeePresenceSubject.value.get(employeeId);
  }

  isEmployeeOnline(employeeId: string): boolean {
    const presence = this.getEmployeePresence(employeeId);
    return presence ? presence.status !== 'offline' : false;
  }

  getEmployeeLastSeen(employeeId: string): Date | undefined {
    const presence = this.getEmployeePresence(employeeId);
    return presence?.lastSeenAt;
  }

  searchEmployees(query: string): Employee[] {
    const lowerQuery = query.toLowerCase();
    return this.employeesSubject.value.filter(
      (employee) =>
        employee.name.toLowerCase().includes(lowerQuery) ||
        employee.email.toLowerCase().includes(lowerQuery) ||
        employee.department.toLowerCase().includes(lowerQuery) ||
        employee.role.toLowerCase().includes(lowerQuery)
    );
  }
}
