import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  imports: [MatCardModule, RouterLink],
  templateUrl: './privacy.html',
  styleUrl: './legal.scss'
})
export class Privacy {}
