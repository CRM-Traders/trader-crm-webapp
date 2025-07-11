import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { AlertService } from '../../core/services/alert.service';
import { ModalRef } from '../../shared/models/modals/modal.model';
import { ModalService } from '../../shared/services/modals/modal.service';
import { Client, ClientStatus } from '../clients/models/clients.model';
import { ClientAccountsComponent } from './components/client-accounts/client-accounts.component';
import { ClientCallHistoryComponent } from './components/client-call-history/client-call-history.component';
import { ClientCallbacksComponent } from './components/client-callbacks/client-callbacks.component';
import { ClientFeedComponent } from './components/client-feed/client-feed.component';
import { ClientFilesComponent } from './components/client-files/client-files.component';
import { ClientNotesComponent } from './components/client-notes/client-notes.component';
import { ClientPaymentsComponent } from './components/client-payments/client-payments.component';
import { ClientProfileComponent } from './components/client-profile/client-profile.component';
import { ClientReferralsComponent } from './components/client-referrals/client-referrals.component';
import { ClientTradingActivityComponent } from './components/client-trading-activity/client-trading-activity.component';
import { ActivatedRoute, Router } from '@angular/router';
// Import the notes service and model
import { NotesService } from './components/client-notes/services/notes.service';
import { ClientNote } from './components/client-notes/models/note.model';
// Import callback creation modal
import { CallbackCreationModalComponent } from './components/client-callbacks/components/callback-creation-modal/callback-creation-modal.component';
import { NoteCreationModalComponent } from './components/client-notes/components/note-creation-modal/note-creation-modal.component';
import { UsersService } from './services/user.service';
import { ClientCommentsService } from './services/client-comments.service';
import { ClientComment } from './models/client-comment.model';

export enum ClientDetailSection {
  Profile = 'profile',
  Payments = 'payments',
  TradingActivity = 'trading-activity',
  Accounts = 'accounts',
  Callbacks = 'callbacks',
  Files = 'files',
  CallHistory = 'call-history',
  Notes = 'notes',
  Feed = 'feed',
  Referrals = 'referrals',
}

@Component({
  selector: 'app-client-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ClientProfileComponent,
    ClientPaymentsComponent,
    ClientTradingActivityComponent,
    ClientAccountsComponent,
    ClientCallbacksComponent,
    ClientFilesComponent,
    ClientCallHistoryComponent,
    ClientNotesComponent,
    ClientFeedComponent,
    ClientReferralsComponent,
  ],
  templateUrl: './client-details.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .sticky {
        position: -webkit-sticky;
        position: sticky;
      }
    `,
  ],
})
export class ClientDetailsComponent implements OnInit, OnDestroy {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private _userService = inject(UsersService);
  private notesService = inject(NotesService);
  private clientCommentsService = inject(ClientCommentsService);

  private destroy$ = new Subject<void>();

  activeSection: ClientDetailSection = ClientDetailSection.Profile;

  client!: Client;
  clientId!: string;
  // Pinned notes properties
  pinnedNotes: ClientNote[] = [];
  loadingPinnedNotes = false;

  clientComments: ClientComment[] = [];
  loadingClientComments = false;

  // Visibility properties for email and phone
  showEmail = false;
  showPhone = false;
  emailLoading = false;
  phoneLoading = false;
  emailFetched = false;
  phoneFetched = false;

  navigationSections = [
    { key: ClientDetailSection.Profile, label: 'Profile' },
    { key: ClientDetailSection.Payments, label: 'Payments' },
    { key: ClientDetailSection.TradingActivity, label: 'Trading Activity' },
    { key: ClientDetailSection.Accounts, label: 'Accounts' },
    { key: ClientDetailSection.Callbacks, label: 'Callbacks' },
    { key: ClientDetailSection.Files, label: 'Files' },
    // { key: ClientDetailSection.CallHistory, label: 'Call History' },
    { key: ClientDetailSection.Notes, label: 'Notes' },
    // { key: ClientDetailSection.Feed, label: 'Feed' },
    // { key: ClientDetailSection.Referrals, label: 'Referrals' },
  ];

  ngOnInit(): void {
    const clientId = this.activatedRoute.snapshot.paramMap.get('id');

    if (!clientId) {
      this.router.navigate(['/']);
      return;
    }

    this._userService.getClient(clientId).subscribe((result: any) => {
      // Map the API response to the Client interface
      this.client = {
        id: result.id,
        userId: result.userId,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
        telephone: result.telephone,
        secondTelephone: result.secondTelephone,
        skype: null, // Not provided in API response
        country: result.country,
        language: result.language,
        dateOfBirth: result.dateOfBirth,
        status: result.status,
        kycStatusId: result.kycStatusId,
        salesStatus: result.salesStatus,
        saleStatusEnum: null, // Not provided in API response
        isProblematic: result.isProblematic,
        isBonusAbuser: result.isBonusAbuser,
        bonusAbuserReason: result.bonusAbuserReason,
        hasInvestments: result.hasInvestments,
        affiliateId: result.affiliateId,
        affiliateName: result.affiliateName,
        ftdTime: result.ftdTime,
        ltdTime: result.ltdTime,
        qualificationTime: result.qualificationTime,
        registrationDate: result.registrationDate,
        registrationIP: result.registrationIP,
        source: result.source,
        lastLogin: result.lastLogin,
        lastCommunication: result.lastCommunication,
        balance: 0, // Not provided in API response, defaulting to 0
      };

      console.log('Client loaded:', this.client, result);
      // Load pinned notes and comments after client is loaded
      this.loadPinnedNotes();
      this.loadClientComments();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPinnedNotes(): void {
    if (!this.client?.id) return;

    this.loadingPinnedNotes = true;
    this.notesService
      .getClientCommentsById(this.client.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading pinned notes:', error);
          return of([]);
        })
      )
      .subscribe((notes) => {
        // Filter only pinned notes and sort by creation date (newest first)
        this.pinnedNotes = notes
          .filter((note) => note.isPinnedComment)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5); // Show only the first 5 pinned notes in the summary

        this.loadingPinnedNotes = false;
      });
  }

  private loadClientComments(): void {
    if (!this.client?.id) return;

    this.loadingClientComments = true;
    this.clientCommentsService
      .getClientComments(this.client.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading client comments:', error);
          return of([]);
        })
      )
      .subscribe((comments) => {
        // Sort comments by creation date (newest first)
        this.clientComments = comments.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        this.loadingClientComments = false;
      });
  }

  // Email visibility methods
  toggleEmailVisibility(): void {
    if (!this.showEmail && !this.emailFetched) {
      // Fetch email when showing for the first time
      this.emailLoading = true;
      this._userService.getEmail(this.client.userId).subscribe(
        (email) => {
          this.client.email = email.email;
          this.emailFetched = true;
          this.emailLoading = false;
          this.showEmail = true;
          console.log('Client email loaded:', this.client.email);
        },
        (error) => {
          console.error('Error loading client email:', error);
          this.emailLoading = false;
          // Still show the toggle even if fetch failed
          this.showEmail = true;
        }
      );
    } else {
      this.showEmail = !this.showEmail;
    }
  }

  maskEmail(email: string | undefined): string {
    if (!email) return 'Not provided';
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.***';

    const username = parts[0];
    const domain = parts[1];

    // Mask username (show first 2 chars if longer than 4, otherwise show 1 char)
    const maskedUsername =
      username.length > 4
        ? username.substring(0, 2) + '*'.repeat(username.length - 2)
        : username.substring(0, 1) + '*'.repeat(username.length - 1);

    // Mask domain
    const domainParts = domain.split('.');
    const maskedDomain = domainParts
      .map((part, index) =>
        index === domainParts.length - 1 ? part : '*'.repeat(part.length)
      )
      .join('.');

    return `${maskedUsername}@${maskedDomain}`;
  }

  // Phone visibility methods
  togglePhoneVisibility(): void {
    if (!this.showPhone && !this.phoneFetched) {
      // Fetch phone when showing for the first time
      this.phoneLoading = true;
      this._userService.getPhone(this.client.userId).subscribe(
        (phone) => {
          this.client.telephone = phone.phoneNumber;
          this.phoneFetched = true;
          this.phoneLoading = false;
          this.showPhone = true;
          console.log('Client phone loaded:', this.client.telephone);
        },
        (error) => {
          console.error('Error loading client phone:', error);
          this.phoneLoading = false;
          // Still show the toggle even if fetch failed
          this.showPhone = true;
        }
      );
    } else {
      this.showPhone = !this.showPhone;
    }
  }

  maskPhone(phone: string | undefined): string {
    if (!phone) return 'Not provided';

    // Remove all non-digit characters to work with clean number
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 4) {
      return '*'.repeat(phone.length);
    }

    // Show last 4 digits, mask the rest
    const lastFour = cleanPhone.slice(-4);
    const maskedPart = '*'.repeat(cleanPhone.length - 4);

    // Try to preserve original formatting if possible
    if (phone.includes('-') || phone.includes(' ') || phone.includes('(')) {
      // For formatted numbers, just replace digits with * except last 4
      return phone.replace(/\d(?=.*\d{4})/g, '*');
    }

    return maskedPart + lastFour;
  }

  openCallbackModal(): void {
    const modalRef = this.modalService.open(
      CallbackCreationModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        client: this.client,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.alertService.success('Callback scheduled successfully!');
          // Optionally refresh any callback-related data or navigate to callbacks section
          // this.setActiveSection(ClientDetailSection.Callbacks);
        }
      },
      () => {
        // User dismissed the modal
      }
    );
  }

  openNoteModal(): void {
    const modalRef = this.modalService.open(
      NoteCreationModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        clientId: this.client.id,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.alertService.success('Note added successfully!');
          // Refresh pinned notes and comments to show the new note if it's pinned
          this.loadPinnedNotes();
          this.loadClientComments();
          // Optionally navigate to notes section
          // this.setActiveSection(ClientDetailSection.Notes);
        }
      },
      () => {
        // User dismissed the modal
      }
    );
  }

  setActiveSection(section: ClientDetailSection): void {
    this.activeSection = section;
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${
      lastName?.charAt(0) || ''
    }`.toUpperCase();
  }

  getStatusLabel(status: number): string {
    const statusMap: { [key: number]: string } = {
      0: 'Active',
      1: 'Passive',
      2: 'Neutral',
      3: 'Inactive',
      4: 'Blocked',
      5: 'Disabled',
    };
    return statusMap[status] || 'Unknown';
  }

  getStatusColor(status: number): string {
    const colorMap: { [key: number]: string } = {
      0: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      1: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      3: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      4: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      5: 'bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }

  getPreviewText(text: string | undefined): string {
    if (!text) return '';
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  }

  refreshData(): void {
    this.alertService.success('Data refreshed successfully');
    // Reload pinned notes and comments along with other data
    this.loadPinnedNotes();
    this.loadClientComments();
  }

  getClientBalance(): string {
    return this.client?.balance ? this.client.balance.toFixed(2) : '0.00';
  }

  getClientRegistrationIP(): string {
    return this.client?.registrationIP || 'Not available';
  }

  getClientSource(): string {
    return this.client?.source || 'Not specified';
  }

  goBack(): void {
    this.router.navigate(['/clients']);
  }
}
