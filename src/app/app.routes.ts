import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { CreateDatePlan } from './pages/create-date-plan/create-date-plan';
import { Login } from './pages/login/login';
import { UpcomingDates } from './pages/upcoming-dates/upcoming-dates';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'upcoming-dates'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'create-date-plan',
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
    redirectTo: 'upcoming-dates'
  }
];
