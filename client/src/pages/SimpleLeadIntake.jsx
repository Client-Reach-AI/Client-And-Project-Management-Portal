import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, Send } from 'lucide-react';
import { useClientIntakeLookup } from '../hooks/useQueries';
import {
  useCreatePublicClientIntake,
  useSubmitClientIntake,
} from '../hooks/useMutations';

const BRAND_COLOR = '#14A3F6';
const SUCCESS_COLOR = '#10B981';

const initialFormData = {
  name: '',
  email: '',
};

const SimpleLeadIntake = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const workspaceIdParam = searchParams.get('workspaceId');
  const srcParam = searchParams.get('src');
  const normalizedSrc = typeof srcParam === 'string' ? srcParam.trim() : '';

  const [intakeToken, setIntakeToken] = useState(tokenParam);
  const [publicInitError, setPublicInitError] = useState(null);
  const [step, setStep] = useState('form');
  const [formData, setFormData] = useState(initialFormData);
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
          setPublicInitError(error?.message || 'Failed to start lead form');
        }
      }
    };

    initializePublicIntake();

    return () => {
      isActive = false;
    };
  }, [tokenParam, intakeToken, workspaceIdParam, createPublicIntake]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = 'Invalid email address';
    }

    if (!normalizedSrc) {
      nextErrors.src = 'This link is missing src. Please request a proper link.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const toastId = toast.loading('Submitting your details...');

    try {
      await submitIntake({
        token: intakeToken,
        payload: {
          source: 'PUBLIC',
          src: normalizedSrc,
          name: formData.name,
          email: formData.email,
        },
      });
      toast.success('Your details were submitted successfully.', { id: toastId });
      setStep('success');
    } catch (error) {
      toast.error(
        error?.message || 'Something went wrong. Please try again.',
        { id: toastId }
      );
    }
  };

  if (!intakeToken && !workspaceIdParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
        <div className="max-w-lg w-full p-8 text-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
          <h1 className="text-2xl font-semibold">Invalid form link</h1>
          <p className="text-sm text-gray-400 mt-2">
            Please request a new lead form link from your workspace admin.
          </p>
        </div>
      </div>
    );
  }

  if (!intakeToken && workspaceIdParam && !publicInitError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-gray-300">
        Preparing lead form...
      </div>
    );
  }

  if (publicInitError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
        <div className="max-w-lg w-full p-8 text-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
          <h1 className="text-2xl font-semibold">Form unavailable</h1>
          <p className="text-sm text-gray-400 mt-2">{publicInitError}</p>
        </div>
      </div>
    );
  }

  if (isLoading || isPublicPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-gray-300">
        Loading lead form...
      </div>
    );
  }

  if (isError || !intake) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
        <div className="max-w-lg w-full p-8 text-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
          <h1 className="text-2xl font-semibold">Form unavailable</h1>
          <p className="text-sm text-gray-400 mt-2">
            This link may be expired or already used.
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
          <div className="flex flex-col leading-none ml-[-12px]">
            <span className="text-3xl font-bold text-white">Client</span>
            <span className="text-3xl font-bold text-white mt-[-8px]">
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
        {step === 'form' && (
          <form
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto space-y-6 p-8 rounded-3xl border border-white/10 shadow-2xl bg-white/5 backdrop-blur-md"
          >
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2 text-white">
                Unlock Your Free Access
              </h2>
              <p className="text-gray-400">
                Share your details to get the requested resource.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Your Name *
                </label>
                <input
                  type="text"
                  className={`w-full bg-white/5 border ${
                    errors.name ? 'border-red-500' : 'border-white/10'
                  } rounded-xl px-4 py-3 focus:outline-none focus:border-[#14A3F6] transition-all hover:bg-white/10`}
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(event) => updateField('name', event.target.value)}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  className={`w-full bg-white/5 border ${
                    errors.email ? 'border-red-500' : 'border-white/10'
                  } rounded-xl px-4 py-3 focus:outline-none focus:border-[#14A3F6] transition-all hover:bg-white/10`}
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(event) =>
                    updateField('email', event.target.value)
                  }
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <input type="hidden" value={normalizedSrc} readOnly />

              {errors.src && (
                <p className="text-red-500 text-xs mt-1">{errors.src}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: BRAND_COLOR,
                boxShadow: `0 10px 30px -10px ${BRAND_COLOR}80`,
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Get Instant Access <Send className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="p-8 rounded-3xl text-center max-w-xl mx-auto border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_20px_rgba(49,145,196,0.3)]">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full flex items-center justify-center border border-[#10B981]/20 bg-[#10B981]/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle
                  className="w-12 h-12 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                  style={{ color: SUCCESS_COLOR }}
                />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-4">You Got It!</h2>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              Your free asset is flying to your inbox right now. <br />
              Please check your email (and spam folder just in case).
            </p>
          </div>
        )}
      </div>

      <div className="mt-12 text-center text-gray-600 text-xs">
        <p>&copy; {new Date().getFullYear()} ClientReach.ai. All rights reserved.</p>
      </div>
    </div>
  );
};

export default SimpleLeadIntake;
