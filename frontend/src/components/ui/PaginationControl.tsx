import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export function PaginationControl({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationControlProps) {
  const [jumpPage, setJumpPage] = useState(currentPage.toString());

  // Sync jumpPage with currentPage if it changes externally
  useEffect(() => {
    setJumpPage(currentPage.toString());
  }, [currentPage]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      onPageChange(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let p = parseInt(jumpPage);
      if (isNaN(p) || p < 1) p = 1;
      if (p > totalPages) p = totalPages;
      setJumpPage(p.toString());
      handlePageChange(p);
    }
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 rounded-xl border border-border bg-card">
      <div className="text-sm text-muted-foreground font-medium">
        Menampilkan {startItem} - {endItem} dari {totalItems} barang
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Per halaman:</span>
          <select
            className="h-9 px-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              handlePageChange(1);
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-9 w-9 bg-background"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onBlur={() => setJumpPage(String(currentPage))}
              onKeyDown={handleJump}
              className="w-12 h-9 text-center bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">dari {totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-9 w-9 bg-background"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
