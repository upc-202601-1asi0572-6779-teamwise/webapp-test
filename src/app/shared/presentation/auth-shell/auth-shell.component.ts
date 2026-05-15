import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';
import { NotificationDropdownComponent } from '../notification-dropdown/notification-dropdown.component';

@Component({
  selector: 'app-auth-shell',
  imports: [RouterOutlet, AppSidebarComponent, NotificationDropdownComponent],
  templateUrl: './auth-shell.component.html',
})
export class AuthShellComponent {}
