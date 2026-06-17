import { Injectable, inject } from '@angular/core';
import {
  Storage,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes
} from '@angular/fire/storage';
import { Observable, Subject, from, merge, of, switchMap } from 'rxjs';

import { DatePlan } from '../../models/date-plan.model';
import { AuthService } from './auth';
import { DatePlanPdfInput, DatePlanPdfService } from './date-plan-pdf';

export interface StoredDatePlanRecord {
  plan: DatePlan;
  pdfUrl: string;
  pdfPath: string;
  metaPath: string;
}

const BUCKET_ROOT = 'users';

@Injectable({
  providedIn: 'root'
})
export class DatePlanStorageService {
  private readonly storage = inject(Storage);
  private readonly authService = inject(AuthService);
  private readonly pdfService = inject(DatePlanPdfService);
  private readonly reload$ = new Subject<void>();

  readonly storedDatePlans$: Observable<StoredDatePlanRecord[]> = this.authService.user$.pipe(
    switchMap((user) => {
      if (!user) {
        return of<StoredDatePlanRecord[]>([]);
      }

      return merge(of(null), this.reload$).pipe(
        switchMap(() => from(this.listUserDatePlans(user.uid)))
      );
    })
  );

  refresh(): void {
    this.reload$.next();
  }

  async uploadPlanPdf(
    planId: string,
    input: DatePlanPdfInput
  ): Promise<{ pdfUrl: string; pdfPath: string }> {
    const user = this.authService.currentUser;
    if (!user) {
      throw new Error('You must be logged in to upload a date plan PDF.');
    }

    const dateTime = input.dateTime instanceof Date ? input.dateTime : new Date(input.dateTime);
    if (Number.isNaN(dateTime.getTime())) {
      throw new Error('Please select a valid date and time.');
    }

    const pdfPath = this.pdfPath(user.uid, planId);
    const pdfBlob = this.pdfService.buildPdfBlob({ ...input, id: planId, dateTime });

    await uploadBytes(ref(this.storage, pdfPath), pdfBlob, {
      contentType: 'application/pdf',
      customMetadata: {
        planId,
        title: input.title?.trim() || 'Untitled date plan'
      }
    });

    const pdfUrl = await getDownloadURL(ref(this.storage, pdfPath));
    return { pdfUrl, pdfPath };
  }

  async listUserDatePlans(uid: string): Promise<StoredDatePlanRecord[]> {
    const folderRef = ref(this.storage, `${BUCKET_ROOT}/${uid}/date-plans`);

    let listing;
    try {
      listing = await listAll(folderRef);
    } catch {
      return [];
    }

    const metaFiles = listing.items.filter((item) => item.name.endsWith('.meta.json'));

    const records = await Promise.all(
      metaFiles.map(async (metaRef) => {
        try {
          const metaUrl = await getDownloadURL(metaRef);
          const response = await fetch(metaUrl);
          if (!response.ok) {
            return null;
          }

          const plan = (await response.json()) as DatePlan;
          plan.dateTime = new Date(plan.dateTime);
          const pdfPath = this.pdfPath(uid, plan.id);
          const pdfUrl = await getDownloadURL(ref(this.storage, pdfPath));

          return {
            plan,
            pdfUrl,
            pdfPath,
            metaPath: this.metaPath(uid, plan.id)
          } satisfies StoredDatePlanRecord;
        } catch {
          return null;
        }
      })
    );

    return records
      .filter((record): record is StoredDatePlanRecord => record !== null)
      .filter((record) => record.plan.dateTime.getTime() >= Date.now())
      .sort((left, right) => left.plan.dateTime.getTime() - right.plan.dateTime.getTime());
  }

  createPlanId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private pdfPath(uid: string, planId: string): string {
    return `${BUCKET_ROOT}/${uid}/date-plans/${planId}.pdf`;
  }

  private metaPath(uid: string, planId: string): string {
    return `${BUCKET_ROOT}/${uid}/date-plans/${planId}.meta.json`;
  }
}
