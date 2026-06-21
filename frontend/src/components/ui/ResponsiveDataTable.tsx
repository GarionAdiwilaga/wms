import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { Card, CardContent } from './card';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
}

interface ResponsiveDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  mobileCardContent?: (item: T) => ReactNode;
}

export function ResponsiveDataTable<T>({
  data,
  columns,
  keyExtractor,
  mobileCardContent,
}: ResponsiveDataTableProps<T>) {
  if (data.length === 0) {
    return null; // Handled by EmptyState at the page level
  }

  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden md:block rounded-md border border-slate-800 bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-950">
            <TableRow className="border-slate-800 hover:bg-slate-950">
              {columns.map((col, index) => (
                <TableHead key={index} className="text-slate-400 font-semibold h-12">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow
                key={keyExtractor(item)}
                className="border-slate-800 hover:bg-slate-800/50 transition-colors"
              >
                {columns.map((col, colIndex) => (
                  <TableCell key={colIndex} className="py-3 px-4">
                    {col.cell
                      ? col.cell(item)
                      : col.accessorKey
                      ? (item[col.accessorKey] as ReactNode)
                      : null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.map((item) => (
          <Card key={keyExtractor(item)} className="bg-slate-900 border-slate-800 shadow-sm">
            <CardContent className="p-4">
              {mobileCardContent ? (
                mobileCardContent(item)
              ) : (
                <div className="space-y-2">
                  {columns.map((col, index) => (
                    <div key={index} className="flex justify-between items-start gap-4">
                      <span className="text-xs font-medium text-slate-500">{col.header}</span>
                      <div className="text-sm text-right text-slate-200">
                        {col.cell
                          ? col.cell(item)
                          : col.accessorKey
                          ? (item[col.accessorKey] as ReactNode)
                          : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
