import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2 } from 'lucide-react';

import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch, Branch } from '../../hooks/useBranches';
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

const branchSchema = z.object({
  code: z.string().min(1, 'Code is required').toUpperCase(),
  name: z.string().min(1, 'Name is required'),
  location: z.string().nullable(),
  is_active: z.boolean(),
});

type BranchFormValues = z.infer<typeof branchSchema>;

export function BranchesPage() {
  const { data: branches, isLoading, error } = useBranches();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();
  const user = useAuthStore((state) => state.user);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: { code: '', name: '', location: '', is_active: true },
  });

  const canEdit = user?.role === 'super_admin';

  const handleOpenCreate = () => {
    setEditingBranch(null);
    form.reset({ code: '', name: '', location: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    form.reset({ code: branch.code, name: branch.name, location: branch.location || '', is_active: branch.is_active });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (branch: Branch) => {
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (values: BranchFormValues) => {
    try {
      const data = {
        code: values.code,
        name: values.name,
        is_active: values.is_active,
        location: values.location || null,
      };
      if (editingBranch) {
        await updateBranch.mutateAsync({ id: editingBranch.branch_id, data });
      } else {
        await createBranch.mutateAsync(data);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        form.setError('code', { message: err.response.data.detail });
      }
    }
  };

  const confirmDelete = async () => {
    if (branchToDelete) {
      await deleteBranch.mutateAsync(branchToDelete.branch_id);
      setDeleteDialogOpen(false);
    }
  };

  const columns: Column<Branch>[] = [
    { header: 'Code', accessorKey: 'code' },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Location', accessorKey: 'location' },
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
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"><Edit2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ) : <span className="text-slate-500 text-sm">Read Only</span>,
    },
  ];

  if (isLoading) return <LoadingState />;
  if (error) return <div className="text-red-500">Error loading branches.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Manage warehouse locations and retail branches."
        action={canEdit && <Button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-950 min-h-[44px]"><Plus className="mr-2 h-4 w-4" /> Add Branch</Button>}
      />

      {branches?.length === 0 ? (
        <EmptyState title="No branches found" description="Get started by creating a new branch." />
      ) : (
        <ResponsiveDataTable data={branches || []} columns={columns} keyExtractor={(i) => i.branch_id} />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800">
          <DialogHeader><DialogTitle className="text-white">{editingBranch ? 'Edit Branch' : 'Create Branch'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2"><Label htmlFor="code">Code</Label><Input id="code" {...form.register('code')} className="bg-slate-950 border-slate-800 uppercase" />{form.formState.errors.code && <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>}</div>
            <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" {...form.register('name')} className="bg-slate-950 border-slate-800" />{form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}</div>
            <div className="space-y-2"><Label htmlFor="location">Location</Label><Input id="location" {...form.register('location')} className="bg-slate-950 border-slate-800" /></div>
            <div className="flex items-center gap-2 mt-4"><input type="checkbox" id="is_active" {...form.register('is_active')} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500" /><Label htmlFor="is_active">Active</Label></div>
            <div className="flex justify-end gap-3 mt-6"><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-slate-700">Cancel</Button><Button type="submit" disabled={createBranch.isPending || updateBranch.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{editingBranch ? 'Save Changes' : 'Create'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Delete Branch" description={`Are you sure you want to delete ${branchToDelete?.name}?`} isDeleting={deleteBranch.isPending} />
    </div>
  );
}
