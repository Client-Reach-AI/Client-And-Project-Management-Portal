import { NavLink } from 'react-router-dom';

const tabs = [
  { label: 'Files & Links', to: '/client-files' },
  { label: 'Invoices', to: '/client-invoices' },
  { label: 'Messages', to: '/client-messages' },
];

const ClientPortalTabs = () => (
  <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800">
    {tabs.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        className={({ isActive }) =>
          `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            isActive
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`
        }
      >
        {tab.label}
      </NavLink>
    ))}
  </div>
);

export default ClientPortalTabs;
