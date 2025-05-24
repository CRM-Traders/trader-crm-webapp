import { Injectable, OnDestroy, inject } from '@angular/core';
import {
  BehaviorSubject,
  Subject,
  takeUntil,
  Observable,
  shareReplay,
  filter,
  map,
} from 'rxjs';
import { SocketConfig } from '../models/socket-config.model';
import { SocketMessage } from '../models/socket-message.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private authService = inject(AuthService);

  private connections: Map<
    string,
    {
      socket: WebSocket;
      status$: BehaviorSubject<boolean>;
      messages$: Subject<SocketMessage>;
      reconnectAttempts: number;
      reconnectInterval: number;
      destroy$: Subject<void>;
      autoReconnect: boolean;
    }
  > = new Map();

  private readonly defaultConfig: Partial<SocketConfig> = {
    reconnectInterval: 5000,
    reconnectAttempts: 10,
  };

  private destroy$ = new Subject<void>();

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.reconnectAll();
    } else {
      this.disconnectAll();
    }
  }

  public connect(key: string, config: SocketConfig): Observable<boolean> {
    if (this.connections.has(key)) {
      return this.connections.get(key)!.status$.asObservable();
    }

    const fullConfig = { ...this.defaultConfig, ...config };
    const { url, reconnectInterval, reconnectAttempts } = fullConfig;

    const status$ = new BehaviorSubject<boolean>(false);
    const messages$ = new Subject<SocketMessage>();
    const destroy$ = new Subject<void>();

    this.connections.set(key, {
      socket: this.createSocket(key, url, fullConfig.queryParams),
      status$,
      messages$,
      reconnectAttempts: 0,
      reconnectInterval: reconnectInterval as number,
      destroy$,
      autoReconnect: true,
    });

    return status$.asObservable().pipe(shareReplay(1));
  }

  public messages(key: string): Observable<SocketMessage> {
    if (!this.connections.has(key)) {
      throw new Error(`Socket connection '${key}' does not exist`);
    }

    return this.connections.get(key)!.messages$.asObservable();
  }

  public messagesOfType(key: string, type: string): Observable<any> {
    return this.messages(key).pipe(
      filter((message) => message.type === type),
      map((message) => message.payload)
    );
  }

  public send(key: string, message: SocketMessage): boolean {
    if (!this.connections.has(key)) {
      return false;
    }

    const connection = this.connections.get(key)!;

    if (connection.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      connection.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      return false;
    }
  }

  public disconnect(key: string, options: { reconnect?: boolean } = {}): void {
    if (!this.connections.has(key)) {
      return;
    }

    const connection = this.connections.get(key)!;

    if (options.reconnect === false) {
      connection.autoReconnect = false;
    }

    connection.socket.close();
    connection.destroy$.next();

    if (!connection.autoReconnect) {
      connection.destroy$.complete();
      this.connections.delete(key);
    }
  }

  public disconnectAll(): void {
    for (const key of this.connections.keys()) {
      this.disconnect(key);
    }
  }

  public reconnect(key: string): void {
    if (!this.connections.has(key)) {
      return;
    }

    const connection = this.connections.get(key)!;
    connection.socket.close();

    connection.reconnectAttempts = 0;

    const oldConnection = this.connections.get(key)!;
    const url = oldConnection.socket.url.split('?')[0];

    const urlObj = new URL(oldConnection.socket.url);
    const queryParams: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    oldConnection.socket = this.createSocket(key, url, queryParams);
  }

  public reconnectAll(): void {
    for (const key of this.connections.keys()) {
      this.reconnect(key);
    }
  }

  public status(key: string): Observable<boolean> {
    if (!this.connections.has(key)) {
      throw new Error(`Socket connection '${key}' does not exist`);
    }

    return this.connections.get(key)!.status$.asObservable();
  }

  private createSocket(
    key: string,
    url: string,
    queryParams?: Record<string, string>
  ): WebSocket {
    const connection = this.connections.get(key);

    const urlObj = new URL(url);
    const token = this.authService.getAccessToken();

    if (token) {
      urlObj.searchParams.set('token', token);
    }

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });
    }

    const socket = new WebSocket(urlObj.toString());

    socket.onopen = () => {
      if (connection) {
        connection.status$.next(true);
        connection.reconnectAttempts = 0;
      }
    };

    socket.onclose = (event) => {
      if (connection) {
        connection.status$.next(false);

        if (
          connection.autoReconnect &&
          connection.reconnectAttempts <
            (this.defaultConfig.reconnectAttempts || 10)
        ) {
          connection.reconnectAttempts++;

          setTimeout(() => {
            if (this.connections.has(key)) {
              this.connections.set(key, {
                ...connection,
                socket: this.createSocket(key, url, queryParams),
              });
            }
          }, connection.reconnectInterval);
        }
      }
    };

    socket.onerror = (error) => {};

    socket.onmessage = (event) => {
      if (connection) {
        try {
          const message = JSON.parse(event.data) as SocketMessage;
          connection.messages$.next(message);
        } catch (error) {}
      }
    };

    return socket;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnectAll();
  }
}
