import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { CreateDatePlan } from './pages/create-date-plan/create-date-plan';
import { Login } from './pages/login/login';
import { UpcomingDates } from './pages/upcoming-dates/upcoming-dates';
import { Welcome } from './pages/welcome/welcome';
import { BreakupDatePuzzle } from './pages/breakup-date-puzzle/breakup-date-puzzle';
import { LuckyGames } from './pages/lucky-games/lucky-games';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'welcome'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'welcome',
    component: Welcome,
    canActivate: [authGuard]
  },
  {
    path: 'breakup-date-puzzle',
    component: BreakupDatePuzzle,
    canActivate: [authGuard]
  },
  {
    path: 'lucky-games',
    component: LuckyGames,
    canActivate: [authGuard]
  },
  {
    path: 'create-date-plan',
    component: CreateDatePlan,
    canActivate: [authGuard]
  },
  {
    path: 'create-date-plan/:planId',
    component: CreateDatePlan,
    canActivate: [authGuard]
  },
  {
    path: 'upcoming-dates',
    component: UpcomingDates,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'welcome'
  }
];
