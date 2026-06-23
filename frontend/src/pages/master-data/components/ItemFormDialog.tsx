import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { useCategories } from '../../../hooks/useCategories';
import { useSuppliers } from '../../../hooks/useSuppliers';
import { useUOMs } from '../../../hooks/useUOM';
import { 
  Item, 
  useCreateItem, 
  useUpdateItem, 
  useUploadItemImage, 
  useDeactivateItem 
} from '../../../hooks/useItems';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { motion } from 'framer-motion';

const itemSchema = z.object({
  name: z.string().min(1, 'Nama barang wajib diisi'),
  description: z.string().optional(),
  category_id: z.number().min(1, 'Kategori wajib dipilih'),
  supplier_id: z.number().min(1, 'Supplier/Merk wajib dipilih'),
  manual_code: z.string().min(1, 'Kode manual wajib diisi').toUpperCase(),
  minimum_stock: z.number().min(0, 'Stok minimal tidak boleh negatif'),
  is_active: z.boolean(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onSuccess: () => void;
}

export function ItemFormDialog({ open, onOpenChange, item, onSuccess }: ItemFormDialogProps) {
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { data: uoms } = useUOMs();
  
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const uploadImage = useUploadItemImage();
  const deactivateItem = useDeactivateItem();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEdit = !!item;

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      description: '',
      category_id: 0,
      supplier_id: 0,
      manual_code: '',
      minimum_stock: 0,
      is_active: true,
    },
  });

  // Watch fields for item code preview
  const watchedCategoryId = form.watch('category_id');
  const watchedSupplierId = form.watch('supplier_id');
  const watchedManualCode = form.watch('manual_code');
  const [codePreview, setCodePreview] = useState('');

  // Reset form when dialog opens/item changes
  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setImageFile(null);
      setImagePreview(item?.image_url || null);

      if (item) {
        form.reset({
          name: item.name,
          description: item.description || '',
          category_id: item.category_id,
          supplier_id: item.supplier_id,
          manual_code: item.item_code.split('-')[2] || '',
          minimum_stock: item.minimum_stock,
          is_active: item.is_active,
        });
        setCodePreview(item.item_code);
      } else {
        form.reset({
          name: '',
          description: '',
          category_id: 0,
          supplier_id: 0,
          manual_code: '',
          minimum_stock: 0,
          is_active: true,
        });
        setCodePreview('');
      }
    }
  }, [open, item, form]);

  // Update item code preview
  useEffect(() => {
    if (isEdit || !categories || !suppliers) return;

    const cat = categories.find(c => c.category_id === Number(watchedCategoryId));
    const sup = suppliers.find(s => s.supplier_id === Number(watchedSupplierId));
    
    const catPart = cat ? cat.code : '___';
    const supPart = sup ? sup.code : '___';
    const manPart = watchedManualCode ? watchedManualCode.trim().toUpperCase() : '___';

    setCodePreview(`${catPart}-${supPart}-${manPart}`);
  }, [watchedCategoryId, watchedSupplierId, watchedManualCode, categories, suppliers, isEdit]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const onSubmit = async (values: ItemFormValues) => {
    setErrorMsg(null);

    // Resolve PCS UOM dynamically
    const pcsUom = uoms?.find(u => u.code.toUpperCase() === 'PCS' || u.name.toUpperCase() === 'PCS');
    if (!pcsUom) {
      setErrorMsg('UOM "PCS" tidak ditemukan di sistem. Harap hubungi Admin.');
      return;
    }

    try {
      let savedItem: Item;

      if (isEdit && item) {
        // Enforce identity fields removal from payload
        savedItem = await updateItem.mutateAsync({
          id: item.item_id,
          data: {
            name: values.name,
            description: values.description || null,
            minimum_stock: values.minimum_stock,
          }
        });

        // Handle is_active mismatch if deactivated
        if (item.is_active && !values.is_active) {
          await deactivateItem.mutateAsync(item.item_id);
        }
      } else {
        // Create new item
        savedItem = await createItem.mutateAsync({
          name: values.name,
          description: values.description || null,
          category_id: Number(values.category_id),
          supplier_id: Number(values.supplier_id),
          manual_code: values.manual_code.trim().toUpperCase(),
          minimum_stock: values.minimum_stock,
          uom_id: pcsUom.uom_id // dynamic UOM ID resolution
        });
      }

      // Step 2: Separate image upload step if a file was selected
      if (imageFile) {
        await uploadImage.mutateAsync({ id: savedItem.item_id, file: imageFile });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      const backendErr = err.response?.data?.message || err.response?.data?.detail;
      setErrorMsg(backendErr || 'Terjadi kesalahan saat menyimpan barang.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-white overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEdit ? 'Ubah Barang' : 'Tambah Barang Baru'}
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 rounded p-3 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Item Code Preview (Visible to help user see final generated code) */}
          <div className="bg-slate-950 border border-slate-850 rounded-lg p-3">
            <span className="text-xs text-slate-400 block mb-1">Preview Kode Barang</span>
            <span className="font-mono text-lg font-bold text-amber-500 tracking-wider">
              {codePreview || 'Pilih Kategori & Supplier...'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category selection */}
            <div className="space-y-2">
              <Label htmlFor="category_id">Kategori</Label>
              <select
                id="category_id"
                disabled={isEdit}
                {...form.register('category_id', { valueAsNumber: true })}
                className="w-full rounded-md border border-slate-800 bg-slate-950 p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none disabled:opacity-50"
              >
                <option value={0}>Pilih Kategori</option>
                {categories?.filter(c => c.is_active).map(c => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {form.formState.errors.category_id && (
                <p className="text-xs text-red-500">{form.formState.errors.category_id.message}</p>
              )}
            </div>

            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Merk / Supplier</Label>
              <select
                id="supplier_id"
                disabled={isEdit}
                {...form.register('supplier_id', { valueAsNumber: true })}
                className="w-full rounded-md border border-slate-800 bg-slate-950 p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none disabled:opacity-50"
              >
                <option value={0}>Pilih Merk/Supplier</option>
                {suppliers?.filter(s => s.is_active).map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              {form.formState.errors.supplier_id && (
                <p className="text-xs text-red-500">{form.formState.errors.supplier_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manual Code */}
            <div className="space-y-2">
              <Label htmlFor="manual_code">Kode Manual</Label>
              <Input
                id="manual_code"
                disabled={isEdit}
                placeholder="Contoh: 001, A1"
                {...form.register('manual_code')}
                className="bg-slate-950 border-slate-800 text-white uppercase disabled:opacity-50"
              />
              {form.formState.errors.manual_code && (
                <p className="text-xs text-red-500">{form.formState.errors.manual_code.message}</p>
              )}
            </div>

            {/* Minimum Stock */}
            <div className="space-y-2">
              <Label htmlFor="minimum_stock">Stok Minimal</Label>
              <Input
                id="minimum_stock"
                type="number"
                placeholder="Contoh: 10"
                {...form.register('minimum_stock', { valueAsNumber: true })}
                className="bg-slate-950 border-slate-800 text-white"
              />
              {form.formState.errors.minimum_stock && (
                <p className="text-xs text-red-500">{form.formState.errors.minimum_stock.message}</p>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nama Barang</Label>
            <Input
              id="name"
              placeholder="Masukkan nama barang"
              {...form.register('name')}
              className="bg-slate-950 border-slate-800 text-white"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi (Opsional)</Label>
            <textarea
              id="description"
              placeholder="Masukkan deskripsi atau keterangan barang"
              rows={3}
              {...form.register('description')}
              className="w-full rounded-md border border-slate-800 bg-slate-950 p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Image Upload Area */}
          <div className="space-y-2">
            <Label>Foto Barang (Opsional)</Label>
            <div className="flex gap-4 items-center">
              {/* Preview Box */}
              <div className="h-24 w-24 rounded border border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-700" />
                )}
              </div>

              {/* Upload Button */}
              <div className="flex-1">
                <label htmlFor="image-file-input" className="sr-only">Upload Foto Barang</label>
                <input
                  type="file"
                  id="image-file-input"
                  name="image_file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-file-input')?.click()}
                    className="border-slate-800 bg-slate-950 hover:bg-slate-850 text-white min-h-[44px] rounded-xl"
                  >
                    <Upload className="mr-2 h-4 w-4 text-slate-400" />
                    Pilih Foto
                  </Button>
                </motion.div>
                <p className="text-xs text-slate-400 mt-2">
                  Format gambar disarankan persegi/square. Upload foto adalah langkah opsional.
                </p>
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              {...form.register('is_active')}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
            />
            <Label htmlFor="is_active">Barang Aktif</Label>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-700 bg-transparent hover:bg-slate-800 text-white rounded-xl min-h-[44px]"
              >
                Batal
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                type="submit"
                disabled={createItem.isPending || updateItem.isPending || uploadImage.isPending}
                className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-xl min-h-[44px]"
              >
                {isEdit ? 'Simpan' : 'Tambah'}
              </Button>
            </motion.div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
