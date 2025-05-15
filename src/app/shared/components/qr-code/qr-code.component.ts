import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeUrl, DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss'],
})
export class QrCodeComponent implements OnChanges {
  @Input() value: string = '';
  @Input() size: number = 200;
  @Input() darkColor: string = '#000000';
  @Input() lightColor: string = '#ffffff';
  @Input() level: 'L' | 'M' | 'Q' | 'H' = 'M';
  @Input() includeMargin: boolean = true;

  qrDataUrl: SafeUrl | string = '';
  isLoading: boolean = true;
  hasError: boolean = false;
  errorMessage: string = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['value'] ||
      changes['size'] ||
      changes['darkColor'] ||
      changes['lightColor'] ||
      changes['level'] ||
      changes['includeMargin']
    ) {
      this.generateQRCode();
    }
  }

  private generateQRCode(): void {
    if (!this.value) {
      this.isLoading = false;
      this.hasError = true;
      this.errorMessage = 'No value provided for QR code generation';
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    try {
      const margin = this.includeMargin ? 4 : 0;
      const encodedValue = encodeURIComponent(this.value);
      const url = `https://chart.googleapis.com/chart?cht=qr&chs=${this.size}x${this.size}&chl=${encodedValue}&chld=${this.level}|${margin}`;

      this.qrDataUrl = this.sanitizer.bypassSecurityTrustUrl(url);
      this.isLoading = false;
    } catch (err: any) {
      this.isLoading = false;
      this.hasError = true;
      this.errorMessage = err.message || 'Failed to generate QR code';
      console.error('Error generating QR code:', err);
    }
  }
}
