import {
    Component,
    Input,
    OnDestroy,
    OnInit,
    inject,
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
  } from '@angular/forms';
  import { Subject, finalize, takeUntil } from 'rxjs';
  import { AffiliatesService } from '../../services/affiliates.service';
  import {
    Affiliate,
    AffiliateWhitelistResponse,
  } from '../../models/affiliates.model';
  import { AlertService } from '../../../../core/services/alert.service';
  import { ModalRef } from '../../../../shared/models/modals/modal.model';
  
  @Component({
    selector: 'app-affiliate-ip-whitelist-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './affiliate-ip-whitelist-modal.component.html',
  })
  export class AffiliateIpWhitelistModalComponent
    implements OnInit, OnDestroy
  {
    @Input() affiliate!: Affiliate;
    @Input() modalRef!: ModalRef;
  
    private affiliatesService = inject(AffiliatesService);
    private alertService = inject(AlertService);
    private fb = inject(FormBuilder);
    private destroy$ = new Subject<void>();
  
    ipForm: FormGroup = this.fb.group({
      singleIp: [''],
      bulkIps: [''],
    });
  
    whitelist: string[] = [];
    loadingWhitelist = false;
    addingIps = false;
    removingIps = false;
    invalidEntries: string[] = [];
    apiError: string | null = null;
    successMessage: string | null = null;
    selectedIps = new Set<string>();
    activeTab: 'single' | 'bulk' = 'single';
  
    ngOnInit(): void {
      if (!this.affiliate?.id) {
        this.alertService.error('Affiliate is required to manage whitelist');
        return;
      }
  
      this.loadWhitelist();
    }
  
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }
  
    loadWhitelist(): void {
      this.loadingWhitelist = true;
      this.affiliatesService
        .getAffiliateWhitelist(this.affiliate.id)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.loadingWhitelist = false))
        )
        .subscribe({
          next: (response: AffiliateWhitelistResponse) => {
            this.whitelist = response?.ipAddresses || [];
            this.selectedIps.clear();
          },
          error: () => {
            this.alertService.error('Failed to load whitelist');
          },
        });
    }
  
    addIpAddresses(): void {
      if (this.addingIps || !this.affiliate?.id) {
        return;
      }
  
      const { valid, invalid } = this.collectIpEntries();
      this.invalidEntries = invalid;
  
      if (!valid.length) {
        if (!invalid.length) {
          this.alertService.warning('Enter at least one IP or CIDR to add.');
        }
        return;
      }
  
      this.addingIps = true;
      this.apiError = null;
      this.successMessage = null;
  
      this.affiliatesService
        .addWhitelistIps(this.affiliate.id, valid)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.addingIps = false))
        )
        .subscribe({
          next: () => {
            const count = valid.length;
            this.successMessage = `Successfully added ${count} IP address${count === 1 ? '' : 'es'}`;
            this.alertService.success(this.successMessage);
            this.resetForm();
            this.loadWhitelist();
            this.clearMessageAfterDelay();
          },
          error: (error) => {
            const message =
              error?.error?.error || 'Failed to add IP addresses to whitelist';
            this.apiError = message;
            this.alertService.error(message);
            this.clearMessageAfterDelay();
          },
        });
    }
  
    removeSelectedIps(singleIp?: string): void {
      if (this.removingIps || !this.affiliate?.id) {
        return;
      }
  
      const toRemove = singleIp
        ? [singleIp]
        : Array.from(this.selectedIps.values());
  
      if (!toRemove.length) {
        this.alertService.warning('Select at least one IP address to remove.');
        return;
      }
  
      this.removingIps = true;
      this.apiError = null;
      this.successMessage = null;
  
      this.affiliatesService
        .removeWhitelistIps(this.affiliate.id, toRemove)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.removingIps = false))
        )
        .subscribe({
          next: () => {
            const count = toRemove.length;
            this.successMessage = `Successfully removed ${singleIp || count + ' selected'} IP address${count === 1 ? '' : 'es'}`;
            this.alertService.success(this.successMessage);
            toRemove.forEach((ip) => this.selectedIps.delete(ip));
            this.loadWhitelist();
            this.clearMessageAfterDelay();
          },
          error: (error) => {
            const message =
              error?.error?.error || 'Failed to remove IP addresses';
            this.apiError = message;
            this.alertService.error(message);
            this.clearMessageAfterDelay();
          },
        });
    }
  
    toggleSelection(ip: string): void {
      if (this.selectedIps.has(ip)) {
        this.selectedIps.delete(ip);
      } else {
        this.selectedIps.add(ip);
      }
    }
  
    clearSelection(): void {
      this.selectedIps.clear();
    }

    selectAllIps(): void {
      if (!this.whitelist.length) {
        return;
      }

      this.whitelist.forEach((ip) => this.selectedIps.add(ip));
    }
  
    resetForm(): void {
      this.ipForm.reset({
        singleIp: '',
        bulkIps: '',
      });
      this.invalidEntries = [];
      this.apiError = null;
    }
  
    setActiveTab(tab: 'single' | 'bulk'): void {
      if (this.activeTab === tab) {
        return;
      }
  
      this.activeTab = tab;
  
      if (tab === 'single') {
        this.ipForm.patchValue({ bulkIps: '' });
      } else {
        this.ipForm.patchValue({ singleIp: '' });
      }
  
      this.invalidEntries = [];
      this.apiError = null;
    }
  
    trackByIp(_: number, ip: string): string {
      return ip;
    }

    async pasteFromClipboard(field: 'singleIp' | 'bulkIps'): Promise<void> {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
        this.alertService.warning('Clipboard access is not supported in this browser.');
        return;
      }

      try {
        const text = await navigator.clipboard.readText();

        if (!text.trim()) {
          this.alertService.warning('Clipboard is empty.');
          return;
        }

        const control = this.ipForm.get(field);
        if (!control) {
          return;
        }

        control.setValue(field === 'singleIp' ? text.trim() : text);
        this.invalidEntries = [];
        this.apiError = null;
      } catch (error) {
        console.error('Clipboard paste failed', error);
        this.alertService.error('Unable to read from clipboard. Please allow permissions and try again.');
      }
    }
  
    private clearMessageAfterDelay(): void {
      setTimeout(() => {
        this.successMessage = null;
        this.apiError = null;
      }, 3000);
    }
  
    private collectIpEntries(): { valid: string[]; invalid: string[] } {
      const rawSingle =
        (this.ipForm.get('singleIp')?.value as string | null)?.trim() || '';
      const rawBulk =
        (this.ipForm.get('bulkIps')?.value as string | null)?.trim() || '';
  
      const entries = new Set<string>();
  
      if (rawSingle) {
        entries.add(rawSingle);
      }
  
      if (rawBulk) {
        rawBulk
          .split(/[\s,;]+/)
          .map((entry) => entry.trim())
          .filter(Boolean)
          .forEach((entry) => entries.add(entry));
      }
  
      const valid: string[] = [];
      const invalid: string[] = [];
  
      entries.forEach((entry) => {
        if (this.isValidIpOrCidr(entry)) {
          valid.push(entry);
        } else {
          invalid.push(entry);
        }
      });
  
      return { valid, invalid };
    }
  
    private isValidIpOrCidr(value: string): boolean {
      const [ipPart, prefix] = value.split('/');
  
      if (!this.isValidIpv4(ipPart)) {
        return false;
      }
  
      if (prefix === undefined) {
        return true;
      }
  
      if (prefix === '') {
        return false;
      }
  
      const prefixNumber = Number(prefix);
      return Number.isInteger(prefixNumber) && prefixNumber >= 0 && prefixNumber <= 32;
    }
  
    private isValidIpv4(value: string): boolean {
      const octets = value.split('.');
      if (octets.length !== 4) {
        return false;
      }
  
      return octets.every((octet) => {
        if (!/^\d+$/.test(octet)) {
          return false;
        }
        const num = Number(octet);
        return num >= 0 && num <= 255;
      });
    }
  }