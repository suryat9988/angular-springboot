import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { RouterLink } from '@angular/router';

import {
  CHESS_PUZZLE,
  COLORING_PALETTE,
  COLORING_REGIONS,
  MATH_PUZZLE,
  MINI_SUDOKU_PUZZLE,
  MINI_SUDOKU_SOLUTION,
  PUZZLE_LEVELS,
  PuzzleLevel
} from '../../core/data/breakup-puzzles';
import { AppIcon } from '../../shared/components/app-icon/app-icon';

@Component({
  selector: 'app-breakup-date-puzzle',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    AppIcon
  ],
  templateUrl: './breakup-date-puzzle.html',
  styleUrl: './breakup-date-puzzle.scss'
})
export class BreakupDatePuzzle {
  readonly levels = PUZZLE_LEVELS;
  readonly mathPuzzle = MATH_PUZZLE;
  readonly chessPuzzle = CHESS_PUZZLE;
  readonly coloringRegions = COLORING_REGIONS;
  readonly palette = COLORING_PALETTE;
  readonly sudokuClues = MINI_SUDOKU_PUZZLE;

  readonly activeLevel = signal<PuzzleLevel>('very-easy');
  readonly completedLevels = signal<Set<PuzzleLevel>>(new Set());

  readonly sudokuGrid = signal(this.createSudokuGrid());
  readonly mathAnswer = signal('');
  readonly selectedChessMove = signal('');
  readonly selectedColor = signal(COLORING_PALETTE[0]);
  readonly coloredRegions = signal<Record<string, string>>({});

  readonly feedback = signal<string | null>(null);
  readonly allComplete = computed(() => this.completedLevels().size === this.levels.length);

  readonly activeLevelMeta = computed(
    () => this.levels.find((level) => level.id === this.activeLevel()) ?? this.levels[0]
  );

  protected isLevelComplete(level: PuzzleLevel): boolean {
    return this.completedLevels().has(level);
  }

  protected isLevelLocked(level: PuzzleLevel): boolean {
    const order = this.levels.find((item) => item.id === level)?.order ?? 1;
    if (order === 1) {
      return false;
    }

    const previous = this.levels.find((item) => item.order === order - 1);
    return previous ? !this.completedLevels().has(previous.id) : false;
  }

  protected selectLevel(level: PuzzleLevel): void {
    if (this.isLevelLocked(level)) {
      return;
    }

    this.activeLevel.set(level);
    this.feedback.set(null);
  }

  protected isSudokuClue(row: number, col: number): boolean {
    return MINI_SUDOKU_PUZZLE[row][col] !== 0;
  }

  protected getSudokuValue(row: number, col: number): number {
    return this.sudokuGrid()[row][col];
  }

  protected setSudokuValue(row: number, col: number, raw: string): void {
    if (this.isSudokuClue(row, col)) {
      return;
    }

    const value = raw.trim() === '' ? 0 : Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 4) {
      return;
    }

    const next = this.sudokuGrid().map((gridRow, rowIndex) =>
      gridRow.map((cell, colIndex) => (rowIndex === row && colIndex === col ? value : cell))
    );
    this.sudokuGrid.set(next);
  }

  protected checkSudoku(): void {
    const grid = this.sudokuGrid();

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (grid[row][col] === 0) {
          this.feedback.set('Fill in every empty cell before checking.');
          return;
        }
      }
    }

    const isValid = grid.every((row, rowIndex) =>
      row.every((value, colIndex) => value === MINI_SUDOKU_SOLUTION[rowIndex][colIndex])
    );

    if (!isValid) {
      this.feedback.set('Not quite right. Each row, column, and 2x2 box must use 1-4 once.');
      return;
    }

    this.completeLevel('very-easy', 'Sudoku solved. Level complete.');
  }

  protected checkMath(): void {
    const answer = Number(this.mathAnswer().trim());
    if (answer === MATH_PUZZLE.answer) {
      this.completeLevel('easy', 'Correct. Math level complete.');
      return;
    }

    this.feedback.set('Try again. Add the two numbers carefully.');
  }

  protected checkChess(): void {
    const selected = this.selectedChessMove();
    const correct = CHESS_PUZZLE.options.find((option) => option.isCorrect);

    if (selected === correct?.notation) {
      this.completeLevel(
        'medium',
        'Correct. After Qf8+, Black is forced into a mating net. Chess level complete.'
      );
      return;
    }

    this.feedback.set('That move does not force checkmate in 2. Look for a checking move with the queen.');
  }

  protected colorRegion(regionId: string): void {
    this.coloredRegions.update((current) => ({
      ...current,
      [regionId]: this.selectedColor()
    }));
  }

  protected getRegionColor(regionId: string): string {
    return this.coloredRegions()[regionId] ?? '#E8EEF8';
  }

  protected checkColoring(): void {
    const painted = COLORING_REGIONS.filter((region) => this.coloredRegions()[region.id]);
    if (painted.length < COLORING_REGIONS.length) {
      this.feedback.set(`Color all ${COLORING_REGIONS.length} regions to finish this level.`);
      return;
    }

    this.completeLevel('hard', 'Beautiful work. The Malibu scene is complete.');
  }

  protected pieceSymbol(piece: string): string {
    const symbols: Record<string, string> = {
      K: '♔',
      Q: '♕',
      k: '♚'
    };

    return symbols[piece] ?? '';
  }

  private completeLevel(level: PuzzleLevel, message: string): void {
    this.completedLevels.update((current) => new Set([...current, level]));
    this.feedback.set(message);

    const next = this.levels.find((item) => item.order === (this.activeLevelMeta().order + 1));
    if (next) {
      setTimeout(() => {
        this.activeLevel.set(next.id);
        this.feedback.set(null);
      }, 900);
    }
  }

  private createSudokuGrid(): number[][] {
    return MINI_SUDOKU_PUZZLE.map((row) => [...row]);
  }
}
