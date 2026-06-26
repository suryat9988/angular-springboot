import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [MatCardModule, MatButtonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly authService = inject(AuthService);
  readonly isBusy = this.authService.isBusy;
  readonly isFirebaseReady = this.authService.isFirebaseReady;
  readonly errorMessage = signal<string | null>(null);

  protected async onGmailLogin(): Promise<void> {
    this.errorMessage.set(null);

    try {
      await this.authService.signInWithGmail();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in. Please try again.';
      this.errorMessage.set(message);
    }
  }
}
