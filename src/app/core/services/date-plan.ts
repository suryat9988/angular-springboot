import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { CreateDatePlanRequest, DatePlan } from '../../models/date-plan.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class DatePlanService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  readonly upcomingDatePlans$: Observable<DatePlan[]> = this.authService.user$.pipe(
    switchMap((user) => {
      if (!user) {
        return of<DatePlan[]>([]);
      }

      const plansCollection = collection(this.firestore, `users/${user.uid}/datePlans`);
      const upcomingQuery = query(
        plansCollection,
        where('dateTime', '>=', new Date()),
        orderBy('dateTime', 'asc'),
        limit(50)
      );

      return (collectionData(upcomingQuery, { idField: 'id' }) as Observable<Record<string, unknown>[]>).pipe(
        map((records) => records.map((record) => mapToDatePlan(user.uid, record)))
      );
    })
  );

  async createDatePlan(request: CreateDatePlanRequest): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) {
      throw new Error('You must be logged in to create a date plan.');
    }

    const selectedDate = new Date(request.dateTime);
    if (Number.isNaN(selectedDate.getTime())) {
      throw new Error('Please select a valid date and time.');
    }

    const plansCollection = collection(this.firestore, `users/${user.uid}/datePlans`);
    await addDoc(plansCollection, {
      title: request.title.trim(),
      description: request.description.trim(),
      dateTime: selectedDate,
      location: request.location.trim(),
      partnerName: request.partnerName?.trim() || null,
      budget: request.budget ?? null,
      notes: request.notes?.trim() || null,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

function mapToDatePlan(createdBy: string, record: Record<string, unknown>): DatePlan {
  return {
    id: readString(record, 'id', 'unknown-id'),
    title: readString(record, 'title', 'Untitled date'),
    description: readString(record, 'description', ''),
    dateTime: readDate(record, 'dateTime'),
    location: readString(record, 'location', 'TBD'),
    partnerName: readOptionalString(record, 'partnerName'),
    budget: readOptionalNumber(record, 'budget'),
    notes: readOptionalString(record, 'notes'),
    createdBy: readString(record, 'createdBy', createdBy),
    createdAt: readOptionalDate(record, 'createdAt'),
    updatedAt: readOptionalDate(record, 'updatedAt')
  };
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
