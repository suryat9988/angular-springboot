export interface DatePlanFormPatch {
  title?: string;
  description?: string;
  dateTime?: string;
  location?: string;
  relationshipType?: 'dating' | 'engaged' | 'married';
  partnerName?: string;
  budget?: number | null;
  notes?: string;
}
