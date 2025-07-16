import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { ClientsService } from '../../services/clients.service';
import {
  Client,
  ClientUpdateRequest,
  ClientStatus,
  ClientStatusLabels,
  ClientStatusColors,
} from '../../models/clients.model';

interface DepositHistory {
  id: string;
  amount: number;
  currency: string;
  date: Date;
  status: string;
  method: string;
}

interface WithdrawHistory {
  id: string;
  amount: number;
  currency: string;
  date: Date;
  status: string;
  method: string;
}

interface TransactionHistory {
  id: string;
  type: string;
  amount: number;
  currency: string;
  date: Date;
  status: string;
  description: string;
}

interface LoginHistory {
  id: string;
  loginTime: Date;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
}

interface TradingAccount {
  id: string;
  accountNumber: string;
  platform: string;
  balance: number;
  currency: string;
  status: string;
  createdDate: Date;
}

interface ClientComment {
  id: string;
  note: string;
  clientId: string;
  writerId: string;
  writerName: string;
  isPinnedComment: boolean;
  pinnedDate?: Date;
  createdDate: Date;
}

enum DetailSection {
  DepositHistory = 'deposits',
  TransactionHistory = 'transactions',
  LoginHistory = 'logins',
  TradingAccounts = 'accounts',
}

@Component({
  selector: 'app-client-details-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-details-modal.component.html',
  styleUrls: ['./client-details-modal.component.scss'],
})
export class ClientDetailsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() client!: Client;

  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  editForm: FormGroup;
  commentForm: FormGroup;
  isEditing = false;
  loading = false;

  // Section management
  DetailSection = DetailSection;
  activeSection: DetailSection = DetailSection.DepositHistory;

  detailSections = [
    { key: DetailSection.DepositHistory, label: 'Deposit History' },
    { key: DetailSection.TransactionHistory, label: 'Transaction History' },
    { key: DetailSection.LoginHistory, label: 'Login History' },
    { key: DetailSection.TradingAccounts, label: 'Trading Accounts' },
  ];

  // Status constants
  ClientStatus = ClientStatus;
  ClientStatusLabels = ClientStatusLabels;
  ClientStatusColors = ClientStatusColors;

  // Mock data - replace with actual service calls
  mockDepositHistory: DepositHistory[] = [
    {
      id: '1',
      amount: 1000,
      currency: 'USD',
      date: new Date('2024-01-15'),
      status: 'Completed',
      method: 'Credit Card',
    },
    {
      id: '2',
      amount: 2500,
      currency: 'USD',
      date: new Date('2024-01-20'),
      status: 'Completed',
      method: 'Bank Transfer',
    },
    {
      id: '3',
      amount: 500,
      currency: 'USD',
      date: new Date('2024-02-01'),
      status: 'Pending',
      method: 'PayPal',
    },
  ];

  mockTransactionHistory: TransactionHistory[] = [
    {
      id: '1',
      type: 'Deposit',
      amount: 1000,
      currency: 'USD',
      date: new Date('2024-01-15'),
      status: 'Completed',
      description: 'Initial deposit',
    },
    {
      id: '2',
      type: 'Bonus',
      amount: 100,
      currency: 'USD',
      date: new Date('2024-01-15'),
      status: 'Completed',
      description: 'Welcome bonus',
    },
    {
      id: '3',
      type: 'Trade',
      amount: -250,
      currency: 'USD',
      date: new Date('2024-01-16'),
      status: 'Completed',
      description: 'EUR/USD trade',
    },
  ];

  mockLoginHistory: LoginHistory[] = [
    {
      id: '1',
      loginTime: new Date('2024-01-25 09:30:00'),
      ipAddress: '192.168.1.1',
      location: 'New York, US',
      device: 'Desktop',
      browser: 'Chrome',
    },
    {
      id: '2',
      loginTime: new Date('2024-01-24 14:15:00'),
      ipAddress: '192.168.1.1',
      location: 'New York, US',
      device: 'Mobile',
      browser: 'Safari',
    },
    {
      id: '3',
      loginTime: new Date('2024-01-23 11:45:00'),
      ipAddress: '10.0.0.1',
      location: 'London, UK',
      device: 'Desktop',
      browser: 'Firefox',
    },
  ];

  mockTradingAccounts: TradingAccount[] = [
    {
      id: '1',
      accountNumber: 'TA-001234',
      platform: 'MT4',
      balance: 12450,
      currency: 'USD',
      status: 'Active',
      createdDate: new Date('2024-01-15'),
    },
    {
      id: '2',
      accountNumber: 'TA-001235',
      platform: 'MT5',
      balance: 8750,
      currency: 'EUR',
      status: 'Active',
      createdDate: new Date('2024-01-20'),
    },
    {
      id: '3',
      accountNumber: 'TA-001236',
      platform: 'cTrader',
      balance: 0,
      currency: 'USD',
      status: 'Inactive',
      createdDate: new Date('2024-02-01'),
    },
  ];

  mockComments: ClientComment[] = [
    {
      id: '1',
      note: 'Client requested additional information about trading strategies.',
      clientId: this.client?.id || '',
      writerId: 'writer-1',
      writerName: 'John Smith',
      isPinnedComment: true,
      pinnedDate: new Date('2024-01-20'),
      createdDate: new Date('2024-01-20'),
    },
    {
      id: '2',
      note: 'Follow-up call scheduled for next week to discuss portfolio performance.',
      clientId: this.client?.id || '',
      writerId: 'writer-2',
      writerName: 'Sarah Johnson',
      isPinnedComment: false,
      createdDate: new Date('2024-01-22'),
    },
  ];

  constructor() {
    this.editForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      telephone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      country: [''],
      language: [''],
    });

    this.commentForm = this.fb.group({
      note: ['', Validators.required],
      isPinnedComment: [false],
    });
  }

  ngOnInit(): void {
    if (this.client) {
      this.editForm.patchValue({
        firstName: this.client.firstName,
        lastName: this.client.lastName,
        telephone: this.client.telephone || '',
        country: this.client.country || '',
        language: this.client.language || '',
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveSection(section: DetailSection): void {
    this.activeSection = section;
  }

  startEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.client) {
      this.editForm.patchValue({
        firstName: this.client.firstName,
        lastName: this.client.lastName,
        telephone: this.client.telephone || '',
        country: this.client.country || '',
        language: this.client.language || '',
      });
    }
  }

  saveClient(): void {
    if (this.editForm.invalid || !this.client) return;

    const updateRequest: ClientUpdateRequest = {
      id: this.client.id,
      firstName: this.editForm.value.firstName,
      lastName: this.editForm.value.lastName,
      telephone: this.editForm.value.telephone || null,
      country: this.editForm.value.country || null,
      language: this.editForm.value.language || null,
    };

    this.loading = true;
    this.clientsService
      .updateClient(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.alertService.error('Failed to update client');
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((result) => {
        if (result !== null) {
          this.alertService.success('Client updated successfully');
          this.isEditing = false;

          // Update the client object with new values
          this.client = {
            ...this.client,
            firstName: this.editForm.value.firstName,
            lastName: this.editForm.value.lastName,
            telephone: this.editForm.value.telephone || null,
            country: this.editForm.value.country || null,
            language: this.editForm.value.language || null,
          };
        }
      });
  }

  addComment(): void {
    if (this.commentForm.invalid) return;

    const newComment: ClientComment = {
      id: Date.now().toString(),
      note: this.commentForm.value.note,
      clientId: this.client?.id || '',
      writerId: 'current-user-id', // Replace with actual current user ID
      writerName: 'Current User', // Replace with actual current user name
      isPinnedComment: this.commentForm.value.isPinnedComment,
      pinnedDate: this.commentForm.value.isPinnedComment
        ? new Date()
        : undefined,
      createdDate: new Date(),
    };

    this.mockComments.unshift(newComment);
    this.commentForm.reset({ isPinnedComment: false });
    this.alertService.success('Comment added successfully');
  }

  loginToClientAccount(): void {
    // Implement login to client account functionality
    // This could open a new window/tab with the client portal or trigger a login process
    const clientLoginUrl = `/client-portal/login?email=${this.client?.email}`;
    window.open(clientLoginUrl, '_blank');
    this.alertService.info('Opening client account login...');
  }

  onClose(): void {
    this.modalRef.close();
  }
}
