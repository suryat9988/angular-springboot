import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DatePlanService } from '../../core/services/date-plan';

@Component({
  selector: 'app-create-date-plan',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './create-date-plan.html',
  styleUrl: './create-date-plan.scss'
})
export class CreateDatePlan {
  private readonly formBuilder = inject(FormBuilder);
  private readonly datePlanService = inject(DatePlanService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly submitting = signal(false);

  readonly isSubmitting = this.submitting.asReadonly();
  readonly datePlanForm = this.formBuilder.group({
    title: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(80)
    ]),
    description: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(500)
    ]),
    dateTime: this.formBuilder.nonNullable.control('', Validators.required),
    location: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(120)
    ]),
    partnerName: this.formBuilder.nonNullable.control('', Validators.maxLength(80)),
    budget: this.formBuilder.control<number | null>(null, Validators.min(0)),
    notes: this.formBuilder.nonNullable.control('', Validators.maxLength(500))
  });

  protected async createDatePlan(): Promise<void> {
    if (this.datePlanForm.invalid || this.submitting()) {
      this.datePlanForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      const formValue = this.datePlanForm.getRawValue();
      await this.datePlanService.createDatePlan({
        title: formValue.title,
        description: formValue.description,
        dateTime: formValue.dateTime,
        location: formValue.location,
        partnerName: formValue.partnerName,
        budget: formValue.budget,
        notes: formValue.notes
      });

      this.snackBar.open('Date plan created successfully.', 'Dismiss', {
        duration: 4000
      });
      this.datePlanForm.reset({
        title: '',
        description: '',
        dateTime: '',
        location: '',
        partnerName: '',
        budget: null,
        notes: ''
      });
    } catch (error) {
      console.error(error);
      this.snackBar.open('Could not create date plan. Please try again.', 'Dismiss', {
        duration: 5000
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
