import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  imports: [MatCardModule, RouterLink],
  templateUrl: './terms.html',
  styleUrl: './legal.scss'
})
export class Terms {}
