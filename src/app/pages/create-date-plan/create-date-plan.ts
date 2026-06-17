import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs/operators';

import {
  TIME_OPTIONS,
  cityOrZipcodeValidator,
  resolveDateTimeForSave,
  splitDateTimeLocal
} from '../../core/validators/location-date.validators';
import { AiChatService } from '../../core/services/ai-chat';
import { DatePlanService } from '../../core/services/date-plan';
import { LuckyDiscountService } from '../../core/services/lucky-discount';
import { PartnerRelationshipService } from '../../core/services/partner-relationship';
import { RewardsProgramService } from '../../core/services/rewards-program';
import { DatePlanFormPatch } from '../../models/date-plan-form-patch.model';
import { DatePlan } from '../../models/date-plan.model';
import {
  PartnerRelationship,
  RELATIONSHIP_FORM_CONFIG,
  RELATIONSHIP_OPTIONS,
  RewardsRedemptionType
} from '../../models/partner-relationship.model';
import { AiChatPanel } from '../../shared/components/ai-chat-panel/ai-chat-panel';
import { AppIcon } from '../../shared/components/app-icon/app-icon';

export interface DatePlanEditorDialogData {
  plan: DatePlan;
}

interface DatePlanFormValue {
  relationshipType: PartnerRelationship;
  title: string;
  description: string;
  date: Date | null;
  time: string;
  location: string;
  partnerName: string;
  budget: number | null;
  rewardsRedemptionType: RewardsRedemptionType | null;
  notes: string;
}

@Component({
  selector: 'app-create-date-plan',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    AppIcon,
    AiChatPanel
  ],
  templateUrl: './create-date-plan.html',
  styleUrl: './create-date-plan.scss'
})
export class CreateDatePlan implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly datePlanService = inject(DatePlanService);
  private readonly luckyDiscountService = inject(LuckyDiscountService);
  private readonly partnerRelationshipService = inject(PartnerRelationshipService);
  private readonly rewardsProgramService = inject(RewardsProgramService);
  private readonly aiChatService = inject(AiChatService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly dialogRef = inject(MatDialogRef<CreateDatePlan>, { optional: true });
  private readonly dialogData = inject<DatePlanEditorDialogData>(MAT_DIALOG_DATA, { optional: true });

  private readonly submitting = signal(false);
  private lastAppliedPatchKey = '';
  private initialRelationship = this.partnerRelationshipService.relationship();

  readonly editingPlan = signal<DatePlan | null>(null);
  readonly isDialogMode = signal(Boolean(this.dialogData));
  readonly isEditMode = computed(() => this.editingPlan() !== null);
  readonly pageTitle = computed(() => (this.isEditMode() ? 'Edit Date Plan' : 'Create Date Plan'));
  readonly saveLabel = computed(() => (this.isEditMode() ? 'Save changes' : 'Save date plan'));

  readonly timeOptions = TIME_OPTIONS;
  readonly relationshipOptions = RELATIONSHIP_OPTIONS;
  readonly redemptionOptions = this.rewardsProgramService.redemptionOptions;
  readonly isSubmitting = this.submitting.asReadonly();
  readonly formUpdatedByAi = signal(false);
  readonly relationship = this.partnerRelationshipService.relationship;
  readonly formConfig = this.partnerRelationshipService.formConfig;
  readonly luckyDiscountPercent = this.luckyDiscountService.luckyDiscountPercent;
  readonly availableRewardsPoints = this.rewardsProgramService.availablePoints;
  readonly rewardsValue = this.rewardsProgramService.pointsValue;
  readonly minDate = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  })();

  readonly datePlanForm = this.formBuilder.group({
    relationshipType: this.formBuilder.nonNullable.control<PartnerRelationship>(
      this.partnerRelationshipService.relationship()
    ),
    title: this.formBuilder.nonNullable.control('', Validators.maxLength(80)),
    description: this.formBuilder.nonNullable.control('', Validators.maxLength(500)),
    date: this.formBuilder.control<Date | null>(null),
    time: this.formBuilder.nonNullable.control(''),
    location: this.formBuilder.nonNullable.control('', [
      Validators.maxLength(120),
      cityOrZipcodeValidator
    ]),
    partnerName: this.formBuilder.nonNullable.control('', Validators.maxLength(80)),
    budget: this.formBuilder.control<number | null>(null, Validators.min(0)),
    rewardsRedemptionType: this.formBuilder.control<RewardsRedemptionType | null>(null),
    notes: this.formBuilder.nonNullable.control('', Validators.maxLength(500))
  });

  private readonly formSnapshot = toSignal(
    this.datePlanForm.valueChanges.pipe(startWith(this.datePlanForm.getRawValue())),
    { initialValue: this.datePlanForm.getRawValue() as DatePlanFormValue }
  );

  readonly canSave = computed(() => {
    const formValue = this.formSnapshot() as DatePlanFormValue;
    const locationInvalid = this.datePlanForm.controls.location.invalid;

    if (this.isEditMode()) {
      return !locationInvalid;
    }

    return this.hasAtLeastOneField(formValue) && !locationInvalid;
  });

  readonly billBreakdown = computed(() => {
    const budget = this.datePlanForm.controls.budget.value ?? 0;
    return this.luckyDiscountService.calculateSavings(budget);
  });

  constructor() {
    effect(() => {
      if (this.isEditMode()) {
        return;
      }

      const patch = this.aiChatService.lastFormPatch();
      if (!patch) {
        return;
      }

      const patchKey = JSON.stringify(patch);
      if (patchKey === this.lastAppliedPatchKey) {
        return;
      }

      this.applyFormPatch(patch);
      this.lastAppliedPatchKey = patchKey;
      this.formUpdatedByAi.set(true);
    });
  }

  ngOnInit(): void {
    if (this.dialogData?.plan) {
      this.loadPlanForEdit(this.dialogData.plan);
      return;
    }

    const planId = this.route?.snapshot.paramMap.get('planId');
    if (planId) {
      void this.loadPlanForEditById(planId);
      return;
    }

    this.datePlanForm.controls.relationshipType.setValue(this.partnerRelationshipService.relationship());
    this.applyRelationshipRules(this.partnerRelationshipService.relationship());

    const fromWelcome =
      typeof history !== 'undefined' && (history.state as { fromWelcome?: boolean })?.fromWelcome === true;
    const welcomePatch = fromWelcome ? this.aiChatService.lastFormPatch() : null;
    if (welcomePatch) {
      this.applyFormPatch(welcomePatch);
      this.lastAppliedPatchKey = JSON.stringify(welcomePatch);
      this.formUpdatedByAi.set(true);
      return;
    }

    this.aiChatService.startPlanningSession();
  }

  protected cancelEdit(): void {
    if (this.dialogRef) {
      this.dialogRef.close(false);
      return;
    }

    void this.router.navigateByUrl('/upcoming-dates');
  }

  protected onRelationshipChange(relationship: PartnerRelationship): void {
    this.partnerRelationshipService.setRelationship(relationship);
    this.applyRelationshipRules(relationship);
  }

  protected canRedeemOption(pointsCost: number): boolean {
    return this.rewardsProgramService.canRedeem(pointsCost);
  }

  protected async createDatePlan(): Promise<void> {
    if (!this.canSave() || this.submitting()) {
      this.datePlanForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      const formValue = this.datePlanForm.getRawValue();
      const dateTime = resolveDateTimeForSave(formValue.date, formValue.time);
      const config = this.formConfig();
      const editingPlan = this.editingPlan();
      const luckyDiscountPercent = editingPlan
        ? (editingPlan.luckyDiscountPercent ?? 0)
        : config.usesLuckyDiscount
          ? this.luckyDiscountPercent()
          : 0;
      const luckyNote =
        !editingPlan && luckyDiscountPercent > 0
          ? `Lucky discount applied: ${luckyDiscountPercent}% off your portion of the bill.`
          : '';

      let rewardsRedemption = editingPlan?.rewardsRedemption ?? null;
      let rewardsNote = '';
      if (config.usesRewardsProgram && formValue.rewardsRedemptionType) {
        const existingType = editingPlan?.rewardsRedemption?.type ?? null;
        const isNewRedemption = formValue.rewardsRedemptionType !== existingType;

        if (!editingPlan || isNewRedemption) {
          const redeemed = this.rewardsProgramService.redeem(formValue.rewardsRedemptionType);
          if (!redeemed) {
            this.snackBar.open('Not enough rewards points for that redemption.', 'Dismiss', {
              duration: 4000
            });
            this.submitting.set(false);
            return;
          }

          rewardsRedemption = {
            type: redeemed.type,
            points: redeemed.points,
            value: redeemed.value,
            label: redeemed.label
          };
          rewardsNote = `Rewards redeemed: ${redeemed.label} (${redeemed.points} points).`;
        }
      }

      const mergedNotes = editingPlan
        ? [rewardsNote, formValue.notes.trim()].filter(Boolean).join('\n\n') || undefined
        : [rewardsNote, luckyNote, formValue.notes.trim()].filter(Boolean).join('\n\n') || undefined;

      const payload = {
        title: formValue.title.trim() || undefined,
        description: formValue.description.trim() || undefined,
        dateTime,
        location: formValue.location.trim() || undefined,
        relationshipType: formValue.relationshipType,
        partnerName: formValue.partnerName.trim() || undefined,
        budget: config.showBudget ? formValue.budget : null,
        notes: mergedNotes,
        luckyDiscountPercent: luckyDiscountPercent > 0 ? luckyDiscountPercent : null,
        rewardsRedemption
      };

      if (editingPlan) {
        await this.datePlanService.updateDatePlan(editingPlan.id, payload);
        this.snackBar.open('Date plan updated!', 'Dismiss', { duration: 3000 });
        this.finishAfterSave();
        return;
      }

      await this.datePlanService.createDatePlan(payload);

      this.snackBar.open('Date plan saved!', 'Dismiss', { duration: 3000 });
      this.finishAfterSave();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : editingPlanMessage(this.editingPlan());
      this.snackBar.open(message, 'Dismiss', {
        duration: 5000
      });
    } finally {
      this.submitting.set(false);
    }
  }

  private finishAfterSave(): void {
    if (this.dialogRef) {
      this.dialogRef.close(true);
      return;
    }

    void this.router.navigateByUrl('/upcoming-dates');
    if (!this.isEditMode()) {
      this.resetForm();
    }
  }

  private async loadPlanForEditById(planId: string): Promise<void> {
    const plan = await this.datePlanService.getDatePlan(planId);
    if (!plan) {
      this.snackBar.open('Date plan not found.', 'Dismiss', { duration: 4000 });
      void this.router.navigateByUrl('/upcoming-dates');
      return;
    }

    this.loadPlanForEdit(plan);
  }

  private loadPlanForEdit(plan: DatePlan): void {
    this.editingPlan.set(plan);

    const relationship = plan.relationshipType ?? this.partnerRelationshipService.relationship();
    this.initialRelationship = relationship;
    this.partnerRelationshipService.setRelationship(relationship);

    const planDate = new Date(plan.dateTime);
    const dateOnly = new Date(planDate);
    dateOnly.setHours(0, 0, 0, 0);
    const resolvedTime = this.nearestTimeOption(
      `${String(planDate.getHours()).padStart(2, '0')}:${String(planDate.getMinutes()).padStart(2, '0')}`
    );

    this.datePlanForm.reset({
      relationshipType: relationship,
      title: plan.title === 'Untitled date plan' ? '' : plan.title,
      description: plan.description === 'No description yet.' ? '' : plan.description,
      date: dateOnly,
      time: resolvedTime,
      location: plan.location === 'TBD' ? '' : plan.location,
      partnerName: plan.partnerName ?? '',
      budget: plan.budget ?? null,
      rewardsRedemptionType: plan.rewardsRedemption?.type ?? null,
      notes: plan.notes ?? ''
    });
    this.applyRelationshipRules(relationship);
    this.formUpdatedByAi.set(false);
    this.lastAppliedPatchKey = '';
  }

  private hasAtLeastOneField(formValue: DatePlanFormValue): boolean {
    return Boolean(
      formValue.relationshipType !== this.initialRelationship ||
        formValue.title.trim() ||
        formValue.description.trim() ||
        formValue.date ||
        formValue.time ||
        formValue.location.trim() ||
        formValue.partnerName.trim() ||
        (formValue.budget != null && formValue.budget > 0) ||
        formValue.rewardsRedemptionType ||
        formValue.notes.trim()
    );
  }

  private resetForm(): void {
    this.datePlanForm.reset({
      relationshipType: this.partnerRelationshipService.relationship(),
      title: '',
      description: '',
      date: null,
      time: '',
      location: '',
      partnerName: '',
      budget: null,
      rewardsRedemptionType: null,
      notes: ''
    });
    this.applyRelationshipRules(this.partnerRelationshipService.relationship());
    this.initialRelationship = this.partnerRelationshipService.relationship();
    this.formUpdatedByAi.set(false);
    this.lastAppliedPatchKey = '';
    this.aiChatService.startPlanningSession();
  }

  private applyRelationshipRules(relationship: PartnerRelationship): void {
    const fieldConfig = RELATIONSHIP_FORM_CONFIG[relationship];
    const budgetControl = this.datePlanForm.controls.budget;
    const redemptionControl = this.datePlanForm.controls.rewardsRedemptionType;

    if (fieldConfig.showBudget) {
      budgetControl.enable({ emitEvent: false });
    } else {
      budgetControl.setValue(null, { emitEvent: false });
      budgetControl.disable({ emitEvent: false });
    }

    if (fieldConfig.usesRewardsProgram) {
      redemptionControl.enable({ emitEvent: false });
    } else {
      redemptionControl.setValue(null, { emitEvent: false });
      redemptionControl.disable({ emitEvent: false });
    }
  }

  private applyFormPatch(patch: DatePlanFormPatch): void {
    if (patch.relationshipType) {
      this.datePlanForm.controls.relationshipType.setValue(patch.relationshipType);
      this.partnerRelationshipService.setRelationship(patch.relationshipType);
      this.applyRelationshipRules(patch.relationshipType);
    }

    const dateTimePatch = patch.dateTime ? splitDateTimeLocal(patch.dateTime) : null;

    this.datePlanForm.patchValue({
      ...(patch.title ? { title: patch.title } : {}),
      ...(patch.description ? { description: patch.description } : {}),
      ...(dateTimePatch?.date ? { date: dateTimePatch.date } : {}),
      ...(dateTimePatch?.time ? { time: this.nearestTimeOption(dateTimePatch.time) } : {}),
      ...(patch.location ? { location: this.normalizeLocation(patch.location) } : {}),
      ...(patch.partnerName ? { partnerName: patch.partnerName } : {}),
      ...(patch.budget != null && this.formConfig().showBudget ? { budget: patch.budget } : {}),
      ...(patch.notes ? { notes: patch.notes } : {})
    });
    this.datePlanForm.markAsDirty();
  }

  private nearestTimeOption(time: string): string {
    if (TIME_OPTIONS.some((option) => option.value === time)) {
      return time;
    }

    const [hours, minutes] = time.split(':').map((part) => Number(part));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return '';
    }

    const totalMinutes = hours * 60 + minutes;
    const nearest = TIME_OPTIONS.reduce((best, option) => {
      const [optionHours, optionMinutes] = option.value.split(':').map((part) => Number(part));
      const optionTotal = optionHours * 60 + optionMinutes;
      const bestTotal = best.value.split(':').map((part) => Number(part));
      const bestMinutes = bestTotal[0] * 60 + bestTotal[1];
      return Math.abs(optionTotal - totalMinutes) < Math.abs(bestMinutes - totalMinutes)
        ? option
        : best;
    }, TIME_OPTIONS[0]);

    return nearest.value;
  }

  private normalizeLocation(value: string): string {
    const trimmed = value.trim();
    const zipMatch = trimmed.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (zipMatch) {
      return zipMatch[1];
    }

    const cityMatch = trimmed.match(/\b([A-Za-z][A-Za-z\s.'-]{1,58})/);
    return cityMatch?.[1]?.trim() ?? trimmed.slice(0, 120);
  }
}

function editingPlanMessage(editingPlan: DatePlan | null): string {
  return editingPlan
    ? 'Could not update date plan. Please try again.'
    : 'Could not create date plan. Please try again.';
}
