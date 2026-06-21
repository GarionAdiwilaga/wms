import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2 } from 'lucide-react';

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
  code: z.string().min(1, 'Code is required').toUpperCase(),
  name: z.string().min(1, 'Name is required'),
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
    { header: 'Code', accessorKey: 'code' },
    { header: 'Name', accessorKey: 'name' },
    {
      header: 'Status',
      cell: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (item) => canEdit ? (
        <div className="flex gap-2 justify-end md:justify-start">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : <span className="text-slate-500 text-sm">Read Only</span>,
    },
  ];

  if (isLoading) return <LoadingState />;
  if (error) return <div className="text-red-500">Error loading categories.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage item categories (e.g. Spareparts, Stickers, Raw Materials)."
        action={
          canEdit && (
            <Button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-950 min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          )
        }
      />

      {categories?.length === 0 ? (
        <EmptyState title="No categories found" description="Get started by creating a new category." />
      ) : (
        <ResponsiveDataTable data={categories || []} columns={columns} keyExtractor={(i) => i.category_id} />
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                {...form.register('code')}
                className="bg-slate-950 border-slate-800 uppercase"
                placeholder="e.g. SPR"
              />
              {form.formState.errors.code && <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...form.register('name')}
                className="bg-slate-950 border-slate-800"
                placeholder="e.g. Spareparts"
              />
              {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
            </div>
            
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="is_active" {...form.register('is_active')} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500" />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-slate-700">Cancel</Button>
              <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950">
                {editingCategory ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Category"
        description={`Are you sure you want to delete ${categoryToDelete?.name}? This action cannot be undone.`}
        isDeleting={deleteCategory.isPending}
      />
    </div>
  );
}
