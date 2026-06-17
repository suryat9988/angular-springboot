import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  getDoc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { CreateDatePlanRequest, DatePlan } from '../../models/date-plan.model';
import { AuthService } from './auth';
import { DatePlanStorageService, StoredDatePlanRecord } from './date-plan-storage';

@Injectable({
  providedIn: 'root'
})
export class DatePlanService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly storageService = inject(DatePlanStorageService);

  readonly upcomingDatePlans$: Observable<DatePlan[]> = this.authService.user$.pipe(
    switchMap((user) => {
      if (!user) {
        return of<DatePlan[]>([]);
      }

      const plansCollection = collection(this.firestore, `users/${user.uid}/datePlans`);
      const upcomingQuery = query(plansCollection, orderBy('dateTime', 'asc'), limit(50));

      return (collectionData(upcomingQuery, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
        map((records) =>
          records
            .map((record) => mapToDatePlan(user.uid, record))
            .filter((plan) => plan.dateTime.getTime() >= Date.now())
        )
      );
    })
  );

  readonly storedDatePlans$: Observable<StoredDatePlanRecord[]> = this.upcomingDatePlans$.pipe(
    map((plans) =>
      plans.map((plan) => ({
        plan,
        pdfUrl: plan.pdfUrl ?? '',
        pdfPath: plan.pdfStoragePath ?? '',
        metaPath: ''
      }))
    )
  );

  async createDatePlan(request: CreateDatePlanRequest): Promise<string> {
    const user = this.authService.currentUser;
    if (!user) {
      throw new Error('You must be logged in to create a date plan.');
    }

    const selectedDate = new Date(request.dateTime);
    if (Number.isNaN(selectedDate.getTime())) {
      throw new Error('Please select a valid date and time.');
    }

    const plansCollection = collection(this.firestore, `users/${user.uid}/datePlans`);
    const docRef = await addDoc(plansCollection, {
      title: request.title?.trim() || 'Untitled date plan',
      description: request.description?.trim() || 'No description yet.',
      dateTime: selectedDate,
      location: request.location?.trim() || 'TBD',
      relationshipType: request.relationshipType ?? 'dating',
      partnerName: request.partnerName?.trim() || null,
      budget: request.budget ?? null,
      notes: request.notes?.trim() || null,
      luckyDiscountPercent: request.luckyDiscountPercent ?? null,
      rewardsRedemption: request.rewardsRedemption ?? null,
      pdfUrl: null,
      pdfStoragePath: null,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    void this.uploadPlanPdfInBackground(docRef.id, request, selectedDate);

    return docRef.id;
  }

  async getDatePlan(planId: string): Promise<DatePlan | null> {
    const user = this.authService.currentUser;
    if (!user) {
      return null;
    }

    const planRef = doc(this.firestore, `users/${user.uid}/datePlans/${planId}`);
    const snapshot = await getDoc(planRef);
    if (!snapshot.exists()) {
      return null;
    }

    return mapToDatePlan(user.uid, { ...snapshot.data(), id: snapshot.id });
  }

  async updateDatePlan(planId: string, request: CreateDatePlanRequest): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) {
      throw new Error('You must be logged in to update a date plan.');
    }

    const selectedDate = new Date(request.dateTime);
    if (Number.isNaN(selectedDate.getTime())) {
      throw new Error('Please select a valid date and time.');
    }

    const planRef = doc(this.firestore, `users/${user.uid}/datePlans/${planId}`);
    await updateDoc(planRef, {
      title: request.title?.trim() || 'Untitled date plan',
      description: request.description?.trim() || 'No description yet.',
      dateTime: selectedDate,
      location: request.location?.trim() || 'TBD',
      relationshipType: request.relationshipType ?? 'dating',
      partnerName: request.partnerName?.trim() || null,
      budget: request.budget ?? null,
      notes: request.notes?.trim() || null,
      luckyDiscountPercent: request.luckyDiscountPercent ?? null,
      rewardsRedemption: request.rewardsRedemption ?? null,
      updatedAt: serverTimestamp()
    });

    void this.uploadPlanPdfInBackground(planId, request, selectedDate);
  }

  private async uploadPlanPdfInBackground(
    planId: string,
    request: CreateDatePlanRequest,
    selectedDate: Date
  ): Promise<void> {
    try {
      const stored = await this.storageService.uploadPlanPdf(planId, {
        id: planId,
        title: request.title ?? '',
        description: request.description ?? '',
        dateTime: selectedDate,
        location: request.location ?? '',
        relationshipType: request.relationshipType,
        partnerName: request.partnerName,
        budget: request.budget,
        notes: request.notes,
        luckyDiscountPercent: request.luckyDiscountPercent,
        rewardsRedemption: request.rewardsRedemption
      });

      const docRef = doc(this.firestore, `users/${this.authService.currentUser?.uid}/datePlans/${planId}`);
      await updateDoc(docRef, {
        pdfUrl: stored.pdfUrl,
        pdfStoragePath: stored.pdfPath,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('PDF upload to cloud storage failed; plan saved without PDF.', error);
    }
  }
}

function mapToDatePlan(createdBy: string, record: Record<string, unknown>): DatePlan {
  return {
    id: readString(record, 'id', 'unknown-id'),
    title: readString(record, 'title', 'Untitled date'),
    description: readString(record, 'description', ''),
    dateTime: readDate(record, 'dateTime'),
    location: readString(record, 'location', 'TBD'),
    relationshipType: readRelationshipType(record, 'relationshipType'),
    partnerName: readOptionalString(record, 'partnerName'),
    budget: readOptionalNumber(record, 'budget'),
    notes: readOptionalString(record, 'notes'),
    luckyDiscountPercent: readOptionalNumber(record, 'luckyDiscountPercent'),
    rewardsRedemption: readRewardsRedemption(record, 'rewardsRedemption'),
    pdfUrl: readOptionalString(record, 'pdfUrl'),
    pdfStoragePath: readOptionalString(record, 'pdfStoragePath'),
    createdBy: readString(record, 'createdBy', createdBy),
    createdAt: readOptionalDate(record, 'createdAt'),
    updatedAt: readOptionalDate(record, 'updatedAt')
  };
}

function readRelationshipType(
  record: Record<string, unknown>,
  key: string
): DatePlan['relationshipType'] {
  const value = record[key];
  return value === 'dating' || value === 'engaged' || value === 'married' ? value : 'dating';
}

function readRewardsRedemption(
  record: Record<string, unknown>,
  key: string
): DatePlan['rewardsRedemption'] {
  const value = record[key];
  if (!value || typeof value !== 'object') {
    return null;
  }

  const redemption = value as Record<string, unknown>;
  const type = redemption['type'];
  const points = redemption['points'];
  const rewardValue = redemption['value'];
  const label = redemption['label'];

  if (
    (type === 'cash' || type === 'dining' || type === 'experience') &&
    typeof points === 'number' &&
    typeof rewardValue === 'number' &&
    typeof label === 'string'
  ) {
    return { type, points, value: rewardValue, label };
  }

  return null;
}

function readString(record: Record<string, unknown>, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readOptionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

function readDate(record: Record<string, unknown>, key: string): Date {
  const value = record[key];
  if (isTimestampLike(value)) {
    return value.toDate();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function readOptionalDate(record: Record<string, unknown>, key: string): Date | undefined {
  const value = record[key];
  if (isTimestampLike(value)) {
    return value.toDate();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
}

function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeTimestamp = value as { toDate?: unknown };
  return typeof maybeTimestamp.toDate === 'function';
}
