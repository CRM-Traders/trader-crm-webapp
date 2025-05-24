import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavigationService } from '../../../core/services/navigation.service';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AlertComponent } from '../alert/alert.component';
import { ModalComponent } from '../modal/modal.component';
import { ChatComponent } from '../chat/chat.component';

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
    ChatComponent,
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
