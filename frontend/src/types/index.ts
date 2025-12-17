// Filter types
export interface DateRangeFilter {
  dateFrom?: string;
  dateTo?: string;
  patientId?: number;
  typeCode?: string;
  carrier?: string;
  billingCategory?: string;
}

export type DatePreset = '3m' | '6m' | '9m' | '1y' | 'all';

// Dashboard metrics
export interface DashboardMetrics {
  total_charges: number;
  total_payments: number;
  total_adjustments: number;
  collection_rate: number;
  procedure_count: number;
  patient_count: number;
  avg_days_to_payment: number | null;
}

// Surgery type metrics
export interface SurgeryTypeMetrics {
  type_code: string;
  surgery_type: string | null;
  procedure_count: number;
  total_charges: number;
  total_payments: number;
  collection_rate: number;
  avg_days_to_payment: number | null;
}

// Insurance metrics
export interface InsuranceMetrics {
  carrier: string;
  procedure_count: number;
  total_charges: number;
  total_payments: number;
  collection_rate: number;
  avg_days_to_payment: number | null;
}

// Recovery rate
export interface RecoveryRate {
  percent: number;
  amount: number;
  procedures: number;
}

export interface RecoveryAnalysis {
  recovery_1_month: RecoveryRate;
  recovery_3_month: RecoveryRate;
  recovery_6_month: RecoveryRate;
  recovery_12_month: RecoveryRate;
  breakdown_by_type: Array<{
    type_code: string;
    recovery_1_month: number;
    recovery_3_month: number;
    recovery_6_month: number;
    recovery_12_month: number;
  }>;
  breakdown_by_carrier: Array<{
    carrier: string;
    recovery_1_month: number;
    recovery_3_month: number;
    recovery_6_month: number;
    recovery_12_month: number;
  }>;
}

// Trend data
export interface TrendDataPoint {
  period: string;
  charges: number;
  payments: number;
  adjustments: number;
  procedure_count: number;
  collection_rate: number;
}

// Procedure
export interface Procedure {
  id: number;
  procedure_id: string;
  chart_number: number | null;
  date_of_service: string;
  surgery_type: string | null;
  type_code: string | null;
  primary_carrier: string | null;
  secondary_carrier: string | null;
  facility_name: string | null;
  provider_profile: string | null;
  total_charges: number;
  total_payments: number;
  total_adjustments: number;
  collection_rate: number | null;
  status: string;
  days_to_first_payment: number | null;
}

export interface ProcedureListResponse {
  procedures: Procedure[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Patient
export interface PatientSummary {
  chart_number: number;
  procedure_count: number;
  total_charges: number;
  total_payments: number;
  collection_rate: number;
  first_visit: string | null;
  last_visit: string | null;
}

export interface PatientListResponse {
  patients: PatientSummary[];
  total: number;
  page: number;
  limit: number;
}

// Filter options
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterOptions {
  patients: FilterOption[];
  surgery_types: FilterOption[];
  carriers: FilterOption[];
  billing_categories: Array<{
    value: string;
    label: string;
    subcategories: string[];
  }>;
  date_range: {
    min_date: string | null;
    max_date: string | null;
  };
}

// Upload
export interface UploadResponse {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number | null;
  rows_imported: number;
  procedures_count: number;
  patients_count: number;
  upload_status: string;
  error_message: string | null;
  uploaded_at: string;
  processed_at: string | null;
}

export interface UploadSummary {
  upload_id: number;
  filename: string;
  rows_imported: number;
  procedures_count: number;
  patients_count: number;
  status: string;
  message: string;
}
