import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ReportColumn<T> {
  header: string;
  cell?: (row: T) => React.ReactNode;
  accessorKey?: keyof T | string;
  align?: 'left' | 'right' | 'center';
}

interface ReportTableProps<T> {
  data: T[];
  columns: ReportColumn<T>[];
  keyExtractor: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ReportTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'Tidak ada data laporan ditemukan.'
}: ReportTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
        <span className="text-sm font-medium">Memuat data laporan...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-slate-400 shadow-md">
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card List View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            className="bg-card border border-border rounded-xl p-4 shadow-md space-y-2.5 hover:border-slate-800 transition-colors"
          >
            {columns.map((col, idx) => {
              const val = col.cell
                ? col.cell(row)
                : col.accessorKey
                ? (row[col.accessorKey as keyof T] as any)
                : null;

              // Action or primary field can be rendered differently, but keeping it uniform works great.
              // Skip "Aksi" column header mapping if not desired or show it.
              return (
                <div key={idx} className="flex justify-between items-start gap-4 border-b border-slate-850/50 pb-2 last:border-b-0 last:pb-0">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                    {col.header}
                  </span>
                  <div className={`text-sm font-medium text-white max-w-[70%] text-right break-words`}>
                    {val}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Desktop/Tablet Table View */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse text-slate-350">
            <thead className="bg-slate-900/60 text-slate-300 font-semibold border-b border-slate-850">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {data.map((row) => (
                <tr key={keyExtractor(row)} className="hover:bg-slate-900/30 transition-colors">
                  {columns.map((col, idx) => {
                    const val = col.cell
                      ? col.cell(row)
                      : col.accessorKey
                      ? (row[col.accessorKey as keyof T] as any)
                      : null;

                    return (
                      <td
                        key={idx}
                        className={`px-4 py-3.5 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        <div className="text-white font-medium">{val}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
