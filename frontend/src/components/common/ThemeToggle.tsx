import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/theme-store';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeToggleProps {
  className?: string;
  variant?: 'ghost' | 'outline';
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', variant = 'ghost', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Button
      variant={variant}
      size={showLabel ? 'default' : 'icon'}
      onClick={toggleTheme}
      className={`relative overflow-hidden transition-colors ${className}`}
      title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
      aria-label="Toggle theme"
    >
      <div className="flex items-center gap-2">
        <div className="relative w-5 h-5 flex items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="moon"
                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                transition={{ duration: 0.15 }}
                className="absolute text-amber-400"
              >
                <Moon className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="sun"
                initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                transition={{ duration: 0.15 }}
                className="absolute text-amber-500"
              >
                <Sun className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {showLabel && (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {isDark ? 'Mode Gelap' : 'Mode Terang'}
          </span>
        )}
      </div>
    </Button>
  );
}
