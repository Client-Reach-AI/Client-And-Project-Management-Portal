import { useEffect, useMemo, useState } from 'react';
import {
  Link as LinkIcon,
  PlusIcon,
  Trash2,
  UploadCloudIcon,
  X,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useMntPeople, useSharedFiles } from '../hooks/useQueries';
import {
  useCreateFileSignature,
  useCreateMntPerson,
  useCreateSharedFile,
  useDeleteMntPerson,
  useUpdateMntPerson,
} from '../hooks/useMutations';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  status: 'ACTIVE',
  notes: '',
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
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
  if (url.includes('/raw/upload/')) return url;
  return url.includes('/upload/')
    ? url.replace('/upload/', '/upload/fl_attachment/')
    : url;
};

const statusStyles = {
  ACTIVE:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  PAUSED:
    'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  COMPLETED:
    'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizePhone = (value) => value.replace(/[^\d+]/g, '');

const isValidPhone = (value) => {
  const phone = normalizePhone(value);
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 7;
};

const Mentorship = () => {
  const { currentWorkspace } = useWorkspaceContext();
  const user = useSelector((state) => state.auth.user);
  const memberRole = currentWorkspace?.members?.find(
    (member) => member.user.id === user?.id
  )?.role;
  const isAdmin = user?.role === 'ADMIN' || memberRole === 'ADMIN';
  const workspaceId = currentWorkspace?.id || null;

  const { data: mntPeople = [] } = useMntPeople(workspaceId, {
    enabled: Boolean(workspaceId && isAdmin),
  });
  const [selectedMntId, setSelectedMntId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [deletingMntId, setDeletingMntId] = useState(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const { mutateAsync: createPerson, isPending: creatingMnt } = useCreateMntPerson();
  const { mutateAsync: updatePerson, isPending: updatingMnt } = useUpdateMntPerson();
  const { mutateAsync: deleteMntPerson } = useDeleteMntPerson();
  const { mutateAsync: createSignature } = useCreateFileSignature();
  const { mutateAsync: createFileRecord } = useCreateSharedFile();

  const selectedMnt =
    mntPeople.find((person) => person.id === selectedMntId) || null;

  const { data: mntFiles = [], isLoading: filesLoading } = useSharedFiles(
    {
      workspaceId,
      mntPersonId: selectedMnt?.id,
      fileScope: 'ADMIN_ONLY',
    },
    {
      enabled: Boolean(workspaceId && selectedMnt?.id && isAdmin),
    }
  );

  useEffect(() => {
    if (!selectedMntId) return;
    const stillExists = mntPeople.some((person) => person.id === selectedMntId);
    if (!stillExists) {
      setSelectedMntId(null);
      setIsDetailsOpen(false);
    }
  }, [mntPeople, selectedMntId]);

  const stats = useMemo(
    () => ({
      total: mntPeople.length,
      active: mntPeople.filter((item) => item.status === 'ACTIVE').length,
      completed: mntPeople.filter((item) => item.status === 'COMPLETED').length,
    }),
    [mntPeople]
  );

  const handleCreateMnt = async (event) => {
    event.preventDefault();
    if (!workspaceId) return;

    try {
      const fullName = formData.fullName.trim();
      const email = formData.email.trim();
      const phone = formData.phone.trim();
      const notes = formData.notes.trim();

      if (!fullName || !email || !phone) {
        toast.error('Full name, email, and phone are required');
        return;
      }

      if (!isValidEmail(email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      if (!isValidPhone(phone)) {
        toast.error('Please enter a valid phone number');
        return;
      }

      const created = await createPerson({
        workspaceId,
        fullName,
        email,
        phone,
        status: formData.status,
        notes: notes || null,
      });

      setFormData(initialForm);
      setIsCreateOpen(false);
      setSelectedMntId(created?.id || null);
      setIsDetailsOpen(true);
      toast.success('MNT added');
    } catch (error) {
      toast.error(error?.message || 'Failed to add MNT');
    }
  };

  const handleUpdateStatus = async (mntId, status) => {
    if (!mntId || !workspaceId) return;

    try {
      await updatePerson({
        mntId,
        workspaceId,
        payload: { status },
      });
      toast.success('Status updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update status');
    }
  };

  const handleDeleteMnt = async (event, person) => {
    event?.stopPropagation?.();
    if (!person?.id || !workspaceId) return;

    const confirmed = window.confirm(
      `Delete ${person.fullName} and all related documents?`
    );
    if (!confirmed) return;

    setDeletingMntId(person.id);
    try {
      await deleteMntPerson({ mntId: person.id, workspaceId });
      if (selectedMntId === person.id) {
        setSelectedMntId(null);
        setIsDetailsOpen(false);
      }
      toast.success('MNT deleted');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete MNT');
    } finally {
      setDeletingMntId(null);
    }
  };

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (!selectedFile || !workspaceId || !selectedMnt?.id) {
      toast.error('Please select a file');
      return;
    }

    setUploadingFile(true);
    try {
      const signature = await createSignature({ workspaceId });

      const formDataToUpload = new FormData();
      formDataToUpload.append('file', selectedFile);
      formDataToUpload.append('api_key', signature.apiKey);
      formDataToUpload.append('timestamp', signature.timestamp);
      formDataToUpload.append('signature', signature.signature);
      formDataToUpload.append('folder', signature.folder);
      formDataToUpload.append('public_id', signature.publicId);
      formDataToUpload.append('access_mode', signature.accessMode || 'public');

      const isImage = selectedFile.type?.startsWith('image/');
      const resourceType = isImage ? 'image' : 'raw';
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formDataToUpload,
        }
      );

      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok || uploaded?.error) {
        throw new Error(uploaded?.error?.message || 'Upload failed');
      }

      await createFileRecord({
        workspaceId,
        mntPersonId: selectedMnt.id,
        fileScope: 'ADMIN_ONLY',
        name: selectedFile.name,
        type: 'FILE',
        url: uploaded.secure_url,
        size: uploaded.bytes,
        mimeType: selectedFile.type,
        cloudinaryPublicId: uploaded.public_id,
        metadata: {
          fileScope: 'ADMIN_ONLY',
          source: 'ADMIN_PORTAL',
        },
      });

      setSelectedFile(null);
      setShowUploadModal(false);
      toast.success('Document uploaded');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload document');
    } finally {
      setUploadingFile(false);
    }
  };

  const addLink = async (event) => {
    event.preventDefault();
    if (!workspaceId || !selectedMnt?.id) return;

    try {
      if (!linkName.trim() || !linkUrl.trim()) {
        toast.error('Name and URL are required');
        return;
      }

      await createFileRecord({
        workspaceId,
        mntPersonId: selectedMnt.id,
        fileScope: 'ADMIN_ONLY',
        name: linkName.trim(),
        type: 'LINK',
        url: ensureUrl(linkUrl.trim()),
        metadata: {
          fileScope: 'ADMIN_ONLY',
          source: 'ADMIN_PORTAL',
        },
      });

      setLinkName('');
      setLinkUrl('');
      setShowLinkModal(false);
      toast.success('Link added');
    } catch (error) {
      toast.error(error?.message || 'Failed to add link');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Mentorship Access
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Only workspace admins can manage MNT records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white">
            MNT
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Track mentorship people and keep their documents in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm"
        >
          <PlusIcon className="size-4" /> Add MNT
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Total
          </p>
          <p className="text-lg font-semibold mt-2 text-zinc-900 dark:text-white">
            {stats.total}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Active
          </p>
          <p className="text-lg font-semibold mt-2 text-zinc-900 dark:text-white">
            {stats.active}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Completed
          </p>
          <p className="text-lg font-semibold mt-2 text-zinc-900 dark:text-white">
            {stats.completed}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/70">
              <tr className="text-left text-zinc-500 dark:text-zinc-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!mntPeople.length && (
                <tr>
                  <td
                    className="px-4 py-6 text-zinc-500 dark:text-zinc-400"
                    colSpan={6}
                  >
                    No MNT records yet.
                  </td>
                </tr>
              )}
              {mntPeople.map((person) => (
                <tr
                  key={person.id}
                  onClick={() => {
                    setSelectedMntId(person.id);
                    setIsDetailsOpen(true);
                  }}
                  className={`border-t border-zinc-100 dark:border-zinc-800 cursor-pointer ${
                    selectedMnt?.id === person.id
                      ? 'bg-blue-50/70 dark:bg-blue-500/10'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                    {person.fullName}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {person.email || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {person.phone || 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={person.status || 'ACTIVE'}
                      disabled={updatingMnt}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        event.stopPropagation();
                        handleUpdateStatus(person.id, event.target.value);
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium bg-transparent ${
                        statusStyles[person.status] || statusStyles.ACTIVE
                      } ${updatingMnt ? 'opacity-60' : ''}`}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PAUSED">PAUSED</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(person.createdAt)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={deletingMntId === person.id}
                      onClick={(event) => handleDeleteMnt(event, person)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 disabled:opacity-60"
                    >
                      <Trash2 className="size-3.5" />
                      {deletingMntId === person.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Add MNT
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (creatingMnt) return;
                  setIsCreateOpen(false);
                  setFormData(initialForm);
                }}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMnt} className="space-y-3">
              <input
                value={formData.fullName}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, fullName: event.target.value }))
                }
                placeholder="Full name"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                required
              />
              <input
                value={formData.email}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="Email"
                type="email"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                required
              />
              <input
                value={formData.phone}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="Phone"
                type="tel"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                required
              />
              <select
                value={formData.status}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, status: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Notes"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (creatingMnt) return;
                    setIsCreateOpen(false);
                    setFormData(initialForm);
                  }}
                  className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingMnt}
                  className="px-3 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm disabled:opacity-60"
                >
                  {creatingMnt ? 'Saving...' : 'Add MNT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailsOpen && selectedMnt && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close MNT details"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsDetailsOpen(false)}
          />

          <aside
            role="dialog"
            aria-modal="true"
            className="relative h-full w-full max-w-2xl border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-y-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  MNT Details
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {selectedMnt.fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="inline-flex items-center justify-center size-8 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Name</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMnt.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Email</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMnt.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Phone</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMnt.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Submitted</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {formatDateTime(selectedMnt.createdAt)}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-zinc-500 dark:text-zinc-400">Status</p>
                  <div className="mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium border border-transparent">
                    <span
                      className={`rounded-full px-2.5 py-1 ${
                        statusStyles[selectedMnt.status] || statusStyles.ACTIVE
                      }`}
                    >
                      {selectedMnt.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
                  {selectedMnt.notes || 'No notes'}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Documents
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Add links and documents for this specific MNT.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(true)}
                      className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-xs"
                    >
                      Add document
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLinkModal(true)}
                      className="px-3 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-xs"
                    >
                      Add link
                    </button>
                  </div>
                </div>

                {filesLoading ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Loading documents...
                  </p>
                ) : !mntFiles.length ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No documents yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mntFiles.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-950"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {item.type === 'FILE' ? item.mimeType || 'File' : 'Link'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
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
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Add document
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (uploadingFile) return;
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={uploadDocument} className="space-y-3">
              <label className="flex items-center justify-center gap-2 px-4 py-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer">
                <UploadCloudIcon className="size-4" />
                {selectedFile ? selectedFile.name : 'Select a file'}
                <input
                  type="file"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  disabled={uploadingFile}
                  className="hidden"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (uploadingFile) return;
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }}
                  className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="px-3 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm disabled:opacity-60"
                >
                  {uploadingFile ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Add link
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={addLink} className="space-y-3">
              <input
                value={linkName}
                onChange={(event) => setLinkName(event.target.value)}
                placeholder="Link name"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              />
              <input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm"
                >
                  Save link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mentorship;
