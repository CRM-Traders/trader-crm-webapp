import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private apiUrl = 'identity/api/payments';

  constructor(private http: HttpService) {}

  getPaymentStatistics(dateRange: any): Observable<any> {
    const params = new HttpParams()
      .set('startDate', dateRange.start.toISOString())
      .set('endDate', dateRange.end.toISOString());

    return this.http.get(`${this.apiUrl}/statistics`);
  }

  approvePayment(transactionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${transactionId}/approve`, {});
  }

  rejectPayment(transactionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${transactionId}/reject`, {});
  }

  // exportPayments(request: any): Observable<Blob> {
  //   return this.http.post(`${this.apiUrl}/export`, request, {
  //     responseType: 'blob',
  //   });
  // }
}
