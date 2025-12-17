'use client';

import { useQuery } from '@tanstack/react-query';
import { anomaliesApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function AnomaliesPage() {
  const { data: anomalies, isLoading } = useQuery({
    queryKey: ['anomalies'],
    queryFn: anomaliesApi.getAll,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading anomalies...</p>
      </div>
    );
  }

  const paymentExceeds = anomalies?.payment_exceeds_charge;
  const missingPayments = anomalies?.missing_payments;
  const duplicates = anomalies?.duplicate_procedures;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Anomalies</h1>
        <p className="text-gray-500">
          Detect data quality issues in billing data
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`card ${paymentExceeds?.count > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${paymentExceeds?.count > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <svg className={`w-6 h-6 ${paymentExceeds?.count > 0 ? 'text-red-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Payments Exceed Charges</p>
              <p className={`text-2xl font-bold ${paymentExceeds?.count > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {paymentExceeds?.count || 0}
              </p>
              {paymentExceeds?.count > 0 && (
                <p className="text-sm text-red-600">
                  Overpayment: {formatCurrency(paymentExceeds.total_overpayment)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={`card ${missingPayments?.count > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${missingPayments?.count > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <svg className={`w-6 h-6 ${missingPayments?.count > 0 ? 'text-yellow-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Missing Payments (&gt;6mo)</p>
              <p className={`text-2xl font-bold ${missingPayments?.count > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                {missingPayments?.count || 0}
              </p>
              {missingPayments?.count > 0 && (
                <p className="text-sm text-yellow-600">
                  Uncollected: {formatCurrency(missingPayments.total_uncollected)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={`card ${duplicates?.count > 0 ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${duplicates?.count > 0 ? 'bg-blue-100' : 'bg-green-100'}`}>
              <svg className={`w-6 h-6 ${duplicates?.count > 0 ? 'text-blue-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Duplicate Procedures</p>
              <p className={`text-2xl font-bold ${duplicates?.count > 0 ? 'text-blue-700' : 'text-green-700'}`}>
                {duplicates?.count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Exceeds Charge - Detailed Table */}
      {paymentExceeds?.count > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">
              Payments Exceeding Charges ({paymentExceeds.count})
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            These procedures have received more in payments than was billed. This indicates a data quality issue - payments should never exceed charges.
          </p>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Procedure ID</th>
                  <th>Patient</th>
                  <th>DOS</th>
                  <th>Type</th>
                  <th>Carrier</th>
                  <th className="text-right">Charges</th>
                  <th className="text-right">Payments</th>
                  <th className="text-right">Overpayment</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {paymentExceeds.procedures.map((proc: any) => (
                  <tr key={proc.procedure_id}>
                    <td className="font-mono text-sm">{proc.procedure_id}</td>
                    <td>{proc.chart_number}</td>
                    <td>{proc.date_of_service}</td>
                    <td>{proc.type_code}</td>
                    <td className="max-w-[200px] truncate" title={proc.primary_carrier}>
                      {proc.primary_carrier}
                    </td>
                    <td className="text-right">{formatCurrency(proc.total_charges)}</td>
                    <td className="text-right text-red-600 font-medium">
                      {formatCurrency(proc.total_payments)}
                    </td>
                    <td className="text-right text-red-600 font-bold">
                      +{formatCurrency(proc.overpayment)}
                    </td>
                    <td className="text-right text-red-600">
                      +{proc.overpayment_percent.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Missing Payments - Detailed Table */}
      {missingPayments?.count > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">
              Missing Payments ({missingPayments.count})
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            These procedures are over 6 months old but have received zero payments. They may need follow-up.
          </p>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Procedure ID</th>
                  <th>Patient</th>
                  <th>DOS</th>
                  <th>Type</th>
                  <th>Carrier</th>
                  <th className="text-right">Charges</th>
                  <th className="text-right">Days Since DOS</th>
                </tr>
              </thead>
              <tbody>
                {missingPayments.procedures.map((proc: any) => (
                  <tr key={proc.procedure_id}>
                    <td className="font-mono text-sm">{proc.procedure_id}</td>
                    <td>{proc.chart_number}</td>
                    <td>{proc.date_of_service}</td>
                    <td>{proc.type_code}</td>
                    <td className="max-w-[200px] truncate" title={proc.primary_carrier}>
                      {proc.primary_carrier}
                    </td>
                    <td className="text-right">{formatCurrency(proc.total_charges)}</td>
                    <td className="text-right text-yellow-600 font-medium">
                      {proc.days_since_dos} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Anomalies */}
      {anomalies?.total_anomalies === 0 && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-green-800">No Anomalies Detected</h3>
              <p className="text-green-700">Your billing data looks clean!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
