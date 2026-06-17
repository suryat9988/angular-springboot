import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs/operators';

import { AuthService } from './core/services/auth';
import { MessagingService } from './core/services/messaging';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatListModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly authService = inject(AuthService);
  private readonly messagingService = inject(MessagingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 768px)').pipe(map((state) => state.matches)),
    { initialValue: false }
  );
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly displayName = this.authService.displayName;

  constructor() {
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (!user) {
        return;
      }

      void this.messagingService.requestPermissionAndStoreToken(user);
    });
  }

  protected closeDrawerOnMobile(drawer: MatSidenav): void {
    if (this.isMobile()) {
      void drawer.close();
    }
  }

  protected async onSignOut(): Promise<void> {
    await this.authService.signOut();
  }
}
