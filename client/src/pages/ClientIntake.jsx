import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import ClientProfileForm, {
  initialClientProfileForm,
} from '../components/ClientProfileForm';
import { useClientIntakeLookup } from '../hooks/useQueries';
import { useCreatePublicClientIntake, useSubmitClientIntake } from '../hooks/useMutations';

const BRAND_COLOR = '#14A3F6';
const SUCCESS_COLOR = '#10B981';

const ClientIntake = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const workspaceIdParam = searchParams.get('workspaceId');

  const [intakeToken, setIntakeToken] = useState(tokenParam);
  const [publicInitError, setPublicInitError] = useState(null);
  const [step, setStep] = useState('form');
  const [formData, setFormData] = useState(initialClientProfileForm);
  const [errors, setErrors] = useState({});

  const {
    data: intake,
    isLoading,
    isError,
  } = useClientIntakeLookup(intakeToken, {
    enabled: Boolean(intakeToken),
    retry: false,
  });

  const { mutateAsync: submitIntake, isPending } = useSubmitClientIntake();
  const { mutateAsync: createPublicIntake, isPending: isPublicPending } =
    useCreatePublicClientIntake();

  useEffect(() => {
    setIntakeToken(tokenParam);
  }, [tokenParam]);

  useEffect(() => {
    let isActive = true;

    const initializePublicIntake = async () => {
      if (tokenParam || intakeToken || !workspaceIdParam) return;

      try {
        const result = await createPublicIntake({
          workspaceId: workspaceIdParam,
        });
        if (isActive) {
          setIntakeToken(result?.token || null);
          setPublicInitError(null);
        }
      } catch (error) {
        if (isActive) {
          setPublicInitError(error?.message || 'Failed to start client intake');
        }
      }
    };

    initializePublicIntake();

    return () => {
      isActive = false;
    };
  }, [tokenParam, intakeToken, workspaceIdParam, createPublicIntake]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Client name is required';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = 'Invalid email address';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const toastId = toast.loading('Submitting client intake...');

    try {
      await submitIntake({
        token: intakeToken,
        payload: {
          source: 'INTAKE',
          name: formData.name.trim(),
          company: formData.company.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          website: formData.website.trim(),
          industry: formData.industry.trim(),
          contactName: formData.contactName.trim(),
          address: formData.address.trim(),
          goals: formData.goals.trim(),
          budget: formData.budget.trim(),
          timeline: formData.timeline.trim(),
          targetAudience: formData.targetAudience.trim(),
          brandGuidelines: formData.brandGuidelines.trim(),
          competitors: formData.competitors.trim(),
          successMetrics: formData.successMetrics.trim(),
          notes: formData.notes.trim(),
        },
      });
      toast.success('Client intake submitted.', { id: toastId });
      setStep('success');
    } catch (error) {
      toast.error(error?.message || 'Failed to submit client intake.', {
        id: toastId,
      });
    }
  };

  if (!intakeToken && !workspaceIdParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
        <div className="max-w-lg w-full p-8 text-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
          <h1 className="text-2xl font-semibold">Invalid form link</h1>
          <p className="text-sm text-gray-400 mt-2">
            Please request a new client intake link.
          </p>
        </div>
      </div>
    );
  }

  if (!intakeToken && workspaceIdParam && !publicInitError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-gray-300">
        Preparing client form...
      </div>
    );
  }

  if (publicInitError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
        <div className="max-w-lg w-full p-8 text-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
          <h1 className="text-2xl font-semibold">Invalid form link</h1>
          <p className="text-sm text-gray-400 mt-2">{publicInitError}</p>
        </div>
      </div>
    );
  }

  if (isLoading || isPublicPending) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 bg-black text-gray-300">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading client form...
      </div>
    );
  }

  if (isError || !intake) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
        <div className="max-w-lg w-full p-8 text-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
          <h1 className="text-2xl font-semibold">Invalid form link</h1>
          <p className="text-sm text-gray-400 mt-2">
            This client intake link is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#FFFFFD] flex flex-col items-center justify-center py-6 px-4 sm:px-6">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <img
            src="/clientreachai.logo.png"
            alt="ClientReach.ai Logo"
            className="h-14 w-auto object-contain"
          />
          <div className="flex flex-col leading-none -ml-3">
            <span className="text-3xl font-bold text-white">Client</span>
            <span className="text-3xl font-bold text-white -mt-2">
              Reach
              <span
                className="transition-all duration-300 hover:drop-shadow-[0_0_15px_rgba(20,163,246,0.8)]"
                style={{ color: BRAND_COLOR }}
              >
                .ai
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          {step === 'form' ? (
            <ClientProfileForm
              formData={formData}
              onFieldChange={handleFieldChange}
              onSubmit={handleSubmit}
              isSubmitting={isPending}
              showCancel={false}
              title="Client Intake Form"
              description={
                intake.clientName
                  ? `Share the project details for ${intake.clientName}.`
                  : `Share your client details for ${intake.workspaceName || 'this workspace'}.`
              }
              errors={errors}
              containerClassName="max-w-3xl mx-auto space-y-5"
              labelClassName="block text-sm font-medium text-gray-300 mb-1.5"
              inputClassName="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#14A3F6] transition-all hover:bg-white/10"
              textAreaClassName="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 h-24 focus:outline-none focus:border-[#14A3F6] transition-all hover:bg-white/10"
              inputErrorClassName="border-red-500"
              textAreaErrorClassName="border-red-500"
              actionsClassName="pt-2"
              submitLabel="Submit"
              submittingLabel="Submitting..."
              submitButtonClassName="w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[#14A3F6]"
            />
          ) : (
            <div className="p-8 rounded-3xl text-center max-w-xl mx-auto border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_20px_rgba(49,145,196,0.3)]">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center border border-[#10B981]/20 bg-[#10B981]/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle className="h-10 w-10" style={{ color: SUCCESS_COLOR }} />
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-4">Submission received</h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                Your client intake has been sent successfully. Someone from the team can now review it and continue the project setup.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 text-center text-gray-600 text-xs">
        <p>
          &copy; {new Date().getFullYear()} ClientReach.ai. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ClientIntake;