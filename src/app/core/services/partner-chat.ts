import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  limit,
  orderBy,
  query,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { PartnerMessage } from '../../models/partner-chat.model';
import { AuthService } from './auth';
import { PartnerLinkService } from './partner-link';

@Injectable({
  providedIn: 'root'
})
export class PartnerChatService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly partnerLinkService = inject(PartnerLinkService);

  readonly messages$: Observable<PartnerMessage[]> = this.partnerLinkService.profile$.pipe(
    switchMap((profile) => {
      if (!profile?.coupleId) {
        return of<PartnerMessage[]>([]);
      }

      const messagesCollection = collection(
        this.firestore,
        `couples/${profile.coupleId}/messages`
      );
      const messagesQuery = query(messagesCollection, orderBy('createdAt', 'asc'), limit(200));

      return (collectionData(messagesQuery, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
        map((records) => records.map((record) => mapMessage(record)))
      );
    })
  );

  async sendMessage(text: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) {
      throw new Error('You must be logged in to send messages.');
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const profile = await this.partnerLinkService.ensureProfile();
    if (!profile.coupleId) {
      throw new Error('Connect with your partner before sending messages.');
    }

    const messagesCollection = collection(
      this.firestore,
      `couples/${profile.coupleId}/messages`
    );

    await addDoc(messagesCollection, {
      senderUid: user.uid,
      senderName: user.displayName ?? user.email?.split('@')[0] ?? 'Partner',
      text: trimmed.slice(0, 1000),
      createdAt: serverTimestamp()
    });
  }
}

function mapMessage(record: Record<string, unknown>): PartnerMessage {
  return {
    id: readString(record, 'id', 'unknown'),
    senderUid: readString(record, 'senderUid'),
    senderName: readString(record, 'senderName', 'Partner'),
    text: readString(record, 'text'),
    createdAt: readDate(record, 'createdAt')
  };
}

function readString(record: Record<string, unknown>, key: string, fallback = ''): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function readDate(record: Record<string, unknown>, key: string): Date {
  const value = record[key];
  if (value && typeof value === 'object' && 'toDate' in value) {
    const maybeTimestamp = value as { toDate: () => Date };
    return maybeTimestamp.toDate();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}
