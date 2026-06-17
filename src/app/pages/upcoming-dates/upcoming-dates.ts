import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

import { DatePlanService } from '../../core/services/date-plan';
import { StoredDatePlanRecord } from '../../core/services/date-plan-storage';
import { PartnerRelationship } from '../../models/partner-relationship.model';
import {
  CreateDatePlan,
  DatePlanEditorDialogData
} from '../create-date-plan/create-date-plan';
import { AppIcon } from '../../shared/components/app-icon/app-icon';

@Component({
  selector: 'app-upcoming-dates',
  imports: [DatePipe, RouterLink, MatCardModule, MatButtonModule, MatDialogModule, AppIcon],
  templateUrl: './upcoming-dates.html',
  styleUrl: './upcoming-dates.scss'
})
export class UpcomingDates {
  private readonly datePlanService = inject(DatePlanService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialog = inject(MatDialog);

  readonly storedRecords = toSignal(this.datePlanService.storedDatePlans$, {
    initialValue: [] as StoredDatePlanRecord[]
  });
  readonly selectedPlanId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const records = this.storedRecords();
      const selectedId = this.selectedPlanId();

      if (records.length === 0) {
        if (selectedId) {
          this.selectedPlanId.set(null);
        }
        return;
      }

      const stillExists = selectedId && records.some((record) => record.plan.id === selectedId);
      if (!stillExists) {
        this.selectedPlanId.set(records[0].plan.id);
      }
    });
  }

  protected selectPlan(record: StoredDatePlanRecord): void {
    this.selectedPlanId.set(record.plan.id);
  }

  protected openEditDialog(record: StoredDatePlanRecord, event?: Event): void {
    event?.stopPropagation();

    this.dialog
      .open<CreateDatePlan, DatePlanEditorDialogData, boolean>(CreateDatePlan, {
        width: '760px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        autoFocus: 'first-tabbable',
        panelClass: 'date-plan-editor-dialog',
        data: { plan: record.plan }
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.selectedPlanId.set(record.plan.id);
        }
      });
  }

  protected isSelected(record: StoredDatePlanRecord): boolean {
    return this.selectedPlanId() === record.plan.id;
  }

  protected pdfViewerUrl(pdfUrl: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${pdfUrl}#toolbar=0&navpanes=0`);
  }

  protected selectedFromList(records: StoredDatePlanRecord[]): StoredDatePlanRecord | null {
    const selectedId = this.selectedPlanId();
    if (!selectedId) {
      return records[0] ?? null;
    }

    return records.find((record) => record.plan.id === selectedId) ?? records[0] ?? null;
  }

  protected countdownLabel(date: Date): string {
    const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    if (days === 0) {
      return 'Today';
    }

    if (days === 1) {
      return 'Tomorrow';
    }

    return `In ${days} days`;
  }

  protected trackById(_: number, record: StoredDatePlanRecord): string {
    return record.plan.id;
  }

  protected relationshipLabel(relationship?: PartnerRelationship): string {
    if (relationship === 'married') {
      return 'Married';
    }

    if (relationship === 'engaged') {
      return 'Engaged';
    }

    return 'Dating';
  }
}
