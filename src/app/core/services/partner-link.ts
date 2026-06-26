import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { UserProfile } from '../../models/partner-chat.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class PartnerLinkService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  readonly profile$: Observable<UserProfile | null> = this.authService.user$.pipe(
    switchMap((user) => {
      if (!user) {
        return of(null);
      }

      const profileRef = doc(this.firestore, `users/${user.uid}/profile/data`);
      return (docData(profileRef) as Observable<Record<string, unknown> | undefined>).pipe(
        map((record) => (record ? mapProfile(user.uid, record) : null))
      );
    })
  );

  async ensureProfile(): Promise<UserProfile> {
    const user = this.authService.currentUser;
    if (!user) {
      throw new Error('You must be logged in.');
    }

    const profileRef = doc(this.firestore, `users/${user.uid}/profile/data`);
    const snapshot = await getDoc(profileRef);

    if (snapshot.exists()) {
      return mapProfile(user.uid, snapshot.data());
    }

    const inviteCode = await this.createUniqueInviteCode();
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'BowerBird',
      inviteCode,
      partnerUid: null,
      coupleId: null,
      partnerDisplayName: null
    };

    const batch = writeBatch(this.firestore);
    batch.set(profileRef, {
      email: profile.email,
      displayName: profile.displayName,
      inviteCode: profile.inviteCode,
      partnerUid: null,
      coupleId: null,
      partnerDisplayName: null,
      updatedAt: serverTimestamp()
    });
    batch.set(doc(this.firestore, `inviteCodes/${profile.inviteCode}`), {
      uid: user.uid,
      displayName: profile.displayName,
      email: profile.email,
      createdAt: serverTimestamp()
    });
    await batch.commit();

    return profile;
  }

  async connectWithInviteCode(rawCode: string): Promise<UserProfile> {
    const user = this.authService.currentUser;
    if (!user) {
      throw new Error('You must be logged in.');
    }

    const code = rawCode.trim().toUpperCase();
    if (!code) {
      throw new Error('Enter your partner’s invite code.');
    }

    const currentProfile = await this.ensureProfile();
    if (currentProfile.coupleId && currentProfile.partnerUid) {
      throw new Error('You are already connected to a partner.');
    }

    const inviteRef = doc(this.firestore, `inviteCodes/${code}`);
    const inviteSnapshot = await getDoc(inviteRef);
    if (!inviteSnapshot.exists()) {
      throw new Error('Invite code not found. Double-check the code and try again.');
    }

    const invite = inviteSnapshot.data() as { uid: string; displayName?: string };
    const partnerUid = invite.uid;
    if (partnerUid === user.uid) {
      throw new Error('You cannot connect with your own invite code.');
    }

    const partnerProfileRef = doc(this.firestore, `users/${partnerUid}/profile/data`);
    const partnerSnapshot = await getDoc(partnerProfileRef);
    if (!partnerSnapshot.exists()) {
      throw new Error('That partner has not opened BowerBox yet. Ask them to sign in first.');
    }

    const partnerProfile = mapProfile(partnerUid, partnerSnapshot.data());
    if (partnerProfile.partnerUid && partnerProfile.partnerUid !== user.uid) {
      throw new Error('That partner is already connected to someone else.');
    }

    const coupleId = buildCoupleId(user.uid, partnerUid);
    const coupleRef = doc(this.firestore, `couples/${coupleId}`);
    const currentName = currentProfile.displayName;
    const partnerName = partnerProfile.displayName;

    const batch = writeBatch(this.firestore);
    batch.set(
      coupleRef,
      {
        memberUids: [user.uid, partnerUid],
        memberNames: {
          [user.uid]: currentName,
          [partnerUid]: partnerName
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    batch.set(
      doc(this.firestore, `users/${user.uid}/profile/data`),
      {
        partnerUid,
        coupleId,
        partnerDisplayName: partnerName,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    batch.set(
      partnerProfileRef,
      {
        partnerUid: user.uid,
        coupleId,
        partnerDisplayName: currentName,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    await batch.commit();

    return {
      ...currentProfile,
      partnerUid,
      coupleId,
      partnerDisplayName: partnerName
    };
  }

  async disconnectPartner(): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) {
      throw new Error('You must be logged in.');
    }

    const profileRef = doc(this.firestore, `users/${user.uid}/profile/data`);
    const snapshot = await getDoc(profileRef);
    if (!snapshot.exists()) {
      return;
    }

    const profile = mapProfile(user.uid, snapshot.data());
    if (!profile.partnerUid) {
      return;
    }

    const partnerProfileRef = doc(this.firestore, `users/${profile.partnerUid}/profile/data`);
    const batch = writeBatch(this.firestore);

    batch.update(profileRef, {
      partnerUid: null,
      coupleId: null,
      partnerDisplayName: null,
      updatedAt: serverTimestamp()
    });

    batch.set(
      partnerProfileRef,
      {
        partnerUid: null,
        coupleId: null,
        partnerDisplayName: null,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    await batch.commit();
  }

  private async createUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateInviteCode();
      const inviteRef = doc(this.firestore, `inviteCodes/${code}`);
      const snapshot = await getDoc(inviteRef);
      if (!snapshot.exists()) {
        return code;
      }
    }

    throw new Error('Could not generate an invite code. Please try again.');
  }
}

export function buildCoupleId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 6; index++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function mapProfile(uid: string, record: Record<string, unknown>): UserProfile {
  return {
    uid,
    email: readString(record, 'email'),
    displayName: readString(record, 'displayName', 'BowerBird'),
    inviteCode: readString(record, 'inviteCode'),
    partnerUid: readOptionalString(record, 'partnerUid'),
    coupleId: readOptionalString(record, 'coupleId'),
    partnerDisplayName: readOptionalString(record, 'partnerDisplayName')
  };
}

function readString(record: Record<string, unknown>, key: string, fallback = ''): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function readOptionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
