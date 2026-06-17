import { Injectable, inject, signal } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { Firestore, doc, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User } from 'firebase/auth';
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';

import { environment } from '../../../environments/environment';

interface NotificationPreview {
  title: string;
  body: string;
  receivedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private readonly firebaseApp = inject(FirebaseApp);
  private readonly firestore = inject(Firestore);
  private readonly snackBar = inject(MatSnackBar);

  private readonly notificationItems = signal<NotificationPreview[]>([]);
  private initializedUid: string | null = null;
  private messaging: Messaging | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private foregroundListenerAttached = false;

  readonly notifications = this.notificationItems.asReadonly();

  async requestPermissionAndStoreToken(user: User): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.initializedUid === user.uid) {
      return;
    }

    const supported = await isSupported();
    if (!supported) {
      return;
    }

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    this.messaging ??= getMessaging(this.firebaseApp);
    const registration = await this.ensureServiceWorker();
    const token = await getToken(this.messaging, {
      vapidKey: environment.vapidKey,
      serviceWorkerRegistration: registration ?? undefined
    });

    if (!token) {
      return;
    }

    await this.persistToken(user.uid, token);
    this.listenForForegroundMessages();
    this.initializedUid = user.uid;
  }

  private async ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    if (this.serviceWorkerRegistration) {
      return this.serviceWorkerRegistration;
    }

    this.serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    return this.serviceWorkerRegistration;
  }

  private listenForForegroundMessages(): void {
    if (!this.messaging || this.foregroundListenerAttached) {
      return;
    }

    onMessage(this.messaging, (payload) => {
      const title = payload.notification?.title ?? 'BowerBox reminder';
      const body = payload.notification?.body ?? 'You have an upcoming date planned.';

      this.notificationItems.update((items) => [
        {
          title,
          body,
          receivedAt: new Date().toISOString()
        },
        ...items
      ]);

      this.snackBar.open(`${title}: ${body}`, 'Dismiss', { duration: 7000 });
    });

    this.foregroundListenerAttached = true;
  }

  private async persistToken(uid: string, token: string): Promise<void> {
    const tokenRef = doc(this.firestore, `users/${uid}/fcmTokens/${token}`);
    await setDoc(
      tokenRef,
      {
        token,
        uid,
        userAgent: navigator.userAgent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }
}
