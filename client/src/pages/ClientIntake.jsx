import { useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { useClientIntakeLookup } from '../hooks/useQueries';
import { useSubmitClientIntake } from '../hooks/useMutations';

const ClientIntake = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const {
    data: intake,
    isLoading,
    isError,
  } = useClientIntakeLookup(token, {
    enabled: Boolean(token),
    retry: false,
  });
  const { mutateAsync: submitIntake, isPending } = useSubmitClientIntake();

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    projectName: '',
    goals: '',
    budget: '',
    timeline: '',
    targetAudience: '',
    brandGuidelines: '',
    competitors: '',
    successMetrics: '',
    notes: '',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await submitIntake({
        token,
        payload: formData,
      });
      toast.success('Submission received. Thank you!');
      setIsSubmitted(true);
    } catch (error) {
      toast.error(error?.message || 'Failed to submit intake');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Invalid intake link.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading intake form...
      </div>
    );
  }

  if (isError || !intake) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Intake form unavailable.
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="max-w-lg w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
            Thank you!
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Your project details were submitted successfully. Our team will
            review them and follow up with you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Project Intake Form
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          {intake.workspaceName
            ? `Workspace: ${intake.workspaceName}`
            : 'Tell us about your project.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Your Name</label>
              <input
                value={formData.clientName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientName: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm">Company</label>
              <input
                value={formData.company}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    company: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
              />
            </div>
            <div>
              <label className="text-sm">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
              />
            </div>
            <div>
              <label className="text-sm">Phone</label>
              <input
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
              />
            </div>
            <div>
              <label className="text-sm">Website</label>
              <input
                value={formData.website}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
              />
            </div>
            <div>
              <label className="text-sm">Industry</label>
              <input
                value={formData.industry}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    industry: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm">Project Name</label>
            <input
              value={formData.projectName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  projectName: e.target.value,
                }))
              }
              className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Goals & Vision</label>
              <textarea
                value={formData.goals}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    goals: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
                required
              />
            </div>
            <div>
              <label className="text-sm">Target Audience</label>
              <textarea
                value={formData.targetAudience}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetAudience: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
              />
            </div>
            <div>
              <label className="text-sm">Budget</label>
              <input
                value={formData.budget}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    budget: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
              />
            </div>
            <div>
              <label className="text-sm">Timeline</label>
              <input
                value={formData.timeline}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    timeline: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
              />
            </div>
            <div>
              <label className="text-sm">Brand Guidelines</label>
              <textarea
                value={formData.brandGuidelines}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    brandGuidelines: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
              />
            </div>
            <div>
              <label className="text-sm">Competitors</label>
              <textarea
                value={formData.competitors}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    competitors: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
              />
            </div>
            <div>
              <label className="text-sm">Success Metrics</label>
              <textarea
                value={formData.successMetrics}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    successMetrics: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
              />
            </div>
            <div>
              <label className="text-sm">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm h-24"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded bg-linear-to-br from-blue-500 to-blue-600 text-white text-sm"
            >
              {isPending ? 'Submitting...' : 'Submit Intake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientIntake;
