import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, Category } from '../../hooks/useCategories';
import { useAuthStore } from '../../store/auth-store';
import { PageHeader } from '../../components/ui/PageHeader';
import { ResponsiveDataTable, Column } from '../../components/ui/ResponsiveDataTable';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDeleteDialog } from '../../components/ui/ConfirmDeleteDialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

const categorySchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').toUpperCase(),
  name: z.string().min(1, 'Nama wajib diisi'),
  is_active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoriesPage() {
  const { data: categories, isLoading, error } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const user = useAuthStore((state) => state.user);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      is_active: true,
    },
  });

  const canEdit = user?.role === 'super_admin';

  const handleOpenCreate = () => {
    setEditingCategory(null);
    form.reset({ code: '', name: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({ code: category.code, name: category.name, is_active: category.is_active });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.category_id, data: values });
      } else {
        await createCategory.mutateAsync(values);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        form.setError('code', { message: err.response.data.detail });
      }
    }
  };

  const confirmDelete = async () => {
    if (categoryToDelete) {
      await deleteCategory.mutateAsync(categoryToDelete.category_id);
      setDeleteDialogOpen(false);
    }
  };

  const columns: Column<Category>[] = [
    { header: 'Kode', accessorKey: 'code' },
    { header: 'Nama Kategori', accessorKey: 'name' },
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
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg">
              <Edit2 className="h-4 w-4" />
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg">
              <Trash2 className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      ) : <span className="text-slate-500 text-sm">Hanya Baca</span>,
    },
  ];

  if (isLoading) return <LoadingState />;
  if (error) return <div className="text-red-500">Gagal memuat kategori.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategori"
        description="Kelola kategori barang (contoh: Marmer, Akrilik, Figur, Resin)."
        action={
          canEdit && (
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground min-h-[44px] shadow-md rounded-xl">
                <Plus className="mr-2 h-4 w-4" /> Tambah Kategori
              </Button>
            </motion.div>
          )
        }
      />

      {categories?.length === 0 ? (
        <EmptyState title="Kategori tidak ditemukan" description="Mulai dengan membuat kategori baru." />
      ) : (
        <ResponsiveDataTable data={categories || []} columns={columns} keyExtractor={(i) => i.category_id} />
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editingCategory ? 'Ubah Kategori' : 'Tambah Kategori'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode</Label>
              <Input
                id="code"
                {...form.register('code')}
                className="bg-slate-950 border-slate-800 uppercase text-white"
                placeholder="Contoh: MRM"
              />
              {form.formState.errors.code && <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Kategori</Label>
              <Input
                id="name"
                {...form.register('name')}
                className="bg-slate-950 border-slate-800 text-white"
                placeholder="Contoh: Marmer"
              />
              {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
            </div>
            
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="is_active" {...form.register('is_active')} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500" />
              <Label htmlFor="is_active">Aktif</Label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-slate-700 text-white bg-transparent hover:bg-slate-800 rounded-xl min-h-[44px]">Batal</Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending} className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-xl min-h-[44px]">
                  {editingCategory ? 'Simpan' : 'Tambah'}
                </Button>
              </motion.div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Kategori"
        description={`Apakah Anda yakin ingin menghapus kategori ${categoryToDelete?.name}?`}
        isDeleting={deleteCategory.isPending}
      />
    </div>
  );
}
