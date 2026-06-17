import { Injectable, computed, signal } from '@angular/core';

export type LuckyGameId = 'heart-catch' | 'math-blitz' | 'memory-match' | 'lucky-dice';

export interface LuckyGameMeta {
  id: LuckyGameId;
  title: string;
  description: string;
  icon: string;
}

export interface LuckyGameResult {
  gameId: LuckyGameId;
  score: number;
  playedAt: string;
}

const STORAGE_KEY = 'bowerbox.lucky-game-results';

export const LUCKY_GAMES: LuckyGameMeta[] = [
  {
    id: 'heart-catch',
    title: 'Heart Catch',
    description: 'Tap falling hearts before they disappear.',
    icon: 'heart-catch'
  },
  {
    id: 'math-blitz',
    title: 'Math Blitz',
    description: 'Answer 5 quick math problems.',
    icon: 'math'
  },
  {
    id: 'memory-match',
    title: 'BowerBird Match',
    description: 'Match the bird pairs in fewest moves.',
    icon: 'memory'
  },
  {
    id: 'lucky-dice',
    title: 'Lucky Dice',
    description: 'Roll dice three times and test your luck.',
    icon: 'dice'
  }
];

@Injectable({
  providedIn: 'root'
})
export class LuckyDiscountService {
  private readonly resultsSignal = signal<LuckyGameResult[]>(this.readStoredResults());

  readonly results = this.resultsSignal.asReadonly();
  readonly luckyDiscountPercent = computed(() => {
    const results = this.resultsSignal();
    if (results.length === 0) {
      return 0;
    }

    const total = results.reduce((sum, result) => sum + result.score, 0);
    return Math.round(total / results.length);
  });

  readonly gamesPlayed = computed(() => this.resultsSignal().length);
  readonly allGamesPlayed = computed(() => this.resultsSignal().length >= LUCKY_GAMES.length);

  getScoreForGame(gameId: LuckyGameId): number | null {
    return this.resultsSignal().find((result) => result.gameId === gameId)?.score ?? null;
  }

  saveGameScore(gameId: LuckyGameId, score: number): void {
    const normalized = Math.max(0, Math.min(100, Math.round(score)));
    const next = [
      ...this.resultsSignal().filter((result) => result.gameId !== gameId),
      { gameId, score: normalized, playedAt: new Date().toISOString() }
    ];

    this.resultsSignal.set(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  clearResults(): void {
    this.resultsSignal.set([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  calculateSavings(billAmount: number): { discountPercent: number; savings: number; youPay: number } {
    const discountPercent = this.luckyDiscountPercent();
    const safeBill = Math.max(0, billAmount);
    const savings = Math.round(safeBill * (discountPercent / 100) * 100) / 100;
    const youPay = Math.round((safeBill - savings) * 100) / 100;

    return { discountPercent, savings, youPay };
  }

  private readStoredResults(): LuckyGameResult[] {
    if (typeof sessionStorage === 'undefined') {
      return [];
    }

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as LuckyGameResult[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
