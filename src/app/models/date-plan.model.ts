import { PartnerRelationship, RewardsRedemptionType } from './partner-relationship.model';

export interface RewardsRedemptionSummary {
  type: RewardsRedemptionType;
  points: number;
  value: number;
  label: string;
}

export interface DatePlan {
  id: string;
  title: string;
  description: string;
  dateTime: Date;
  location: string;
  relationshipType?: PartnerRelationship;
  partnerName?: string;
  budget?: number | null;
  notes?: string;
  luckyDiscountPercent?: number | null;
  rewardsRedemption?: RewardsRedemptionSummary | null;
  pdfUrl?: string;
  pdfStoragePath?: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateDatePlanRequest {
  title?: string;
  description?: string;
  dateTime: string;
  location?: string;
  relationshipType?: PartnerRelationship;
  partnerName?: string;
  budget?: number | null;
  notes?: string;
  luckyDiscountPercent?: number | null;
  rewardsRedemption?: RewardsRedemptionSummary | null;
}
