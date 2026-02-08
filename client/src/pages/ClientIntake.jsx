import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Circle } from 'lucide-react';
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

  const steps = useMemo(
    () => [
      {
        id: 'contact',
        title: 'Contact details',
        description: 'Who should we keep in touch with?',
      },
      {
        id: 'business',
        title: 'Business overview',
        description: 'Share details about your company.',
      },
      {
        id: 'vision',
        title: 'Project vision',
        description: 'Help us understand your goals and audience.',
      },
      {
        id: 'scope',
        title: 'Scope & timeline',
        description: 'Budget range and timelines matter.',
      },
      {
        id: 'brand',
        title: 'Brand & competition',
        description: 'Positioning, guidelines, and competitors.',
      },
      {
        id: 'success',
        title: 'Success criteria',
        description: 'How will you measure success?',
      },
      {
        id: 'review',
        title: 'Review & submit',
        description: 'Confirm the details before sending.',
      },
    ],
    []
  );

  const [currentStep, setCurrentStep] = useState(0);
  const isFinalStep = currentStep === steps.length - 1;
  const progress = Math.round((currentStep / (steps.length - 1)) * 100);

  const inputClassName =
    'w-full mt-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500';
  const textAreaClassName = `${inputClassName} min-h-[6.5rem]`;

  const requiredByStep = {
    contact: ['clientName'],
    vision: ['goals'],
  };

  const handleNext = () => {
    const stepKey = steps[currentStep]?.id;
    const requiredFields = requiredByStep[stepKey] || [];
    const missing = requiredFields.filter(
      (field) => !String(formData[field] || '').trim()
    );
    if (missing.length > 0) {
      toast.error('Please complete the required fields to continue.');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFinalStep) {
      handleNext();
      return;
    }
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Invalid intake link
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            Please request a new intake link from your workspace admin.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-sm text-slate-600 dark:text-slate-300 shadow-sm">
          Loading intake form...
        </div>
      </div>
    );
  }

  if (isError || !intake) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Intake form unavailable
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            This link may have expired. Please request a fresh intake link.
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center shadow-sm">
          <div className="inline-flex items-center justify-center size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 mb-4">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Thank you for the details!
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            Your onboarding information was sent successfully. Our team will
            review it and follow up shortly.
          </p>
        </div>
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200">
            Client onboarding
            <ChevronRight className="size-3" />
            Intake form
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-3">
            Tell us about your project
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            {intake.workspaceName
              ? `Workspace: ${intake.workspaceName}`
              : 'Share the details so we can align on goals and scope.'}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 min-w-0">
          <div className="hidden lg:block lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Progress
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {progress}%
                </div>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-blue-600 to-blue-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-6 space-y-4">
                {steps.map((item, index) => {
                  const isComplete = index < currentStep;
                  const isActive = index === currentStep;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentStep(index)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-colors text-left ${
                        isActive
                          ? 'border-blue-500/60 bg-blue-50 dark:bg-blue-500/10'
                          : 'border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                      }`}
                    >
                      <span className="mt-0.5">
                        {isComplete ? (
                          <CheckCircle2 className="size-4 text-green-500" />
                        ) : (
                          <Circle
                            className={`size-4 ${
                              isActive
                                ? 'text-blue-500'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          />
                        )}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        <span className="block text-xs text-slate-600 dark:text-slate-300">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-700 dark:text-slate-200">
              <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                Helpful tips
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Share as much detail as you can.</li>
                <li>Budgets and timelines can be rough estimates.</li>
                <li>You can review everything before submitting.</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-8 min-w-0">
            <div className="lg:hidden mb-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {progress}%
                  </p>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-blue-600 to-blue-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div className="flex w-full gap-2 overflow-x-auto no-scrollbar pb-1">
                {steps.map((item, index) => {
                  const isActive = index === currentStep;
                  const isComplete = index < currentStep;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentStep(index)}
                      className={`shrink-0 px-3 py-2 rounded-full border text-xs font-medium transition-colors ${
                        isActive
                          ? 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-500/10'
                          : isComplete
                            ? 'border-emerald-500/40 text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {index + 1}. {item.title}
                    </button>
                  );
                })}
              </div>
            </div>
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6"
            >
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {step.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {step.description}
                </p>
              </div>

              {step.id === 'contact' && (
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Your name
                    </label>
                    <input
                      value={formData.clientName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          clientName: e.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="Jane Smith"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Company
                    </label>
                    <input
                      value={formData.company}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          company: e.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="Acme Inc"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="you@company.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Phone
                    </label>
                    <input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                </div>
              )}

              {step.id === 'business' && (
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Website
                    </label>
                    <input
                      value={formData.website}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Industry
                    </label>
                    <input
                      value={formData.industry}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          industry: e.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="Fintech, Health, E-commerce"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Project name
                    </label>
                    <input
                      value={formData.projectName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          projectName: e.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="New brand website"
                    />
                  </div>
                </div>
              )}

              {step.id === 'vision' && (
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Goals & vision
                    </label>
                    <textarea
                      value={formData.goals}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          goals: e.target.value,
                        }))
                      }
                      className={textAreaClassName}
                      placeholder="Describe the outcomes you want to achieve"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Target audience
                    </label>
                    <textarea
                      value={formData.targetAudience}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          targetAudience: e.target.value,
                        }))
                      }
                      className={textAreaClassName}
                      placeholder="Who are you building this for?"
                    />
                  </div>
                </div>
              )}

              {step.id === 'scope' && (
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Budget range
                    </label>
                    <input
                      value={formData.budget}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          budget: e.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="$15k - $30k"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Desired timeline
                    </label>
                    <input
                      value={formData.timeline}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          timeline: e.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="6-8 weeks"
                    />
                  </div>
                </div>
              )}

              {step.id === 'brand' && (
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Brand guidelines
                    </label>
                    <textarea
                      value={formData.brandGuidelines}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          brandGuidelines: e.target.value,
                        }))
                      }
                      className={textAreaClassName}
                      placeholder="Colors, tone, style references"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Competitors
                    </label>
                    <textarea
                      value={formData.competitors}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          competitors: e.target.value,
                        }))
                      }
                      className={textAreaClassName}
                      placeholder="Who should we look at for inspiration?"
                    />
                  </div>
                </div>
              )}

              {step.id === 'success' && (
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Success metrics
                    </label>
                    <textarea
                      value={formData.successMetrics}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          successMetrics: e.target.value,
                        }))
                      }
                      className={textAreaClassName}
                      placeholder="How will you measure results?"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Additional notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className={textAreaClassName}
                      placeholder="Anything else we should know?"
                    />
                  </div>
                </div>
              )}

              {step.id === 'review' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-sm text-slate-600 dark:text-slate-300 grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Contact
                      </p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {formData.clientName || 'Not provided'}
                      </p>
                      <p>{formData.email || 'No email'}</p>
                      <p>{formData.phone || 'No phone'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Company
                      </p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {formData.company || 'Not provided'}
                      </p>
                      <p>{formData.website || 'No website'}</p>
                      <p>{formData.industry || 'No industry'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Project
                      </p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {formData.projectName || 'Not provided'}
                      </p>
                      <p>Budget: {formData.budget || 'Not provided'}</p>
                      <p>Timeline: {formData.timeline || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Vision
                      </p>
                      <p>Goals: {formData.goals || 'Not provided'}</p>
                      <p>
                        Audience: {formData.targetAudience || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Brand
                      </p>
                      <p>
                        Guidelines: {formData.brandGuidelines || 'Not provided'}
                      </p>
                      <p>
                        Competitors: {formData.competitors || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Success
                      </p>
                      <p>{formData.successMetrics || 'Not provided'}</p>
                      <p>{formData.notes || 'No notes'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-50"
                >
                  Back
                </button>
                <div className="flex items-center gap-3">
                  {!isFinalStep && (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-5 py-2 rounded-md bg-linear-to-br from-blue-600 to-blue-500 text-white text-sm"
                    >
                      Continue
                    </button>
                  )}
                  {isFinalStep && (
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-5 py-2 rounded-md bg-linear-to-br from-blue-600 to-blue-500 text-white text-sm"
                    >
                      {isPending ? 'Submitting...' : 'Submit Intake'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientIntake;
