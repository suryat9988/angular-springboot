import { Injectable, computed, inject, signal } from '@angular/core';

import {
  REWARDS_REDEMPTION_OPTIONS,
  RewardsRedemptionType
} from '../../models/partner-relationship.model';
import { LuckyDiscountService } from './lucky-discount';

export interface RewardsRedemption {
  type: RewardsRedemptionType;
  points: number;
  value: number;
  label: string;
  redeemedAt: string;
}

const REDEEMED_STORAGE_KEY = 'bowerbox.rewards-redeemed';

@Injectable({
  providedIn: 'root'
})
export class RewardsProgramService {
  private readonly luckyDiscountService = inject(LuckyDiscountService);
  private readonly redeemedSignal = signal<RewardsRedemption[]>(this.readRedeemed());

  readonly redemptionOptions = REWARDS_REDEMPTION_OPTIONS;
  readonly redeemed = this.redeemedSignal.asReadonly();

  readonly earnedPoints = computed(() => {
    const results = this.luckyDiscountService.results();
    return results.reduce((sum, result) => sum + result.score, 0);
  });

  readonly redeemedPoints = computed(() =>
    this.redeemedSignal().reduce((sum, entry) => sum + entry.points, 0)
  );

  readonly availablePoints = computed(() =>
    Math.max(0, this.earnedPoints() - this.redeemedPoints())
  );

  readonly pointsValue = computed(() => this.availablePoints() / 10);

  canRedeem(pointsCost: number): boolean {
    return this.availablePoints() >= pointsCost;
  }

  redeem(type: RewardsRedemptionType): RewardsRedemption | null {
    const option = REWARDS_REDEMPTION_OPTIONS.find((entry) => entry.type === type);
    if (!option || !this.canRedeem(option.pointsCost)) {
      return null;
    }

    const redemption: RewardsRedemption = {
      type: option.type,
      points: option.pointsCost,
      value: this.pointsToDollars(option.pointsCost),
      label: option.valueLabel,
      redeemedAt: new Date().toISOString()
    };

    const next = [...this.redeemedSignal(), redemption];
    this.redeemedSignal.set(next);
    localStorage.setItem(REDEEMED_STORAGE_KEY, JSON.stringify(next));
    return redemption;
  }

  getOptionLabel(type: RewardsRedemptionType): string {
    return REWARDS_REDEMPTION_OPTIONS.find((entry) => entry.type === type)?.valueLabel ?? type;
  }

  pointsToDollars(points: number): number {
    return Math.round((points / 10) * 100) / 100;
  }

  clearRedemptions(): void {
    this.redeemedSignal.set([]);
    localStorage.removeItem(REDEEMED_STORAGE_KEY);
  }

  private readRedeemed(): RewardsRedemption[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(REDEEMED_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as RewardsRedemption[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
