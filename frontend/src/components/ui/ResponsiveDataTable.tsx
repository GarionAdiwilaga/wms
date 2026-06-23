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
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border hover:bg-transparent">
              {columns.map((col, index) => (
                <TableHead key={index} className="text-muted-foreground font-semibold h-12">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow
                key={keyExtractor(item)}
                className="border-border hover:bg-muted/30 transition-colors"
              >
                {columns.map((col, colIndex) => (
                  <TableCell key={colIndex} className="py-3.5 px-4 text-foreground">
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
          <Card key={keyExtractor(item)} className="bg-card border-border shadow-lg rounded-xl">
            <CardContent className="p-4">
              {mobileCardContent ? (
                mobileCardContent(item)
              ) : (
                <div className="space-y-2">
                  {columns.map((col, index) => (
                    <div key={index} className="flex justify-between items-start gap-4">
                      <span className="text-xs font-medium text-muted-foreground">{col.header}</span>
                      <div className="text-sm text-right text-foreground">
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
