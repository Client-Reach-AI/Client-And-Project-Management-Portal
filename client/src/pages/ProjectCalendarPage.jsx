import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import ProjectCalendar from '../components/ProjectCalendar';
import { useProject } from '../hooks/useQueries';

const ProjectCalendarPage = () => {
  const { id } = useParams();
  const { data: project, isLoading } = useProject(id, {
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
        Loading project calendar...
      </div>
    );
  }

  if (!project) {
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-zinc-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/projectsDetail?id=${project.id}&tab=tasks`}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-medium">{project.name}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Delivery calendar
            </p>
          </div>
        </div>
        <div />
      </div>

      <ProjectCalendar tasks={project.tasks || []} />
    </div>
  );
};

export default ProjectCalendarPage;
