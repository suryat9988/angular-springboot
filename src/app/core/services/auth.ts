import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, GoogleAuthProvider, authState, signInWithPopup, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { User, getRedirectResult, signInWithRedirect } from 'firebase/auth';

import {
  getFirebaseAuthErrorMessage,
  isFirebaseConfigured
} from '../config/firebase-config';
import { environment } from '../../../environments/environment';

const GMAIL_REQUIRED_MESSAGE = 'Please sign in with a Gmail account (@gmail.com).';
const FIREBASE_NOT_CONFIGURED_MESSAGE =
  'Firebase is not configured yet. Follow the setup steps shown below, then try again.';

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

  readonly isFirebaseReady = computed(() => isFirebaseConfigured(environment.firebaseConfig));

  constructor() {
    void this.completeRedirectSignIn();
  }

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  isGmailAccount(user: User | null): boolean {
    return user?.email?.toLowerCase().endsWith('@gmail.com') ?? false;
  }

  async signInWithGmail(): Promise<void> {
    if (this.busy()) {
      return;
    }

    if (!this.isFirebaseReady()) {
      throw new Error(FIREBASE_NOT_CONFIGURED_MESSAGE);
    }

    this.busy.set(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const credential = await signInWithPopup(this.auth, provider);
      await this.ensureGmailAccount(credential.user);
      await this.router.navigateByUrl('/welcome');
    } catch (error) {
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/popup-blocked') {
        await signInWithRedirect(this.auth, provider);
        return;
      }

      if (firebaseError.code === 'auth/popup-closed-by-user') {
        return;
      }

      throw new Error(getFirebaseAuthErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async completeRedirectSignIn(): Promise<void> {
    try {
      const credential = await getRedirectResult(this.auth);
      if (!credential?.user) {
        return;
      }

      await this.ensureGmailAccount(credential.user);
      await this.router.navigateByUrl('/welcome');
    } catch (error) {
      if (error instanceof Error && error.message === GMAIL_REQUIRED_MESSAGE) {
        await this.router.navigateByUrl('/login');
      }
    }
  }

  private async ensureGmailAccount(user: User): Promise<void> {
    if (this.isGmailAccount(user)) {
      return;
    }

    await signOut(this.auth);
    throw new Error(GMAIL_REQUIRED_MESSAGE);
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
