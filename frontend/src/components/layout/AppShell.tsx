import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { 
  Menu, 
  Package, 
  Users, 
  Building2, 
  Truck, 
  LogOut, 
  Ruler, 
  LayoutDashboard,
  Layers,
  Database
} from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { useState } from 'react';
import { cn } from '../../lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const masterDataItems: NavItem[] = [
  { name: 'Barang', href: '/master-data/items', icon: Package, roles: ['super_admin', 'branch_head', 'warehouse_staff'] },
  { name: 'Stok Gudang', href: '/inventory/branch-stocks', icon: Database, roles: ['super_admin', 'branch_head', 'warehouse_staff'] },
  { name: 'Kategori', href: '/master-data/categories', icon: Layers, roles: ['super_admin', 'branch_head', 'warehouse_staff'] },
  { name: 'Cabang', href: '/master-data/branches', icon: Building2, roles: ['super_admin', 'branch_head'] },
  { name: 'Supplier', href: '/master-data/suppliers', icon: Truck, roles: ['super_admin', 'branch_head'] },
  { name: 'Users', href: '/master-data/users', icon: Users, roles: ['super_admin'] },
];

const settingsItems: NavItem[] = [
  { name: 'UOM', href: '/settings/uom', icon: Ruler, roles: ['super_admin'] },
];

export function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-6">
      <div>
        <h3 className="mb-2 px-4 text-xs font-semibold tracking-tight text-slate-400 uppercase">
          Master Data
        </h3>
        <div className="space-y-1">
          {masterDataItems.filter(i => user && i.roles.includes(user.role)).map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[48px]",
                  isActive ? "bg-amber-500/10 text-amber-500" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>

      {user?.role === 'super_admin' && (
        <div>
          <h3 className="mb-2 px-4 text-xs font-semibold tracking-tight text-slate-400 uppercase">
            Settings
          </h3>
          <div className="space-y-1">
            {settingsItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[48px]",
                    isActive ? "bg-amber-500/10 text-amber-500" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Desktop/Tablet Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-slate-900">
        <div className="flex h-16 items-center px-6 border-b border-slate-800">
          <LayoutDashboard className="h-6 w-6 text-amber-500 mr-3" />
          <span className="font-bold text-lg tracking-tight">Gudang Piala</span>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-3">
          <NavLinks />
        </div>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-white">{user?.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role.replace('_', ' ')}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10 min-h-[48px]" onClick={handleLogout}>
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-amber-500" />
            <span className="font-bold text-lg">Gudang Piala</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="min-h-[48px] min-w-[48px]">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] bg-slate-900 border-slate-800 p-0 flex flex-col">
              <div className="flex h-16 items-center px-6 border-b border-slate-800">
                <LayoutDashboard className="h-6 w-6 text-amber-500 mr-3" />
                <span className="font-bold text-lg">Gudang Piala</span>
              </div>
              <div className="flex-1 overflow-y-auto py-6 px-3">
                <NavLinks onClick={() => setOpen(false)} />
              </div>
              <div className="border-t border-slate-800 p-4">
                 <div className="mb-4 px-2">
                  <p className="text-sm font-medium text-white">{user?.full_name}</p>
                  <p className="text-xs text-slate-400 capitalize">{user?.role.replace('_', ' ')}</p>
                </div>
                <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10 min-h-[48px]" onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}>
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
