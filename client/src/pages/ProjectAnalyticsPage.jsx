import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import ProjectAnalytics from '../components/ProjectAnalytics';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useProject } from '../hooks/useQueries';

const ProjectAnalyticsPage = () => {
  const { id } = useParams();
  const { currentWorkspace } = useWorkspaceContext();
  const user = useSelector((state) => state.auth.user);
  const isClient = user?.role === 'CLIENT';
  const { data: project, isLoading } = useProject(id, {
    enabled: Boolean(id) && !isClient,
  });
  const projects = currentWorkspace?.projects || [];
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  const allTasks = useMemo(
    () => projects.flatMap((item) => item.tasks || []),
    [projects]
  );

  const allMembers = useMemo(() => {
    const map = new Map();
    projects.forEach((item) => {
      item.members?.forEach((member) => {
        const key = member.user?.id || member.user?.email;
        if (!key) return;
        if (!map.has(key)) {
          map.set(key, member.user || member);
        }
      });
    });
    return Array.from(map.values());
  }, [projects]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId === 'all') {
      return {
        id: 'all',
        name: 'All projects',
        members: allMembers,
      };
    }

    return projects.find((item) => item.id === selectedProjectId) || null;
  }, [allMembers, projects, selectedProjectId]);

  const selectedTasks = useMemo(() => {
    if (selectedProjectId === 'all') {
      return allTasks;
    }

    return selectedProject?.tasks || [];
  }, [allTasks, selectedProject, selectedProjectId]);

  if (!isClient && isLoading) {
    return (
      <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
        Loading project analytics...
      </div>
    );
  }

  if (!isClient && !project) {
    return (
      <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
        <p className="text-3xl md:text-5xl mt-40 mb-10">Project not found</p>
        <Link
          to="/projects"
          className="mt-4 inline-flex items-center px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  if (isClient && projects.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
        <p className="text-2xl md:text-4xl mt-32 mb-6">No projects yet</p>
        <Link
          to="/projects"
          className="inline-flex items-center px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  const displayProject = isClient ? selectedProject : project;
  const displayTasks = isClient ? selectedTasks : project?.tasks || [];
  const headerTitle = isClient
    ? displayProject?.name || 'Project analytics'
    : project?.name || 'Project analytics';
  const backHref = isClient
    ? '/projects'
    : `/projectsDetail?id=${project?.id}&tab=tasks`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-zinc-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={backHref}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-medium">{headerTitle}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Analytics overview
            </p>
          </div>
        </div>
        {isClient && (
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
          >
            <option value="all">All projects</option>
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <ProjectAnalytics project={displayProject} tasks={displayTasks} />
    </div>
  );
};

export default ProjectAnalyticsPage;
