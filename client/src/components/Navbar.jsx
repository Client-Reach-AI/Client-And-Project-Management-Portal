import { SearchIcon, PanelLeft } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../features/themeSlice';
import { MoonIcon, SunIcon } from 'lucide-react';
import Avatar from './Avatar';
import { logout } from '../features/authSlice';

const Navbar = ({ setIsSidebarOpen }) => {
  const dispatch = useDispatch();
  const { theme } = useSelector((state) => state.theme);
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 xl:px-16 py-3 shrink-0">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Left section */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Sidebar Trigger */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="sm:hidden p-2 rounded-lg transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <PanelLeft size={20} />
          </button>

          {/* Search Input */}
          <div className="relative flex-1 max-w-sm hidden md:block">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3.5" />
            <input
              type="text"
              placeholder="Search projects, tasks..."
              className="pl-8 pr-4 py-2 w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={() => dispatch(toggleTheme())}
            className="size-8 flex items-center justify-center bg-white dark:bg-zinc-800 shadow rounded-lg transition hover:scale-105 active:scale-95"
          >
            {theme === 'light' ? (
              <MoonIcon className="size-4 text-gray-800 dark:text-gray-200" />
            ) : (
              <SunIcon className="size-4 text-yellow-400" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="hidden sm:inline">
                {user?.name || user?.email}
              </span>
              <span className="hidden sm:inline text-[10px] uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                {user?.role || 'USER'}
              </span>
            </div>
            <Avatar
              src={user?.image}
              name={user?.name}
              email={user?.email}
              className="size-7 rounded-full"
            />
            <button
              onClick={() => dispatch(logout())}
              className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
