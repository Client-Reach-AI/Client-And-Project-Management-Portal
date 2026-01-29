import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

const SearchPopover = ({ value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:inline-flex items-center justify-center size-10 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        aria-label="Open search"
      >
        <Search className="size-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start sm:items-center justify-center px-4 pt-20 sm:pt-0">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <input
                  ref={inputRef}
                  value={value}
                  onChange={onChange}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center size-9 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                aria-label="Close search"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SearchPopover;
