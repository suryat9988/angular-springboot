import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, GoogleAuthProvider, authState, signInWithPopup, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { User, signInWithRedirect } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly busy = signal(false);

  readonly user$ = authState(this.auth);
  readonly user = toSignal(this.user$, { initialValue: null });
  readonly isBusy = this.busy.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly displayName = computed(() => {
    const user = this.user();
    return user?.displayName ?? user?.email ?? 'BowerBird';
  });

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  async signInWithGoogle(): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(this.auth, provider);
      await this.router.navigateByUrl('/upcoming-dates');
    } catch (error) {
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/popup-blocked') {
        await signInWithRedirect(this.auth, provider);
        return;
      }

      throw error;
    } finally {
      this.busy.set(false);
    }
  }

  async signOut(): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    try {
      await signOut(this.auth);
      await this.router.navigateByUrl('/login');
    } finally {
      this.busy.set(false);
    }
  }
}
