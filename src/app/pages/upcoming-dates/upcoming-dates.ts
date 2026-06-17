import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { DatePlanService } from '../../core/services/date-plan';
import { DatePlan } from '../../models/date-plan.model';

@Component({
  selector: 'app-upcoming-dates',
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './upcoming-dates.html',
  styleUrl: './upcoming-dates.scss'
})
export class UpcomingDates {
  private readonly datePlanService = inject(DatePlanService);

  readonly upcomingDatePlans$ = this.datePlanService.upcomingDatePlans$;

  protected daysUntil(date: Date): number {
    const msInDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / msInDay));
  }

  protected countdownLabel(date: Date): string {
    const days = this.daysUntil(date);
    if (days === 0) {
      return 'Today';
    }

    if (days === 1) {
      return 'Tomorrow';
    }

    return `In ${days} days`;
  }

  protected trackById(_: number, datePlan: DatePlan): string {
    return datePlan.id;
  }
}
