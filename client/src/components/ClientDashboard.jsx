import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  BarChart3Icon,
  CalendarIcon,
  FileTextIcon,
  MessageSquareIcon,
  WalletIcon,
} from 'lucide-react';
import { useWorkspaceContext } from '../context/workspaceContext';
import ProjectOverview from './ProjectOverview';
import RecentActivity from './RecentActivity';

const ClientDashboard = () => {
  const { currentWorkspace } = useWorkspaceContext();
  const user = useSelector((state) => state.auth.user);

  const {
    totalProjects,
    activeProjects,
    completedProjects,
    avgProgress,
    primaryProject,
  } = useMemo(() => {
    const projects = currentWorkspace?.projects || [];
    const active = projects.filter(
      (project) =>
        project.status !== 'COMPLETED' && project.status !== 'CANCELLED'
    );
    const completed = projects.filter(
      (project) => project.status === 'COMPLETED'
    );
    const totalProgress = projects.reduce(
      (acc, project) => acc + (project.progress || 0),
      0
    );
    const avg = projects.length
      ? Math.round(totalProgress / projects.length)
      : 0;
    const primary = active[0] || projects[0] || null;

    return {
      totalProjects: projects.length,
      activeProjects: active.length,
      completedProjects: completed.length,
      avgProgress: avg,
      primaryProject: primary,
    };
  }, [currentWorkspace]);

  const analyticsLink = primaryProject
    ? `/projects/${primaryProject.id}/analytics`
    : '/projects';
  const calendarLink = primaryProject
    ? `/projects/${primaryProject.id}/calendar`
    : '/projects';

  return (
    <div className="w-full max-w-6xl mx-auto min-h-full space-y-6 sm:space-y-8">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
              Client Portal
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-white mt-2">
              Welcome back, {user?.name || 'Client'}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Your projects are moving forward. Track progress, timelines, and
              key updates in one place.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Active projects',
                value: activeProjects,
              },
              {
                label: 'Completed',
                value: completedProjects,
              },
              {
                label: 'Total projects',
                value: totalProjects,
              },
              {
                label: 'Overall progress',
                value: `${avgProgress}%`,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3"
              >
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Current focus
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {primaryProject
                    ? primaryProject.name
                    : 'No active project yet.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={analyticsLink}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-200"
                >
                  <BarChart3Icon className="size-3.5" /> Analytics
                </Link>
                <Link
                  to={calendarLink}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-200"
                >
                  <CalendarIcon className="size-3.5" /> Calendar
                </Link>
              </div>
            </div>
            {primaryProject && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Progress</span>
                  <span>{primaryProject.progress || 0}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${primaryProject.progress || 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <ProjectOverview />
          <RecentActivity />
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Quick access
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Jump straight to the client portal essentials.
            </p>
          </div>
          <div className="space-y-3">
            {[
              {
                title: 'Files & Links',
                body: 'Shared files and links will appear here.',
                icon: FileTextIcon,
                to: '/client-files',
              },
              {
                title: 'Invoices',
                body: 'Billing summaries and invoices are coming soon.',
                icon: WalletIcon,
                to: '/client-invoices',
              },
              {
                title: 'Messages',
                body: 'Project updates and messages will appear here.',
                icon: MessageSquareIcon,
                to: '/client-messages',
              },
            ].map((card) => (
              <Link
                key={card.title}
                to={card.to}
                className="group block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 p-4 transition hover:border-zinc-400 hover:bg-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <card.icon className="size-4 text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-900 dark:group-hover:text-white">
                    {card.title}
                  </h3>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2 group-hover:text-zinc-800 dark:group-hover:text-zinc-200">
                  {card.body}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
