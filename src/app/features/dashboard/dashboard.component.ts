// dashboard.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DashboardService } from './services/dashboard.services';
import { DashboardData } from './models/dashboard.models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: true,
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  dashboardData: DashboardData | null = null;
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load dashboard data';
        this.loading = false;
      },
    });
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  getRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else if (diffDays <= 14) {
      return '1 week ago';
    } else {
      return `${Math.floor((diffDays - 1) / 7)} weeks ago`;
    }
  }

  getCountryDisplayName(country: string): string {
    // Handle phone numbers and country codes
    if (country.startsWith('+') || /^\d+$/.test(country)) {
      return 'Unknown';
    }

    // Country code mapping for better display
    const countryMap: { [key: string]: string } = {
      AF: 'Afghanistan',
      AL: 'Albania',
      AR: 'Argentina',
      AS: 'American Samoa',
      AW: 'Aruba',
      AX: 'Åland Islands',
      BA: 'Bosnia and Herzegovina',
      BS: 'Bahamas',
      GE: 'Georgia',
      MX: 'Mexico',
    };

    return countryMap[country] || country;
  }

  getValidCountries(): string[] {
    if (!this.dashboardData?.registrationCountries) return [];

    return this.dashboardData.registrationCountries
      .filter((country) => !country.startsWith('+') && !/^\d+$/.test(country))
      .map((country) => this.getCountryDisplayName(country))
      .filter((country) => country !== 'Unknown');
  }

  refreshData(): void {
    this.loadDashboardData();
  }
}
