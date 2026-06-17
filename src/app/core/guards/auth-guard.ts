import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, take } from 'rxjs/operators';

import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }

      if (!authService.isGmailAccount(user)) {
        void authService.signOut();
        return router.createUrlTree(['/login']);
      }

      return true;
    })
  );
};
