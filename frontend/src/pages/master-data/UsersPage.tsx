import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(6, 'Minimal 6 karakter').optional().or(z.literal('')),
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  role: z.enum(['super_admin', 'branch_head', 'warehouse_staff']),
  branch_id: z.number().nullable(),
  is_active: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.role !== 'super_admin' && !data.branch_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cabang wajib dipilih untuk staf/kepala cabang', path: ['branch_id'] });
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
      const submitData = { ...values };
      if (!submitData.password) delete submitData.password;
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
    { header: 'Nama Lengkap', accessorKey: 'full_name' },
    {
      header: 'Peran',
      cell: (item) => {
        if (item.role === 'super_admin') return 'Super Admin';
        if (item.role === 'branch_head') return 'Kepala Cabang';
        return 'Staf Gudang';
      },
    },
    {
      header: 'Cabang',
      cell: (item) => {
        if (item.role === 'super_admin') return <span className="text-slate-500">Semua Cabang</span>;
        const branch = branches?.find((b) => b.branch_id === item.branch_id);
        return branch ? branch.name : <span className="text-red-400">Cabang Tidak Ditemukan</span>;
      },
    },
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
            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg"><Edit2 className="h-4 w-4" /></Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} disabled={item.user_id === currentUser?.user_id} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg"><Trash2 className="h-4 w-4" /></Button>
          </motion.div>
        </div>
      ) : <span className="text-slate-500 text-sm">Hanya Baca</span>,
    },
  ];

  if (isLoading) return <LoadingState />;
  if (error) return <div className="text-red-500">Gagal memuat pengguna.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna"
        description="Kelola hak akses sistem dan tugaskan staf ke cabang tertentu."
        action={canEdit && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground min-h-[44px] shadow-md rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna
            </Button>
          </motion.div>
        )}
      />

      {users?.length === 0 ? (
        <EmptyState title="Pengguna tidak ditemukan" description="Mulai dengan membuat pengguna baru." />
      ) : (
        <ResponsiveDataTable data={users || []} columns={columns} keyExtractor={(i) => i.user_id} />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-white">{editingUser ? 'Ubah Pengguna' : 'Tambah Pengguna'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" placeholder="Masukkan username" {...form.register('username')} className="bg-slate-950 border-slate-800 text-white" />{form.formState.errors.username && <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>}</div>
            <div className="space-y-2"><Label htmlFor="full_name">Nama Lengkap</Label><Input id="full_name" placeholder="Masukkan nama lengkap" {...form.register('full_name')} className="bg-slate-950 border-slate-800 text-white" />{form.formState.errors.full_name && <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>}</div>
            
            <div className="space-y-2"><Label htmlFor="password">{editingUser ? 'Kata Sandi Baru (kosongkan jika tidak diubah)' : 'Kata Sandi'}</Label><Input id="password" type="password" placeholder={editingUser ? 'Masukkan sandi baru jika ingin diubah' : 'Masukkan kata sandi'} {...form.register('password')} className="bg-slate-950 border-slate-800 text-white" />{form.formState.errors.password && <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>}</div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Peran / Hak Akses</Label>
              <select id="role" {...form.register('role')} className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent">
                <option value="warehouse_staff">Staf Gudang</option>
                <option value="branch_head">Kepala Cabang</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            {form.watch('role') !== 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="branch_id">Cabang Tugas</Label>
                <select id="branch_id" {...form.register('branch_id', { valueAsNumber: true })} className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent">
                  <option value={NaN}>Pilih Cabang...</option>
                  {branches?.filter(b => b.is_active).map(b => (
                    <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                  ))}
                </select>
                {form.formState.errors.branch_id && <p className="text-sm text-red-500">{form.formState.errors.branch_id.message}</p>}
              </div>
            )}

            <div className="flex items-center gap-2 mt-4"><input type="checkbox" id="is_active" {...form.register('is_active')} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500" /><Label htmlFor="is_active">Aktif</Label></div>
            <div className="flex justify-end gap-3 mt-6">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-slate-700 text-white bg-transparent hover:bg-slate-800 rounded-xl min-h-[44px]">Batal</Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button type="submit" disabled={createUser.isPending || updateUser.isPending} className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-xl min-h-[44px]">
                  {editingUser ? 'Simpan' : 'Tambah'}
                </Button>
              </motion.div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Hapus Pengguna" description={`Apakah Anda yakin ingin menghapus pengguna ${userToDelete?.username}?`} isDeleting={deleteUser.isPending} />
    </div>
  );
}
