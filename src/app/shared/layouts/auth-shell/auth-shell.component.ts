import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppSidebarComponent } from '../../components/app-sidebar/app-sidebar.component';

@Component({
  selector: 'app-auth-shell',
  imports: [RouterOutlet, AppSidebarComponent],
  templateUrl: './auth-shell.component.html',
})
export class AuthShellComponent {}
