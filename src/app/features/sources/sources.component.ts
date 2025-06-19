import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../../core/services/alert.service';
import { catchError, finalize, of } from 'rxjs';
import { HttpService } from '../../core/services/http.service';

@Component({
  selector: 'app-sources',
  imports: [CommonModule],
  templateUrl: './sources.component.html',
  styleUrl: './sources.component.scss',
  standalone: true,
})
export class SourcesComponent implements OnInit {
  private http = inject(HttpService);
  private alertService = inject(AlertService);

  readonly domains = signal<string[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  private readonly DOMAINS_API_URL = 'api/domains';

  ngOnInit(): void {
    this.loadDomains();
  }

  loadDomains(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http
      .get<string[]>(this.DOMAINS_API_URL)
      .pipe(
        catchError((error) => {
          console.error('Error loading domains:', error);
          this.error.set(
            'Failed to load domains. Please check if the API server is running.'
          );
          this.alertService.error('Failed to load domains');
          return of([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (domains) => {
          this.domains.set(domains);
          if (domains.length === 0) {
            this.alertService.info('No domains found');
          }
        },
      });
  }

  copyToClipboard(domain: string): void {
    navigator.clipboard
      .writeText(domain)
      .then(() => {
        this.alertService.success(`Domain "${domain}" copied to clipboard`);
      })
      .catch(() => {
        this.alertService.error('Failed to copy domain to clipboard');
      });
  }

  openDomain(domain: string): void {
    window.open(`https://${domain}`, '_blank');
  }

  refreshDomains(): void {
    this.loadDomains();
  }

  trackByDomain(index: number, domain: string): string {
    return domain;
  }

  getDomainName(domain: string): string {
    // Extract the subdomain part before the first dot
    const parts = domain.split('.');
    return parts[0];
  }

  getUniqueSubdomains(): number {
    const subdomains = new Set(
      this.domains().map((domain) => this.getDomainName(domain))
    );
    return subdomains.size;
  }
}
