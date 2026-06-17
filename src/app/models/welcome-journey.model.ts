export type JourneyCar = 'mustang' | 'lexus';

export type SunPhase =
  | 'dawn'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'golden-hour'
  | 'evening'
  | 'night';

export type JourneyStep = 'intro' | 'car' | 'sun' | 'activities';

export interface JourneyActivity {
  id: string;
  label: string;
  description: string;
  icon: string;
  car: JourneyCar;
  phases: SunPhase[];
}

export interface JourneySelection {
  car: JourneyCar;
  sunPosition: number;
  phase: SunPhase;
  phaseLabel: string;
  suggestedTime: string;
  locationScope: string;
  activities: JourneyActivity[];
}
