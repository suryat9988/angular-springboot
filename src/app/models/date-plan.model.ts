export interface DatePlan {
  id: string;
  title: string;
  description: string;
  dateTime: Date;
  location: string;
  partnerName?: string;
  budget?: number | null;
  notes?: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateDatePlanRequest {
  title: string;
  description: string;
  dateTime: string;
  location: string;
  partnerName?: string;
  budget?: number | null;
  notes?: string;
}
