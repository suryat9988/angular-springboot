import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

import { WelcomeJourneyService } from '../../../core/services/welcome-journey';
import { AiChatService } from '../../../core/services/ai-chat';
import { JourneyActivity, JourneyCar, JourneyStep } from '../../../models/welcome-journey.model';

interface Butterfly {
  id: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
  scale: number;
  hue: number;
}

@Component({
  selector: 'app-welcome-journey',
  imports: [MatButtonModule],
  templateUrl: './welcome-journey.html',
  styleUrl: './welcome-journey.scss'
})
export class WelcomeJourney implements OnInit, OnDestroy {
  private readonly journeyService = inject(WelcomeJourneyService);
  private readonly aiChatService = inject(AiChatService);
  private readonly router = inject(Router);

  private introTimer: ReturnType<typeof setTimeout> | null = null;
  private draggingSun = false;

  readonly step = signal<JourneyStep>('intro');
  readonly introPhase = signal<'butterflies' | 'zoom'>('butterflies');
  readonly butterflies = signal<Butterfly[]>(this.createButterflies());

  readonly selectedCar = this.journeyService.selectedCar;
  readonly sunPosition = this.journeyService.sunHeight;
  readonly phaseLabel = this.journeyService.phaseLabel;
  readonly moonScale = this.journeyService.moonScale;
  readonly skyGradient = this.journeyService.skyGradient;
  readonly selection = this.journeyService.selection;
  readonly pickedActivity = this.journeyService.pickedActivity;

  readonly sunLeft = computed(() => 12 + (this.sunPosition() / 100) * 76);
  readonly sunTop = computed(() => this.sunArcTop(this.sunPosition()));
  readonly moonLeft = computed(() => 100 - this.sunLeft());
  readonly moonTop = computed(() => Math.min(78, 88 - this.moonScale() * 18));

  readonly carSubtitle = computed(() =>
    this.selectedCar() === 'mustang'
      ? 'City dates within a 50-mile radius'
      : 'Adventures outside the city'
  );

  ngOnInit(): void {
    this.journeyService.reset();
    this.introTimer = setTimeout(() => {
      this.introPhase.set('zoom');
      this.introTimer = setTimeout(() => this.step.set('car'), 2800);
    }, 2200);
  }

  ngOnDestroy(): void {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
    }
  }

  protected selectCar(car: JourneyCar): void {
    this.journeyService.setCar(car);
    this.step.set('sun');
  }

  protected continueToActivities(): void {
    if (!this.selectedCar()) {
      return;
    }

    this.step.set('activities');
  }

  protected backToCar(): void {
    this.step.set('car');
  }

  protected backToSun(): void {
    this.step.set('sun');
  }

  protected onSkyPointerDown(event: PointerEvent): void {
    this.draggingSun = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.updateSunFromPointer(event);
  }

  protected onSkyPointerMove(event: PointerEvent): void {
    if (!this.draggingSun) {
      return;
    }

    this.updateSunFromPointer(event);
  }

  protected onSkyPointerUp(): void {
    this.draggingSun = false;
  }

  protected pickActivity(activity: JourneyActivity): void {
    this.journeyService.selectActivity(activity);
  }

  protected planSelectedActivity(): void {
    const activity = this.pickedActivity();
    if (!activity) {
      return;
    }

    const patch = this.journeyService.buildDatePlanPatch(activity);
    const dateTime = this.buildSuggestedDateTime();
    this.aiChatService.applyWelcomeJourneyPatch({ ...patch, dateTime });
    void this.router.navigateByUrl('/create-date-plan', { state: { fromWelcome: true } });
  }

  protected restartJourney(): void {
    this.journeyService.reset();
    this.step.set('car');
    this.introPhase.set('zoom');
    this.butterflies.set(this.createButterflies());
  }

  private updateSunFromPointer(event: PointerEvent): void {
    const sky = event.currentTarget as HTMLElement;
    const rect = sky.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    this.journeyService.setSunPosition(x);
  }

  private sunArcTop(position: number): number {
    const normalized = position / 100;
    const arc = Math.sin(normalized * Math.PI);
    return 72 - arc * 52;
  }

  private buildSuggestedDateTime(): string {
    const time = this.journeyService.suggestedTime();
    const date = new Date();
    date.setDate(date.getDate() + 7);
    const [hours, minutes] = time.split(':').map((part) => Number(part));
    date.setHours(hours, minutes, 0, 0);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${time}`;
  }

  private createButterflies(): Butterfly[] {
    return Array.from({ length: 18 }, (_, index) => ({
      id: index + 1,
      left: Math.random() * 92 + 4,
      top: Math.random() * 78 + 8,
      delay: Math.random() * 2.5,
      duration: 4 + Math.random() * 3,
      scale: 0.7 + Math.random() * 0.9,
      hue: Math.floor(Math.random() * 60) + 280
    }));
  }
}
