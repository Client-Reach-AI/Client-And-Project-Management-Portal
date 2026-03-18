import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useMeetingSettings, useMeetings } from '../hooks/useQueries';
import { useDeleteMeeting, useUpdateMeetingSettings } from '../hooks/useMutations';

const DEFAULT_BOOKING_START_HOUR = 9;
const DEFAULT_BOOKING_END_HOUR = 20;

const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: new Date(2000, 0, 1, hour, 0, 0).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }),
}));

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const Bookings = () => {
  const user = useSelector((state) => state.auth.user);
  const { currentWorkspace } = useWorkspaceContext();

  const memberRole = currentWorkspace?.members?.find(
    (member) => member.user.id === user?.id
  )?.role;
  const isAdmin = user?.role === 'ADMIN' || memberRole === 'ADMIN';

  const workspaceId = currentWorkspace?.id || null;

  const { data: meetings = [], isLoading } = useMeetings(workspaceId, {
    enabled: Boolean(workspaceId && isAdmin),
  });
  const { data: meetingSettings } = useMeetingSettings(workspaceId, {
    enabled: Boolean(workspaceId && isAdmin),
  });
  const { mutateAsync: deleteMeeting, isPending: deletingMeeting } =
    useDeleteMeeting();
  const { mutateAsync: updateMeetingSettings, isPending: updatingSettings } =
    useUpdateMeetingSettings();
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [startHour, setStartHour] = useState(DEFAULT_BOOKING_START_HOUR);
  const [endHour, setEndHour] = useState(DEFAULT_BOOKING_END_HOUR);

  const publicBookingUrl = workspaceId
    ? `${window.location.origin}/booking?workspaceId=${encodeURIComponent(
        workspaceId
      )}`
    : '';

  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [meetings]);

  const selectedMeeting =
    sortedMeetings.find((meeting) => meeting.id === selectedMeetingId) || null;

  useEffect(() => {
    if (!selectedMeetingId) return;

    const meetingStillExists = sortedMeetings.some(
      (meeting) => meeting.id === selectedMeetingId
    );

    if (!meetingStillExists) {
      setSelectedMeetingId(null);
      setIsDetailsOpen(false);
    }
  }, [sortedMeetings, selectedMeetingId]);

  useEffect(() => {
    if (!meetingSettings) return;
    setStartHour(meetingSettings.startHour ?? DEFAULT_BOOKING_START_HOUR);
    setEndHour(meetingSettings.endHour ?? DEFAULT_BOOKING_END_HOUR);
  }, [meetingSettings]);

  const copyLink = async () => {
    if (!publicBookingUrl) {
      toast.error('Workspace is required');
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicBookingUrl);
      }
      toast.success('Booking link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const deleteBooking = async (meeting) => {
    if (!meeting?.id || !workspaceId) return;

    const confirmed = window.confirm(
      `Delete booking for ${meeting.firstName} ${meeting.lastName}?`
    );
    if (!confirmed) return;

    try {
      await deleteMeeting({
        meetingId: meeting.id,
        workspaceId,
      });

      if (selectedMeetingId === meeting.id) {
        setSelectedMeetingId(null);
        setIsDetailsOpen(false);
      }

      toast.success('Booking deleted');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete booking');
    }
  };

  const saveBookingWindow = async () => {
    if (!workspaceId) return;

    const normalizedStart = Math.min(startHour, endHour);
    const normalizedEnd = Math.max(startHour, endHour);

    try {
      await updateMeetingSettings({
        workspaceId,
        startHour: normalizedStart,
        endHour: normalizedEnd,
      });
      toast.success('Booking hours updated');
      setStartHour(normalizedStart);
      setEndHour(normalizedEnd);
    } catch (error) {
      toast.error(error?.message || 'Failed to update booking hours');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h2 className="text-xl font-semibold">Bookings Access</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Only workspace admins can manage bookings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white">
          Bookings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Copy your booking page link and manage all scheduled meetings.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Public Booking Link
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 break-all">
              {publicBookingUrl || 'Select a workspace to generate link'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <a
              href={publicBookingUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded border ${
                publicBookingUrl
                  ? 'border-zinc-300 dark:border-zinc-700'
                  : 'border-zinc-200 text-zinc-400 pointer-events-none dark:border-zinc-800'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Booking Availability Hours
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            These hours control which time slots appear on your public booking page.
          </p>
        </div>

        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 sm:items-end">
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              Start Hour
            </label>
            <select
              value={startHour}
              onChange={(event) => setStartHour(Number(event.target.value))}
              className="w-full px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              {hourOptions.map((option) => (
                <option key={`start-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              End Hour
            </label>
            <select
              value={endHour}
              onChange={(event) => setEndHour(Number(event.target.value))}
              className="w-full px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              {hourOptions.map((option) => (
                <option key={`end-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={saveBookingWindow}
            disabled={updatingSettings}
            className="px-4 py-2 rounded text-sm bg-linear-to-br from-blue-500 to-blue-600 text-white disabled:opacity-60"
          >
            {updatingSettings ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-sm font-semibold">All Bookings</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {sortedMeetings.length} total
          </p>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
            Loading bookings...
          </div>
        ) : sortedMeetings.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
            No bookings yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900/70 text-zinc-600 dark:text-zinc-300">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Contact</th>
                  <th className="text-left p-3">Business</th>
                  <th className="text-left p-3">Scheduled</th>
                  <th className="text-left p-3">Timezone</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedMeetings.map((meeting) => (
                  <tr
                    key={meeting.id}
                    onClick={() => {
                      setSelectedMeetingId(meeting.id);
                      setIsDetailsOpen(true);
                    }}
                    className={`border-t border-zinc-200 dark:border-zinc-800 cursor-pointer ${
                      selectedMeeting?.id === meeting.id
                        ? 'bg-blue-50/70 dark:bg-blue-500/10'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                    }`}
                  >
                    <td className="p-3">
                      {meeting.firstName} {meeting.lastName}
                    </td>
                    <td className="p-3">
                      <div>{meeting.email}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {meeting.phone}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>{meeting.businessType || 'N/A'}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {meeting.websiteUrl || 'No website'}
                      </div>
                    </td>
                    <td className="p-3">{formatDate(meeting.scheduledAt)}</td>
                    <td className="p-3">{meeting.timezone || 'N/A'}</td>
                    <td
                      className="p-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => deleteBooking(meeting)}
                        disabled={deletingMeeting}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-red-600 border border-red-200 dark:border-red-900/40 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isDetailsOpen && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close booking details"
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
                  Booking Details
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {selectedMeeting.firstName} {selectedMeeting.lastName}
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
                  <p className="text-zinc-500 dark:text-zinc-400">First Name</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMeeting.firstName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Last Name</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMeeting.lastName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Email</p>
                  <p className="text-zinc-900 dark:text-zinc-100 break-all">
                    {selectedMeeting.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Phone</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMeeting.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Website URL
                  </p>
                  <p className="text-zinc-900 dark:text-zinc-100 break-all">
                    {selectedMeeting.websiteUrl ||
                      selectedMeeting.payload?.website_url ||
                      'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Business Type
                  </p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMeeting.businessType ||
                      selectedMeeting.payload?.business_type ||
                      'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Target Audience
                  </p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMeeting.targetAudience ||
                      selectedMeeting.payload?.target_audience ||
                      'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Monthly Revenue
                  </p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMeeting.monthlyRevenue ||
                      selectedMeeting.payload?.monthly_revenue ||
                      'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Decision Maker
                  </p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMeeting.decisionMaker ||
                      selectedMeeting.payload?.decision_maker ||
                      'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Status</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMeeting.status || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Scheduled</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {formatDate(selectedMeeting.scheduledAt)}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Scheduled End
                  </p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {formatDate(selectedMeeting.scheduledEndAt)}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">Timezone</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMeeting.timezone ||
                      selectedMeeting.payload?.timezone ||
                      'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Duration (mins)
                  </p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {selectedMeeting.durationMinutes ||
                      selectedMeeting.payload?.duration_minutes ||
                      'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Bookings;
