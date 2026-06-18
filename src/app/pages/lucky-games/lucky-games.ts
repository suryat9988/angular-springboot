import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import {
  LUCKY_GAMES,
  LuckyDiscountService,
  LuckyGameId
} from '../../core/services/lucky-discount';
import { PartnerRelationshipService } from '../../core/services/partner-relationship';
import { RewardsProgramService } from '../../core/services/rewards-program';
import { AppIcon } from '../../shared/components/app-icon/app-icon';

interface Heart {
  id: number;
  left: number;
}

interface MemoryCard {
  id: number;
  emoji: string;
  pairId: number;
  flipped: boolean;
  matched: boolean;
}

interface MathQuestion {
  prompt: string;
  answer: number;
}

@Component({
  selector: 'app-lucky-games',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    AppIcon
  ],
  templateUrl: './lucky-games.html',
  styleUrl: './lucky-games.scss'
})
export class LuckyGames implements OnDestroy {
  private readonly luckyDiscountService = inject(LuckyDiscountService);
  private readonly partnerRelationshipService = inject(PartnerRelationshipService);
  private readonly rewardsProgramService = inject(RewardsProgramService);
  private heartTimer: ReturnType<typeof setInterval> | null = null;
  private heartEndTimer: ReturnType<typeof setTimeout> | null = null;
  private heartId = 0;

  readonly games = LUCKY_GAMES;
  readonly activeGame = signal<LuckyGameId | null>(null);
  readonly results = this.luckyDiscountService.results;
  readonly luckyDiscountPercent = this.luckyDiscountService.luckyDiscountPercent;
  readonly allGamesPlayed = this.luckyDiscountService.allGamesPlayed;
  readonly usesRewardsProgram = this.partnerRelationshipService.usesRewardsProgram;
  readonly earnedPoints = this.rewardsProgramService.earnedPoints;
  readonly availablePoints = this.rewardsProgramService.availablePoints;
  readonly rewardsValue = this.rewardsProgramService.pointsValue;
  readonly redemptionOptions = this.rewardsProgramService.redemptionOptions;
  readonly redeemed = this.rewardsProgramService.redeemed;

  readonly sampleBill = signal(120);
  readonly billBreakdown = computed(() =>
    this.luckyDiscountService.calculateSavings(this.sampleBill())
  );

  // Heart Catch
  readonly hearts = signal<Heart[]>([]);
  readonly heartsCaught = signal(0);
  readonly heartsMissed = signal(0);
  readonly heartGameRunning = signal(false);

  // Math Blitz
  readonly mathQuestions = signal<MathQuestion[]>([]);
  readonly mathIndex = signal(0);
  readonly mathCorrect = signal(0);
  readonly mathAnswer = signal('');
  readonly mathRunning = signal(false);

  // Memory Match
  readonly memoryCards = signal<MemoryCard[]>([]);
  readonly memoryMoves = signal(0);
  readonly memoryFirstPick = signal<number | null>(null);
  readonly memoryLock = signal(false);
  readonly memoryRunning = signal(false);

  // Lucky Dice
  readonly diceRolls = signal<number[]>([]);
  readonly diceValues = signal<[number, number]>([1, 1]);
  readonly diceRolling = signal(false);

  readonly gameMessage = signal<string | null>(null);

  ngOnDestroy(): void {
    this.stopHeartGame();
  }

  protected scoreFor(gameId: LuckyGameId): number | null {
    return this.luckyDiscountService.getScoreForGame(gameId);
  }

  protected activeGameTitle(): string {
    const gameId = this.activeGame();
    return this.games.find((game) => game.id === gameId)?.title ?? 'Lucky game';
  }

  protected openGame(gameId: LuckyGameId): void {
    this.activeGame.set(gameId);
    this.gameMessage.set(null);
    this.resetGameState(gameId);
  }

  protected closeGame(): void {
    this.activeGame.set(null);
    this.stopHeartGame();
  }

  protected resetAllProgress(): void {
    this.luckyDiscountService.clearResults();
    this.rewardsProgramService.clearRedemptions();
    this.activeGame.set(null);
    this.gameMessage.set(
      this.usesRewardsProgram()
        ? 'Scores cleared. Play again to earn new rewards points.'
        : 'Scores cleared. Play again to earn a new lucky discount.'
    );
  }

  protected redeemReward(type: 'cash' | 'dining' | 'experience'): void {
    const redeemed = this.rewardsProgramService.redeem(type);
    if (!redeemed) {
      this.gameMessage.set('Not enough points for that reward yet. Keep playing!');
      return;
    }

    this.gameMessage.set(`Redeemed ${redeemed.label} for ${redeemed.points} points.`);
  }

  protected canRedeem(pointsCost: number): boolean {
    return this.rewardsProgramService.canRedeem(pointsCost);
  }

  // Heart Catch
  protected startHeartGame(): void {
    this.stopHeartGame();
    this.hearts.set([]);
    this.heartsCaught.set(0);
    this.heartsMissed.set(0);
    this.heartGameRunning.set(true);

    this.heartTimer = setInterval(() => {
      this.hearts.update((current) => [
        ...current,
        { id: ++this.heartId, left: 8 + Math.random() * 78 }
      ]);
    }, 700);

    this.heartEndTimer = setTimeout(() => this.finishHeartGame(), 12000);
  }

  protected catchHeart(id: number): void {
    if (!this.heartGameRunning()) {
      return;
    }

    this.hearts.update((current) => current.filter((heart) => heart.id !== id));
    this.heartsCaught.update((count) => count + 1);
  }

  // Math Blitz
  protected startMathGame(): void {
    this.mathQuestions.set(this.createMathQuestions());
    this.mathIndex.set(0);
    this.mathCorrect.set(0);
    this.mathAnswer.set('');
    this.mathRunning.set(true);
  }

  protected submitMathAnswer(): void {
    if (!this.mathRunning()) {
      return;
    }

    const current = this.mathQuestions()[this.mathIndex()];
    if (!current) {
      return;
    }

    const rawAnswer = String(this.mathAnswer() ?? '').trim();
    if (!rawAnswer) {
      this.gameMessage.set('Enter an answer before submitting.');
      return;
    }

    const given = Number(rawAnswer);
    if (Number.isNaN(given)) {
      this.gameMessage.set('Enter a valid number.');
      return;
    }

    let correct = this.mathCorrect();
    if (given === current.answer) {
      correct += 1;
      this.mathCorrect.set(correct);
    }

    const nextIndex = this.mathIndex() + 1;
    if (nextIndex >= this.mathQuestions().length) {
      const score = (correct / this.mathQuestions().length) * 100;
      this.finishGame('math-blitz', score, `Math Blitz score: ${Math.round(score)}%`);
      this.mathRunning.set(false);
      return;
    }

    this.mathIndex.set(nextIndex);
    this.mathAnswer.set('');
    this.gameMessage.set(null);
  }

  // Memory Match
  protected startMemoryGame(): void {
    const emojis = ['🐦', '💙', '🌸', '☀️'];
    const deck = emojis
      .flatMap((emoji, index) => [
        { id: index * 2, emoji, pairId: index, flipped: false, matched: false },
        { id: index * 2 + 1, emoji, pairId: index, flipped: false, matched: false }
      ])
      .sort(() => Math.random() - 0.5);

    this.memoryCards.set(deck);
    this.memoryMoves.set(0);
    this.memoryFirstPick.set(null);
    this.memoryLock.set(false);
    this.memoryRunning.set(true);
  }

  protected flipCard(cardId: number): void {
    if (!this.memoryRunning() || this.memoryLock()) {
      return;
    }

    const cards = this.memoryCards();
    const target = cards.find((card) => card.id === cardId);
    if (!target || target.flipped || target.matched) {
      return;
    }

    const flippedCards = cards.map((card) =>
      card.id === cardId ? { ...card, flipped: true } : card
    );
    this.memoryCards.set(flippedCards);

    const firstPick = this.memoryFirstPick();
    if (firstPick === null) {
      this.memoryFirstPick.set(cardId);
      return;
    }

    if (firstPick === cardId) {
      return;
    }

    this.memoryMoves.update((moves) => moves + 1);
    this.memoryLock.set(true);

    const firstCard = flippedCards.find((card) => card.id === firstPick);
    const secondCard = flippedCards.find((card) => card.id === cardId);

    if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
      this.memoryCards.set(
        flippedCards.map((card) =>
          card.pairId === firstCard.pairId ? { ...card, matched: true } : card
        )
      );
      this.memoryFirstPick.set(null);
      this.memoryLock.set(false);

      if (this.memoryCards().every((card) => card.matched)) {
        const moves = this.memoryMoves();
        const score = Math.max(35, 100 - (moves - 4) * 12);
        this.finishGame('memory-match', score, `BowerBird Match score: ${Math.round(score)}%`);
        this.memoryRunning.set(false);
      }

      return;
    }

    setTimeout(() => {
      this.memoryCards.set(
        this.memoryCards().map((card) =>
          card.id === firstPick || card.id === cardId ? { ...card, flipped: false } : card
        )
      );
      this.memoryFirstPick.set(null);
      this.memoryLock.set(false);
    }, 650);
  }

  // Lucky Dice
  protected async rollDice(): Promise<void> {
    if (this.diceRolling() || this.diceRolls().length >= 3) {
      return;
    }

    this.diceRolling.set(true);
    for (let frame = 0; frame < 8; frame++) {
      this.diceValues.set([this.randomDie(), this.randomDie()]);
      await this.wait(80);
    }

    const finalRoll: [number, number] = [this.randomDie(), this.randomDie()];
    this.diceValues.set(finalRoll);
    const rollScore = Math.round(((finalRoll[0] + finalRoll[1]) / 12) * 100);
    const rolls = [...this.diceRolls(), rollScore];
    this.diceRolls.set(rolls);
    this.diceRolling.set(false);

    if (rolls.length === 3) {
      const average = rolls.reduce((sum, value) => sum + value, 0) / rolls.length;
      this.finishGame('lucky-dice', average, `Lucky Dice score: ${Math.round(average)}%`);
    }
  }

  private finishHeartGame(): void {
    const caught = this.heartsCaught();
    const missed = this.heartsMissed() + this.hearts().length;
    const total = caught + missed;
    const score = total === 0 ? 0 : (caught / total) * 100;

    this.hearts.set([]);
    this.heartGameRunning.set(false);
    this.stopHeartGame();
    this.heartsMissed.set(missed);
    this.finishGame('heart-catch', score, `Heart Catch score: ${Math.round(score)}%`);
  }

  private stopHeartGame(): void {
    if (this.heartTimer) {
      clearInterval(this.heartTimer);
      this.heartTimer = null;
    }

    if (this.heartEndTimer) {
      clearTimeout(this.heartEndTimer);
      this.heartEndTimer = null;
    }

    if (this.heartGameRunning()) {
      this.hearts.update((current) => {
        this.heartsMissed.update((missed) => missed + current.length);
        return [];
      });
      this.heartGameRunning.set(false);
    }
  }

  private finishGame(gameId: LuckyGameId, score: number, message: string): void {
    this.luckyDiscountService.saveGameScore(gameId, score);
    this.gameMessage.set(message);
  }

  private resetGameState(gameId: LuckyGameId): void {
    if (gameId === 'heart-catch') {
      this.hearts.set([]);
      this.heartsCaught.set(0);
      this.heartsMissed.set(0);
      this.heartGameRunning.set(false);
    }

    if (gameId === 'math-blitz') {
      this.mathQuestions.set([]);
      this.mathIndex.set(0);
      this.mathCorrect.set(0);
      this.mathAnswer.set('');
      this.mathRunning.set(false);
    }

    if (gameId === 'memory-match') {
      this.memoryCards.set([]);
      this.memoryMoves.set(0);
      this.memoryFirstPick.set(null);
      this.memoryLock.set(false);
      this.memoryRunning.set(false);
    }

    if (gameId === 'lucky-dice') {
      this.diceRolls.set([]);
      this.diceValues.set([1, 1]);
      this.diceRolling.set(false);
    }
  }

  private createMathQuestions(): MathQuestion[] {
    const questions: MathQuestion[] = [];
    while (questions.length < 5) {
      const a = 2 + Math.floor(Math.random() * 12);
      const b = 1 + Math.floor(Math.random() * 10);
      const useAddition = Math.random() > 0.4;
      if (useAddition) {
        questions.push({ prompt: `${a} + ${b} = ?`, answer: a + b });
      } else {
        const high = Math.max(a, b);
        const low = Math.min(a, b);
        questions.push({ prompt: `${high} - ${low} = ?`, answer: high - low });
      }
    }

    return questions;
  }

  private randomDie(): number {
    return 1 + Math.floor(Math.random() * 6);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
