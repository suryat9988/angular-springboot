import { Injectable, computed, signal } from '@angular/core';

import { DatePlanFormPatch } from '../../models/date-plan-form-patch.model';
import {
  JourneyActivity,
  JourneyCar,
  JourneySelection,
  SunPhase
} from '../../models/welcome-journey.model';

const CITY_ACTIVITIES: JourneyActivity[] = [
  {
    id: 'brunch-bistro',
    label: 'Brunch bistro',
    description: 'Cozy morning plates within the city.',
    icon: '🥐',
    car: 'mustang',
    phases: ['dawn', 'morning']
  },
  {
    id: 'coffee-roasters',
    label: 'Specialty coffee',
    description: 'Third-wave cafes and slow pours.',
    icon: '☕',
    car: 'mustang',
    phases: ['dawn', 'morning']
  },
  {
    id: 'farmers-market',
    label: 'Farmers market',
    description: 'Fresh picks and local vendors.',
    icon: '🧺',
    car: 'mustang',
    phases: ['morning']
  },
  {
    id: 'lunch-spot',
    label: 'City lunch',
    description: 'Trendy restaurants and chef counters.',
    icon: '🍽️',
    car: 'mustang',
    phases: ['midday', 'afternoon']
  },
  {
    id: 'boutique-shopping',
    label: 'Boutique shopping',
    description: 'Style strolls through downtown shops.',
    icon: '🛍️',
    car: 'mustang',
    phases: ['midday', 'afternoon']
  },
  {
    id: 'art-gallery',
    label: 'Art gallery',
    description: 'Contemporary exhibits and installations.',
    icon: '🖼️',
    car: 'mustang',
    phases: ['afternoon', 'midday']
  },
  {
    id: 'cocktail-bar',
    label: 'Cocktail bar',
    description: 'Craft drinks and moody lounges.',
    icon: '🍸',
    car: 'mustang',
    phases: ['afternoon', 'golden-hour', 'evening']
  },
  {
    id: 'rooftop-drinks',
    label: 'Rooftop drinks',
    description: 'Skyline views with golden-hour pours.',
    icon: '🌆',
    car: 'mustang',
    phases: ['golden-hour', 'evening']
  },
  {
    id: 'fine-dining',
    label: 'Fine dining',
    description: 'Reservation-only tasting menus.',
    icon: '✨',
    car: 'mustang',
    phases: ['evening', 'night']
  },
  {
    id: 'speakeasy',
    label: 'Speakeasy night',
    description: 'Hidden doors and live vinyl.',
    icon: '🎷',
    car: 'mustang',
    phases: ['night', 'evening']
  },
  {
    id: 'late-dessert',
    label: 'Late-night dessert',
    description: 'Pastry bars and gelato runs.',
    icon: '🍰',
    car: 'mustang',
    phases: ['night']
  }
];

const OUTDOOR_ACTIVITIES: JourneyActivity[] = [
  {
    id: 'sunrise-hike',
    label: 'Sunrise hike',
    description: 'Trailheads just beyond the skyline.',
    icon: '🌄',
    car: 'lexus',
    phases: ['dawn', 'morning']
  },
  {
    id: 'horse-riding',
    label: 'Horse riding',
    description: 'Guided rides through open country.',
    icon: '🐎',
    car: 'lexus',
    phases: ['morning', 'afternoon']
  },
  {
    id: 'waterfall-trail',
    label: 'Waterfall trail',
    description: 'Mist, pools, and forest canopy.',
    icon: '💧',
    car: 'lexus',
    phases: ['morning', 'midday', 'afternoon']
  },
  {
    id: 'lakeside-picnic',
    label: 'Lakeside picnic',
    description: 'Blanket spreads with mountain views.',
    icon: '🧺',
    car: 'lexus',
    phases: ['midday', 'afternoon']
  },
  {
    id: 'scenic-overlook',
    label: 'Scenic overlook',
    description: 'Pull-offs with panoramic vistas.',
    icon: '🏔️',
    car: 'lexus',
    phases: ['midday', 'afternoon', 'golden-hour']
  },
  {
    id: 'kayaking',
    label: 'Kayaking',
    description: 'Calm coves and river bends.',
    icon: '🛶',
    car: 'lexus',
    phases: ['midday', 'afternoon']
  },
  {
    id: 'vineyard-visit',
    label: 'Vineyard visit',
    description: 'Rolling hills and wine flights.',
    icon: '🍷',
    car: 'lexus',
    phases: ['afternoon', 'golden-hour']
  },
  {
    id: 'sunset-hike',
    label: 'Sunset hike',
    description: 'Golden ridges and wide-open skies.',
    icon: '🌅',
    car: 'lexus',
    phases: ['golden-hour', 'evening']
  },
  {
    id: 'coastal-drive',
    label: 'Coastal drive',
    description: 'Winding roads with ocean air.',
    icon: '🌊',
    car: 'lexus',
    phases: ['golden-hour', 'evening']
  },
  {
    id: 'stargazing',
    label: 'Stargazing',
    description: 'Dark-sky fields far from city lights.',
    icon: '🌙',
    car: 'lexus',
    phases: ['night', 'evening']
  },
  {
    id: 'hot-springs',
    label: 'Hot springs',
    description: 'Steam pools under the night sky.',
    icon: '♨️',
    car: 'lexus',
    phases: ['night', 'evening']
  }
];

const PHASE_META: Record<SunPhase, { label: string; suggestedTime: string }> = {
  dawn: { label: 'Dawn glow', suggestedTime: '06:30' },
  morning: { label: 'Morning light', suggestedTime: '09:00' },
  midday: { label: 'High noon', suggestedTime: '12:30' },
  afternoon: { label: 'Afternoon warmth', suggestedTime: '15:00' },
  'golden-hour': { label: 'Golden hour', suggestedTime: '17:30' },
  evening: { label: 'Evening sky', suggestedTime: '19:30' },
  night: { label: 'Moonlit night', suggestedTime: '21:00' }
};

@Injectable({
  providedIn: 'root'
})
export class WelcomeJourneyService {
  private readonly car = signal<JourneyCar | null>(null);
  private readonly sunPosition = signal(62);
  private readonly selectedActivity = signal<JourneyActivity | null>(null);

  readonly selectedCar = this.car.asReadonly();
  readonly sunHeight = this.sunPosition.asReadonly();
  readonly pickedActivity = this.selectedActivity.asReadonly();

  readonly phase = computed(() => this.resolvePhase(this.sunPosition()));
  readonly phaseLabel = computed(() => PHASE_META[this.phase()].label);
  readonly suggestedTime = computed(() => PHASE_META[this.phase()].suggestedTime);

  readonly moonScale = computed(() => {
    const sun = this.sunPosition();
    if (sun >= 78) {
      return 1.15;
    }

    if (sun >= 55) {
      return 0.55 + ((sun - 55) / 23) * 0.6;
    }

    return Math.max(0.25, 0.85 - sun / 120);
  });

  readonly skyGradient = computed(() => {
    const sun = this.sunPosition();
    if (sun >= 82) {
      return 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)';
    }

    if (sun >= 65) {
      return 'linear-gradient(180deg, #fb923c 0%, #f472b6 38%, #312e81 100%)';
    }

    if (sun >= 40) {
      return 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 42%, #fde68a 100%)';
    }

    return 'linear-gradient(180deg, #fbbf24 0%, #fb923c 48%, #fda4af 100%)';
  });

  readonly selection = computed<JourneySelection | null>(() => {
    const car = this.car();
    if (!car) {
      return null;
    }

    const phase = this.phase();
    return {
      car,
      sunPosition: this.sunPosition(),
      phase,
      phaseLabel: PHASE_META[phase].label,
      suggestedTime: PHASE_META[phase].suggestedTime,
      locationScope:
        car === 'mustang'
          ? 'In the city — within a 50-mile radius'
          : 'Outside the city — open country escapes',
      activities: this.activitiesFor(car, phase)
    };
  });

  setCar(car: JourneyCar): void {
    this.car.set(car);
    this.selectedActivity.set(null);
  }

  setSunPosition(position: number): void {
    this.sunPosition.set(Math.min(100, Math.max(0, position)));
  }

  selectActivity(activity: JourneyActivity): void {
    this.selectedActivity.set(activity);
  }

  reset(): void {
    this.car.set(null);
    this.sunPosition.set(62);
    this.selectedActivity.set(null);
  }

  buildDatePlanPatch(activity: JourneyActivity): DatePlanFormPatch {
    const car = this.car();
    const phase = this.phase();
    const scope =
      car === 'mustang'
        ? 'city date within 50 miles'
        : 'outside-the-city adventure';

    return {
      title: `${activity.label} Date`,
      description: `${activity.description} Planned for ${PHASE_META[phase].label.toLowerCase()} (${scope}).`,
      location: car === 'mustang' ? 'City center' : 'Outside the city',
      notes: `Chosen from welcome journey: ${car === 'mustang' ? 'Mustang (city, 50mi)' : 'Lexus (outside city)'}. Activity: ${activity.label}. Time vibe: ${PHASE_META[phase].label}.`
    };
  }

  private activitiesFor(car: JourneyCar, phase: SunPhase): JourneyActivity[] {
    const catalog = car === 'mustang' ? CITY_ACTIVITIES : OUTDOOR_ACTIVITIES;
    return catalog.filter((activity) => activity.phases.includes(phase));
  }

  private resolvePhase(position: number): SunPhase {
    if (position < 12) {
      return 'dawn';
    }

    if (position < 28) {
      return 'morning';
    }

    if (position < 44) {
      return 'midday';
    }

    if (position < 58) {
      return 'afternoon';
    }

    if (position < 72) {
      return 'golden-hour';
    }

    if (position < 86) {
      return 'evening';
    }

    return 'night';
  }
}
