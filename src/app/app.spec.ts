import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { App } from './app';
import { AuthService } from './core/services/auth';
import { MessagingService } from './core/services/messaging';

describe('App', () => {
  const authServiceStub = {
    user$: of(null),
    isAuthenticated: signal(false),
    displayName: signal('BowerBird'),
    signOut: jasmine.createSpy('signOut').and.resolveTo()
  };

  const messagingServiceStub = {
    requestPermissionAndStoreToken: jasmine.createSpy('requestPermissionAndStoreToken').and.resolveTo()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
        { provide: MessagingService, useValue: messagingServiceStub }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
