'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadApi } from '@/lib/api';
import type { UploadSummary } from '@/types';

export default function UploadPage() {
  const queryClient = useQueryClient();
  const [uploadResult, setUploadResult] = useState<UploadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadApi.upload,
    onSuccess: (data) => {
      setUploadResult(data);
      setError(null);
      // Invalidate analytics queries to reflect new data
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['filterOptions'] });
      queryClient.invalidateQueries({ queryKey: ['dynamicMatrix'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      setUploadResult(null);
    },
  });

  // Dropzone config
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setError(null);
        setUploadResult(null);
        uploadMutation.mutate(acceptedFiles[0]);
      }
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Data</h1>
        <p className="text-gray-500">
          Upload your Excel file with the surgery billing data
        </p>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`card border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-12">
          <svg
            className="w-12 h-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {uploadMutation.isPending ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Processing file...</p>
            </div>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag & drop your Excel file here'}
              </p>
              <p className="text-sm text-gray-500 mt-1">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">
                Supported formats: .xlsx, .xls
              </p>
            </>
          )}
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-green-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-green-800">Upload Successful</h3>
              <p className="text-green-700 mt-1">{uploadResult.message}</p>
              <div className="flex gap-4 mt-2 text-sm text-green-600">
                <span>{uploadResult.rows_imported} rows</span>
                <span>{uploadResult.procedures_count} procedures</span>
                <span>{uploadResult.patients_count} patients</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-red-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-red-800">Upload Failed</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">File Requirements</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Excel file (.xlsx or .xls)</li>
          <li>Must contain a sheet named &quot;result&quot;</li>
          <li>Required columns: Procedure_ID, Date of Service</li>
          <li>
            Recommended columns: Charges, Total Payments, Type_Code, Visit - Primary
            Carrier
          </li>
        </ul>
      </div>
    </div>
  );
}
