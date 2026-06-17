import { Injectable, computed, signal } from '@angular/core';

import {
  PartnerRelationship,
  RELATIONSHIP_FORM_CONFIG,
  RelationshipFormConfig
} from '../../models/partner-relationship.model';

const STORAGE_KEY = 'bowerbox.partner-relationship';

@Injectable({
  providedIn: 'root'
})
export class PartnerRelationshipService {
  private readonly relationshipSignal = signal<PartnerRelationship>(this.readStoredRelationship());

  readonly relationship = this.relationshipSignal.asReadonly();
  readonly formConfig = computed<RelationshipFormConfig>(
    () => RELATIONSHIP_FORM_CONFIG[this.relationshipSignal()]
  );
  readonly isMarried = computed(() => this.relationshipSignal() === 'married');
  readonly usesLuckyDiscount = computed(() => this.formConfig().usesLuckyDiscount);
  readonly usesRewardsProgram = computed(() => this.formConfig().usesRewardsProgram);

  setRelationship(relationship: PartnerRelationship): void {
    this.relationshipSignal.set(relationship);
    localStorage.setItem(STORAGE_KEY, relationship);
  }

  detectFromText(text: string): PartnerRelationship | null {
    const input = text.toLowerCase();

    if (/\b(married|wife|husband|spouse|my marriage|wedding anniversary)\b/i.test(input)) {
      return 'married';
    }

    if (/\b(engaged|fiancee|fiancé|fiance|betrothed)\b/i.test(input)) {
      return 'engaged';
    }

    if (/\b(girlfriend|boyfriend|dating|first date|crush|new relationship|partner)\b/i.test(input)) {
      return 'dating';
    }

    return null;
  }

  applyDetectedRelationship(text: string): PartnerRelationship | null {
    const detected = this.detectFromText(text);
    if (detected) {
      this.setRelationship(detected);
    }

    return detected;
  }

  private readStoredRelationship(): PartnerRelationship {
    if (typeof localStorage === 'undefined') {
      return 'dating';
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dating' || stored === 'engaged' || stored === 'married') {
      return stored;
    }

    return 'dating';
  }
}
