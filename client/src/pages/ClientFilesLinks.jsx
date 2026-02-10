import { useEffect, useMemo, useState } from 'react';
import { Link as LinkIcon, UploadCloud as UploadCloudIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useSharedFiles } from '../hooks/useQueries';
import {
  useCreateFileSignature,
  useCreateSharedFile,
} from '../hooks/useMutations';

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const ensureUrl = (value) => {
  if (!value) return value;
  return value.startsWith('http') ? value : `https://${value}`;
};

const buildOpenUrl = (item) => {
  const url = ensureUrl(item?.url);
  if (!url) return url;
  if (item?.mimeType?.includes('pdf') && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/raw/upload/');
  }
  return url;
};

const buildDownloadUrl = (item) => {
  const url = buildOpenUrl(item);
  if (!url) return url;
  return url.includes('/upload/')
    ? url.replace('/upload/', '/upload/fl_attachment/')
    : url;
};

const ClientFilesLinks = () => {
  const { currentWorkspace } = useWorkspaceContext();
  const projects = currentWorkspace?.projects || [];

  const [projectFilter, setProjectFilter] = useState('all');
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!projects.length) {
      setProjectFilter('all');
      return;
    }

    if (projectFilter !== 'all') {
      const exists = projects.some((project) => project.id === projectFilter);
      if (!exists) setProjectFilter('all');
    }
  }, [projects, projectFilter]);

  const workspaceId = currentWorkspace?.id || null;
  const projectId = projectFilter === 'all' ? null : projectFilter;

  const { data: files = [], isLoading } = useSharedFiles({
    workspaceId,
    projectId,
  });
  const { mutateAsync: createSignature } = useCreateFileSignature();
  const { mutateAsync: createFileRecord } = useCreateSharedFile();

  const projectOptions = useMemo(() => {
    if (!projects.length) return [];
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
    }));
  }, [projects]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !workspaceId) return;

    setUploading(true);
    try {
      const signature = await createSignature({ workspaceId });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signature.apiKey);
      formData.append('timestamp', signature.timestamp);
      formData.append('signature', signature.signature);
      formData.append('folder', signature.folder);
      formData.append('public_id', signature.publicId);
      formData.append('access_mode', signature.accessMode || 'public');

      const isImage = file.type?.startsWith('image/');
      const resourceType = isImage ? 'image' : 'raw';
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok || uploaded?.error) {
        throw new Error(uploaded?.error?.message || 'Upload failed');
      }

      await createFileRecord({
        workspaceId,
        projectId,
        name: file.name,
        type: 'FILE',
        url: uploaded.secure_url,
        size: uploaded.bytes,
        mimeType: file.type,
        cloudinaryPublicId: uploaded.public_id,
        metadata: {
          resourceType: uploaded.resource_type || resourceType,
        },
      });

      toast.success('File uploaded');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleAddLink = async (event) => {
    event.preventDefault();
    if (!workspaceId) return;

    try {
      if (!linkName.trim() || !linkUrl.trim()) {
        toast.error('Name and URL are required');
        return;
      }

      const resolvedUrl = ensureUrl(linkUrl.trim());

      await createFileRecord({
        workspaceId,
        projectId,
        name: linkName.trim(),
        type: 'LINK',
        url: resolvedUrl,
      });

      setLinkName('');
      setLinkUrl('');
      toast.success('Link added');
    } catch (error) {
      toast.error(error?.message || 'Failed to add link');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
          Client Portal
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-white mt-2">
          Files & Links
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Share the latest files and quick links with your team.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Upload a file
          </h3>
          <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer">
            <UploadCloudIcon className="size-4" />
            {uploading ? 'Uploading...' : 'Select a file'}
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Files upload to Cloudinary and appear instantly in the list.
          </p>
        </div>

        <form
          onSubmit={handleAddLink}
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Add a link
          </h3>
          <input
            value={linkName}
            onChange={(event) => setLinkName(event.target.value)}
            placeholder="Link name"
            className="w-full text-sm px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <input
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://"
            className="w-full text-sm px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="w-full px-3 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm"
          >
            Add link
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Shared items
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Files and links visible in this workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              Project
            </label>
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="text-xs border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-900"
            >
              <option value="all">All</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading files...
          </p>
        ) : files.length ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {files.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {item.type === 'FILE'
                      ? `${formatBytes(item.size)} • ${item.mimeType || 'File'}`
                      : 'Link'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={buildDownloadUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300 hover:underline"
                  >
                    <LinkIcon className="size-3" /> Download
                  </a>
                  <a
                    href={buildOpenUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <LinkIcon className="size-3" /> Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No files shared yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default ClientFilesLinks;
