import axios from 'axios';
import type {
  DashboardMetrics,
  SurgeryTypeMetrics,
  InsuranceMetrics,
  RecoveryAnalysis,
  TrendDataPoint,
  ProcedureListResponse,
  PatientListResponse,
  FilterOptions,
  UploadSummary,
  DateRangeFilter,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://findata.iseyes.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to build query params
const buildParams = (filters: DateRangeFilter) => {
  const params: Record<string, string> = {};
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  if (filters.patientId) params.patient_id = String(filters.patientId);
  if (filters.typeCode) params.type_code = filters.typeCode;
  if (filters.carrier) params.carrier = filters.carrier;
  if (filters.billingCategory) params.billing_category = filters.billingCategory;
  return params;
};

// Upload API
export const uploadApi = {
  upload: async (file: File): Promise<UploadSummary> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Analytics API
export const analyticsApi = {
  getDashboard: async (filters: DateRangeFilter = {}): Promise<DashboardMetrics> => {
    const response = await api.get('/api/analytics/dashboard', {
      params: buildParams(filters),
    });
    return response.data;
  },

  getBySurgeryType: async (filters: DateRangeFilter = {}): Promise<SurgeryTypeMetrics[]> => {
    const response = await api.get('/api/analytics/by-surgery-type', {
      params: buildParams(filters),
    });
    return response.data;
  },

  getByInsurance: async (filters: DateRangeFilter = {}): Promise<InsuranceMetrics[]> => {
    const response = await api.get('/api/analytics/by-insurance', {
      params: buildParams(filters),
    });
    return response.data;
  },

  getRecovery: async (filters: DateRangeFilter = {}): Promise<RecoveryAnalysis> => {
    const response = await api.get('/api/analytics/recovery', {
      params: buildParams(filters),
    });
    return response.data;
  },

  getExpectedRecovery: async (typeCode?: string, carrier?: string) => {
    const response = await api.get('/api/analytics/expected-recovery', {
      params: { type_code: typeCode, carrier },
    });
    return response.data;
  },

  getTrends: async (
    filters: DateRangeFilter = {},
    granularity: 'day' | 'week' | 'month' = 'month'
  ): Promise<TrendDataPoint[]> => {
    const response = await api.get('/api/analytics/trends', {
      params: { ...buildParams(filters), granularity },
    });
    return response.data;
  },

  getDaysToPayment: async (filters: DateRangeFilter = {}) => {
    const response = await api.get('/api/analytics/days-to-payment', {
      params: buildParams(filters),
    });
    return response.data;
  },

  getAging: async (typeCode?: string, carrier?: string) => {
    const response = await api.get('/api/analytics/aging', {
      params: { type_code: typeCode, carrier },
    });
    return response.data;
  },

  getSurgeryInsuranceMatrix: async (filters: DateRangeFilter = {}) => {
    const response = await api.get('/api/analytics/surgery-insurance-matrix', {
      params: buildParams(filters),
    });
    return response.data;
  },

  getPatientSurgeryInsuranceMatrix: async (filters: DateRangeFilter = {}) => {
    const response = await api.get('/api/analytics/patient-surgery-insurance-matrix', {
      params: buildParams(filters),
    });
    return response.data;
  },

  getInsuranceSurgeryPatientMatrix: async (filters: DateRangeFilter = {}) => {
    const response = await api.get('/api/analytics/insurance-surgery-patient-matrix', {
      params: buildParams(filters),
    });
    return response.data;
  },

  getDynamicMatrix: async (
    groupBy: string[],
    filters: DateRangeFilter = {}
  ) => {
    const params: Record<string, string> = {};
    if (groupBy[0]) params.group1 = groupBy[0];
    if (groupBy[1]) params.group2 = groupBy[1];
    if (groupBy[2]) params.group3 = groupBy[2];
    if (groupBy[3]) params.group4 = groupBy[3];
    if (filters.dateFrom) params.date_from = filters.dateFrom;
    if (filters.dateTo) params.date_to = filters.dateTo;

    const response = await api.get('/api/analytics/dynamic-matrix', { params });
    return response.data;
  },
};

// Procedures API
export const proceduresApi = {
  getList: async (
    filters: DateRangeFilter = {},
    page = 1,
    limit = 20,
    sortBy = 'date_of_service',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ProcedureListResponse> => {
    const response = await api.get('/api/procedures/', {
      params: {
        ...buildParams(filters),
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      },
    });
    return response.data;
  },

  getDetail: async (procedureId: string) => {
    const response = await api.get(`/api/procedures/${procedureId}`);
    return response.data;
  },

  getTimeline: async (procedureId: string) => {
    const response = await api.get(`/api/procedures/${procedureId}/timeline`);
    return response.data;
  },
};

// Patients API
export const patientsApi = {
  getList: async (page = 1, limit = 20, search?: string): Promise<PatientListResponse> => {
    const response = await api.get('/api/patients/', {
      params: { page, limit, search },
    });
    return response.data;
  },

  getDetail: async (chartNumber: number) => {
    const response = await api.get(`/api/patients/${chartNumber}`);
    return response.data;
  },

  getProcedures: async (chartNumber: number) => {
    const response = await api.get(`/api/patients/${chartNumber}/procedures`);
    return response.data;
  },

  getTimeline: async (chartNumber: number) => {
    const response = await api.get(`/api/patients/${chartNumber}/timeline`);
    return response.data;
  },
};

// Anomalies API
export const anomaliesApi = {
  getAll: async () => {
    const response = await api.get('/api/anomalies/');
    return response.data;
  },

  getPaymentExceedsCharge: async () => {
    const response = await api.get('/api/anomalies/payment-exceeds-charge');
    return response.data;
  },

  getMissingPayments: async (daysThreshold = 180) => {
    const response = await api.get('/api/anomalies/missing-payments', {
      params: { days_threshold: daysThreshold },
    });
    return response.data;
  },

  getDuplicates: async () => {
    const response = await api.get('/api/anomalies/duplicates');
    return response.data;
  },

  getByCarrier: async () => {
    const response = await api.get('/api/anomalies/by-carrier');
    return response.data;
  },

  getByPatient: async (limit = 20) => {
    const response = await api.get('/api/anomalies/by-patient', {
      params: { limit },
    });
    return response.data;
  },
};

// Filters API
export const filtersApi = {
  getAll: async (): Promise<FilterOptions> => {
    const response = await api.get('/api/filters/all');
    return response.data;
  },

  getPatients: async () => {
    const response = await api.get('/api/filters/patients');
    return response.data;
  },

  getSurgeryTypes: async () => {
    const response = await api.get('/api/filters/surgery-types');
    return response.data;
  },

  getCarriers: async () => {
    const response = await api.get('/api/filters/carriers');
    return response.data;
  },

  getDateRange: async () => {
    const response = await api.get('/api/filters/date-range');
    return response.data;
  },
};

export default api;
