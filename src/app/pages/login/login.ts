import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly authService = inject(AuthService);
  readonly isBusy = this.authService.isBusy;

  protected async onGoogleLogin(): Promise<void> {
    await this.authService.signInWithGoogle();
  }
}
