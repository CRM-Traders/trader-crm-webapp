import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavigationService } from '../../../core/services/navigation.service';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertComponent } from '../alert/alert.component';
import { ModalComponent } from '../modal/modal.component';
import { ChatContainerComponent } from '../../../features/chat/components/chat-container/chat-container.component';
import { ChatWindowComponent } from '../../../features/chat/components/chat-window/chat-window.component';
import { MinimizedChatsComponent } from '../../../features/chat/components/minimized-chats/minimized-chats.component';
import { ChatWindowsComponent } from '../../../features/chat/components/chat-windows/chat-windows.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    SidebarComponent,
    AlertComponent,
    ModalComponent,
    ChatContainerComponent,
    ChatWindowsComponent,
    MinimizedChatsComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  private navService = inject(NavigationService);
  sidebarExpanded = true;

  ngOnInit(): void {
    this.navService.expanded$.subscribe((expanded) => {
      this.sidebarExpanded = expanded;
    });
  }
}
