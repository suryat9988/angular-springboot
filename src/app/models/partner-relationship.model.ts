export type PartnerRelationship = 'dating' | 'engaged' | 'married';

export type RewardsRedemptionType = 'cash' | 'dining' | 'experience';

export interface RelationshipFormConfig {
  showBudget: boolean;
  showPartnerName: boolean;
  partnerNameLabel: string;
  usesLuckyDiscount: boolean;
  usesRewardsProgram: boolean;
}

export const RELATIONSHIP_OPTIONS: Array<{ value: PartnerRelationship; label: string }> = [
  { value: 'dating', label: 'Dating' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'married', label: 'Married' }
];

export const RELATIONSHIP_FORM_CONFIG: Record<PartnerRelationship, RelationshipFormConfig> = {
  dating: {
    showBudget: true,
    showPartnerName: true,
    partnerNameLabel: 'Partner name',
    usesLuckyDiscount: true,
    usesRewardsProgram: false
  },
  engaged: {
    showBudget: true,
    showPartnerName: true,
    partnerNameLabel: 'Partner name',
    usesLuckyDiscount: true,
    usesRewardsProgram: false
  },
  married: {
    showBudget: false,
    showPartnerName: true,
    partnerNameLabel: 'Spouse name',
    usesLuckyDiscount: false,
    usesRewardsProgram: true
  }
};

export const REWARDS_REDEMPTION_OPTIONS: Array<{
  type: RewardsRedemptionType;
  label: string;
  pointsCost: number;
  valueLabel: string;
}> = [
  { type: 'cash', label: 'Cash back', pointsCost: 100, valueLabel: '$10 cash' },
  { type: 'dining', label: 'Dining credit', pointsCost: 150, valueLabel: '$15 restaurant credit' },
  { type: 'experience', label: 'Experience gift', pointsCost: 250, valueLabel: '$25 activity or gift card' }
];
