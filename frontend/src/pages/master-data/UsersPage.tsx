import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2 } from 'lucide-react';

import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, User } from '../../hooks/useUsers';
import { useBranches } from '../../hooks/useBranches';
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

const userSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Minimum 6 characters').optional().or(z.literal('')),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['super_admin', 'branch_head', 'warehouse_staff']),
  branch_id: z.number().nullable(),
  is_active: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.role !== 'super_admin' && !data.branch_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Branch is required for non-admins', path: ['branch_id'] });
  }
});

type UserFormValues = z.infer<typeof userSchema>;

export function UsersPage() {
  const { data: users, isLoading, error } = useUsers();
  const { data: branches } = useBranches();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const currentUser = useAuthStore((state) => state.user);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { username: '', password: '', full_name: '', role: 'warehouse_staff', branch_id: null, is_active: true },
  });

  const canEdit = currentUser?.role === 'super_admin';

  const handleOpenCreate = () => {
    setEditingUser(null);
    form.reset({ username: '', password: '', full_name: '', role: 'warehouse_staff', branch_id: null, is_active: true });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    form.reset({ username: user.username, password: '', full_name: user.full_name, role: user.role, branch_id: user.branch_id, is_active: user.is_active });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (values: UserFormValues) => {
    try {
      // Clean up empty password if updating
      const submitData = { ...values };
      if (!submitData.password) delete submitData.password;
      
      // Clean up branch_id if super_admin
      if (submitData.role === 'super_admin') submitData.branch_id = null;

      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.user_id, data: submitData });
      } else {
        await createUser.mutateAsync(submitData as any);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        form.setError('username', { message: err.response.data.detail });
      }
    }
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      await deleteUser.mutateAsync(userToDelete.user_id);
      setDeleteDialogOpen(false);
    }
  };

  const columns: Column<User>[] = [
    { header: 'Username', accessorKey: 'username' },
    { header: 'Full Name', accessorKey: 'full_name' },
    {
      header: 'Role',
      cell: (item) => <span className="capitalize">{item.role.replace('_', ' ')}</span>,
    },
    {
      header: 'Branch',
      cell: (item) => {
        if (item.role === 'super_admin') return <span className="text-slate-500">All Branches</span>;
        const branch = branches?.find((b) => b.branch_id === item.branch_id);
        return branch ? branch.name : <span className="text-red-400">Missing Branch</span>;
      },
    },
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
          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} disabled={item.user_id === currentUser?.user_id} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ) : <span className="text-slate-500 text-sm">Read Only</span>,
    },
  ];

  if (isLoading) return <LoadingState />;
  if (error) return <div className="text-red-500">Error loading users.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage system access and assign staff to branches."
        action={canEdit && <Button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-950 min-h-[44px]"><Plus className="mr-2 h-4 w-4" /> Add User</Button>}
      />

      {users?.length === 0 ? (
        <EmptyState title="No users found" description="Get started by creating a new user." />
      ) : (
        <ResponsiveDataTable data={users || []} columns={columns} keyExtractor={(i) => i.user_id} />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-white">{editingUser ? 'Edit User' : 'Create User'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" {...form.register('username')} className="bg-slate-950 border-slate-800" />{form.formState.errors.username && <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>}</div>
            <div className="space-y-2"><Label htmlFor="full_name">Full Name</Label><Input id="full_name" {...form.register('full_name')} className="bg-slate-950 border-slate-800" />{form.formState.errors.full_name && <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>}</div>
            
            <div className="space-y-2"><Label htmlFor="password">{editingUser ? 'New Password (leave empty to keep)' : 'Password'}</Label><Input id="password" type="password" {...form.register('password')} className="bg-slate-950 border-slate-800" />{form.formState.errors.password && <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>}</div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select {...form.register('role')} className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent">
                <option value="warehouse_staff">Warehouse Staff</option>
                <option value="branch_head">Branch Head</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            {form.watch('role') !== 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="branch_id">Branch</Label>
                <select {...form.register('branch_id', { valueAsNumber: true })} className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent">
                  <option value={NaN}>Select Branch...</option>
                  {branches?.filter(b => b.is_active).map(b => (
                    <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                  ))}
                </select>
                {form.formState.errors.branch_id && <p className="text-sm text-red-500">{form.formState.errors.branch_id.message}</p>}
              </div>
            )}

            <div className="flex items-center gap-2 mt-4"><input type="checkbox" id="is_active" {...form.register('is_active')} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500" /><Label htmlFor="is_active">Active</Label></div>
            <div className="flex justify-end gap-3 mt-6"><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-slate-700">Cancel</Button><Button type="submit" disabled={createUser.isPending || updateUser.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950">{editingUser ? 'Save Changes' : 'Create'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Delete User" description={`Are you sure you want to delete ${userToDelete?.username}?`} isDeleting={deleteUser.isPending} />
    </div>
  );
}
