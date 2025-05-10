import { inject, Inject } from "@angular/core";
import { environment } from "../../../environments/environment";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";


@Inject({
    providedIn:'root',
})
export class HttpService {
    private readonly _apiUrl = environment.gatewayDomain
    private _http = inject(HttpClient)

    get<T>(endpoint: string, params?: HttpParams, headers? : HttpHeaders) : Observable<T>{
        return this._http.get<T>(`${this._apiUrl}/${endpoint}`, {params: params, headers: headers})
    }

    post<T>(endpoint: string, body: string, params?: HttpParams, headers? : HttpHeaders) : Observable<T>{
        return this._http.post<T>(`${this._apiUrl}/${endpoint}`, body, {params: params, headers: headers})
    }
}