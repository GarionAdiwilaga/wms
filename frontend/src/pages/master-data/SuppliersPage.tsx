import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2 } from 'lucide-react';

import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, Supplier } from '../../hooks/useSuppliers';
import { useAuthStore } from '../../store/auth-store';
import { PageHeader } from '../../components/ui/PageHeader';
import { ResponsiveDataTable, Column } from '../../components/ui/ResponsiveDataTable';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDeleteDialog } from '../../components/ui/ConfirmDeleteDialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const supplierSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').toUpperCase(),
  name: z.string().min(1, 'Nama wajib diisi'),
  contact_info: z.string().nullable(),
  is_active: z.boolean(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export function SuppliersPage() {
  const { data: suppliers, isLoading, error } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const user = useAuthStore((state) => state.user);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { code: '', name: '', contact_info: '', is_active: true },
  });

  const canEdit = user?.role === 'super_admin';

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    form.reset({ code: '', name: '', contact_info: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.reset({ code: supplier.code, name: supplier.name, contact_info: supplier.contact_info || '', is_active: supplier.is_active });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (values: SupplierFormValues) => {
    try {
      const data = {
        code: values.code,
        name: values.name,
        is_active: values.is_active,
        contact_info: values.contact_info || null,
      };
      if (editingSupplier) {
        await updateSupplier.mutateAsync({ id: editingSupplier.supplier_id, data });
      } else {
        await createSupplier.mutateAsync(data);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        form.setError('code', { message: err.response.data.detail });
      }
    }
  };

  const confirmDelete = async () => {
    if (supplierToDelete) {
      await deleteSupplier.mutateAsync(supplierToDelete.supplier_id);
      setDeleteDialogOpen(false);
    }
  };

  const columns: Column<Supplier>[] = [
    { header: 'Kode', accessorKey: 'code' },
    { header: 'Nama Supplier', accessorKey: 'name' },
    { header: 'Info Kontak', accessorKey: 'contact_info' },
    {
      header: 'Status',
      cell: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
          {item.is_active ? 'Aktif' : 'Non-aktif'}
        </span>
      ),
    },
    {
      header: 'Aksi',
      cell: (item) => canEdit ? (
        <div className="flex gap-2 justify-end md:justify-start">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"><Edit2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ) : <span className="text-slate-500 text-sm">Hanya Baca</span>,
    },
  ];

  if (isLoading) return <LoadingState />;
  if (error) return <div className="text-red-500">Gagal memuat supplier.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier"
        description="Kelola supplier dan brand komponen trophy."
        action={canEdit && <Button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-950 min-h-[44px]"><Plus className="mr-2 h-4 w-4" /> Tambah Supplier</Button>}
      />

      {suppliers?.length === 0 ? (
        <EmptyState title="Supplier tidak ditemukan" description="Mulai dengan membuat supplier baru." />
      ) : (
        <ResponsiveDataTable data={suppliers || []} columns={columns} keyExtractor={(i) => i.supplier_id} />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader><DialogTitle className="text-white">{editingSupplier ? 'Ubah Supplier' : 'Tambah Supplier'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2"><Label htmlFor="code">Kode</Label><Input id="code" placeholder="Contoh: ONX" {...form.register('code')} className="bg-slate-950 border-slate-800 uppercase text-white" />{form.formState.errors.code && <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>}</div>
            <div className="space-y-2"><Label htmlFor="name">Nama Supplier</Label><Input id="name" placeholder="Contoh: ONIX Trophy" {...form.register('name')} className="bg-slate-950 border-slate-800 text-white" />{form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}</div>
            <div className="space-y-2"><Label htmlFor="contact_info">Info Kontak</Label><Input id="contact_info" placeholder="Contoh: WhatsApp / Alamat" {...form.register('contact_info')} className="bg-slate-950 border-slate-800 text-white" /></div>
            <div className="flex items-center gap-2 mt-4"><input type="checkbox" id="is_active" {...form.register('is_active')} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500" /><Label htmlFor="is_active">Aktif</Label></div>
            <div className="flex justify-end gap-3 mt-6"><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-slate-700 text-white bg-transparent hover:bg-slate-800">Batal</Button><Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">{editingSupplier ? 'Simpan' : 'Tambah'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Hapus Supplier" description={`Apakah Anda yakin ingin menghapus supplier ${supplierToDelete?.name}?`} isDeleting={deleteSupplier.isPending} />
    </div>
  );
}
