import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <img
      [src]="'/icons/' + name() + '.svg'"
      [alt]="alt()"
      [class]="'app-icon app-icon--' + size()"
      aria-hidden="true"
    />
  `,
  styles: `
    .app-icon {
      display: inline-block;
      object-fit: contain;
      flex-shrink: 0;
    }

    .app-icon--sm {
      width: 18px;
      height: 18px;
    }

    .app-icon--md {
      width: 24px;
      height: 24px;
    }

    .app-icon--lg {
      width: 32px;
      height: 32px;
    }

    .app-icon--xl {
      width: 44px;
      height: 44px;
    }
  `
})
export class AppIcon {
  readonly name = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly alt = input('');
}
