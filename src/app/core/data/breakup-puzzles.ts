export type PuzzleLevel = 'very-easy' | 'easy' | 'medium' | 'hard';

export interface PuzzleLevelMeta {
  id: PuzzleLevel;
  title: string;
  subtitle: string;
  order: number;
}

export const PUZZLE_LEVELS: PuzzleLevelMeta[] = [
  { id: 'very-easy', title: 'Very Easy', subtitle: 'Mini Sudoku', order: 1 },
  { id: 'easy', title: 'Easy', subtitle: 'Math challenge', order: 2 },
  { id: 'medium', title: 'Medium', subtitle: 'Chess checkmate in 2', order: 3 },
  { id: 'hard', title: 'Hard', subtitle: 'Color the Malibu scene', order: 4 }
];

// 4x4 sudoku: 0 = empty cell
export const MINI_SUDOKU_PUZZLE = [
  [1, 0, 0, 4],
  [0, 4, 1, 0],
  [0, 1, 4, 0],
  [4, 0, 0, 1]
] as const;

export const MINI_SUDOKU_SOLUTION = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1]
];

export const MATH_PUZZLE = {
  prompt: '12 + 8 = ?',
  answer: 20
};

export interface ChessMoveOption {
  label: string;
  notation: string;
  isCorrect: boolean;
}

export const CHESS_PUZZLE = {
  prompt: 'White to move. Find the first move that leads to checkmate in 2.',
  fenDescription: 'White King on e1, White Queen on f7. Black King on g8.',
  board: [
    ['.', '.', '.', '.', '.', '.', '.', 'k'],
    ['.', '.', '.', '.', '.', 'Q', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', 'K', '.', '.', '.']
  ] as const,
  options: [
    { label: 'Qf8+ (Queen to f8, check)', notation: 'Qf8+', isCorrect: true },
    { label: 'Qg7 (Queen takes g7)', notation: 'Qg7', isCorrect: false },
    { label: 'Qe8 (Queen to e8)', notation: 'Qe8', isCorrect: false },
    { label: 'Kh1 (King to h1)', notation: 'Kh1', isCorrect: false }
  ] satisfies ChessMoveOption[]
};

export const COLORING_REGIONS = [
  { id: 'sky', label: 'Sky' },
  { id: 'sun', label: 'Sun' },
  { id: 'clouds', label: 'Clouds' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'mountain', label: 'Black mountain' },
  { id: 'villa', label: 'White villa' },
  { id: 'garden', label: 'Green garden' },
  { id: 'flowers', label: 'Flowers' },
  { id: 'bird-left', label: 'Left bower bird' },
  { id: 'bird-right', label: 'Right bower bird' }
] as const;

export const COLORING_PALETTE = [
  '#87CEEB',
  '#FFD166',
  '#FFFFFF',
  '#1E88E5',
  '#2D2D2D',
  '#F8F8F2',
  '#4CAF50',
  '#E91E63',
  '#4F46E5',
  '#8B5E3C'
];
