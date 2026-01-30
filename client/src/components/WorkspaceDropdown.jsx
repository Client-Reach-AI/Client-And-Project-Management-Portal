import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { assets } from '../assets/assets';
import CreateWorkspaceDialog from './CreateWorkspaceDialog';
import { useWorkspaceContext } from '../context/workspaceContext';

function WorkspaceDropdown() {
  const user = useSelector((state) => state.auth.user);
  const { workspaces, currentWorkspace, setCurrentWorkspaceId } =
    useWorkspaceContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const memberRole = currentWorkspace?.members?.find(
    (member) => member.user.id === user?.id
  )?.role;
  const canCreate = user?.role === 'ADMIN';
  const canSwitch = workspaces.length > 1;

  const onSelectWorkspace = (organizationId) => {
    setCurrentWorkspaceId(organizationId);
    setIsOpen(false);
    navigate('/');
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative m-4" ref={dropdownRef}>
      <button
        onClick={() => {
          if (!canSwitch) return;
          setIsOpen((prev) => !prev);
        }}
        className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
      >
        <div className="flex items-center gap-3">
          <img
            src={currentWorkspace?.image_url || assets.workspace_img_default}
            alt={currentWorkspace?.name}
            className="w-8 h-8 rounded shadow"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
              {currentWorkspace?.name || 'Select Workspace'}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
              {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {canSwitch && (
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 shrink-0" />
        )}
      </button>

      {isOpen && canSwitch && (
        <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0">
          <div className="p-2">
            <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
              Workspaces
            </p>
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => onSelectWorkspace(ws.id)}
                className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <img
                  src={ws.image_url || assets.workspace_img_default}
                  alt={ws.name}
                  className="w-6 h-6 rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {ws.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                    {typeof ws.memberCount === 'number'
                      ? ws.memberCount
                      : ws.members?.length ||
                        (currentWorkspace?.id === ws.id
                          ? currentWorkspace?.members?.length || 0
                          : 0)}{' '}
                    members
                  </p>
                </div>
                {currentWorkspace?.id === ws.id && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
              </div>
            ))}
          </div>

          <hr className="border-gray-200 dark:border-zinc-700" />

          {canCreate && (
            <div
              className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800"
              onClick={() => {
                setIsOpen(false);
                setIsCreateOpen(true);
              }}
            >
              <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
                <Plus className="w-4 h-4" /> Create Workspace
              </p>
            </div>
          )}
        </div>
      )}

      {canCreate && (
        <CreateWorkspaceDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  );
}

export default WorkspaceDropdown;
