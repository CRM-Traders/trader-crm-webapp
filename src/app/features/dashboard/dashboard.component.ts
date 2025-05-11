import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AlertService } from '../../core/services/alert.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: true,
})
export class DashboardComponent {
  alert = inject(AlertService);

  constructor() {
    this.alert.success('WohoooWohoooWohoooWohoooWohooo');
    this.alert.error('WohoooWohoooWohoooWohoooWohooo');
    this.alert.warning('WohoooWohoooWohoooWohoooWohooo');
    this.alert.info('WohoooWohoooWohoooWohoooWohooo');
  }
}
