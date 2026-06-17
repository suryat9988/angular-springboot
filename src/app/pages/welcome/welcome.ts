import { Component } from '@angular/core';

import { WelcomeJourney } from './welcome-journey/welcome-journey';

@Component({
  selector: 'app-welcome',
  imports: [WelcomeJourney],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss'
})
export class Welcome {}
