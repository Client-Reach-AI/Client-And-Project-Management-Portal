import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Check,
  Upload,
  X,
  File,
  Globe,
  PhoneCall,
  Settings,
  Code,
} from 'lucide-react';
import { useClientIntakeLookup } from '../hooks/useQueries';
import { useSubmitClientIntake } from '../hooks/useMutations';

const SERVICES = [
  {
    id: 'website_build',
    title: 'Website Build',
    description: 'Custom websites that convert visitors into customers',
    icon: <Globe className="w-8 h-8" />,
  },
  {
    id: 'ai_receptionist',
    title: 'AI Receptionist',
    description: '24/7 intelligent call handling and appointment booking',
    icon: <PhoneCall className="w-8 h-8" />,
  },
  {
    id: 'ai_automation',
    title: 'AI Automation',
    description: 'Automate repetitive tasks and scale your operations',
    icon: <Settings className="w-8 h-8" />,
  },
  {
    id: 'software_build',
    title: 'Software Build',
    description: 'Custom software solutions tailored to your business',
    icon: <Code className="w-8 h-8" />,
  },
];

const INDUSTRIES = [
  'Healthcare',
  'Legal Services',
  'E-commerce',
  'SaaS',
  'Consulting',
  'Real Estate',
  'Dental/Aesthetics',
  'Financial Services',
  'Hospitality',
  'Other',
];

const STEP_TITLES = [
  'Service Selection',
  'Business Details',
  'Requirements',
  'Assets & Booking',
];

const cardClassName =
  'rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl';
const inputClassName =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#3191C4] transition-colors';
const selectClassName =
  'w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3191C4] transition-colors appearance-none';

const StepIndicator = ({ currentStep, titles }) => {
  const progress = ((currentStep - 1) / (titles.length - 1)) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-[#3191C4]">
          Step {currentStep} of {titles.length}
        </span>
        <span className="text-sm font-medium text-gray-400">
          {Math.round(progress)}% Complete
        </span>
      </div>

      <div className="relative h-1 bg-gray-800 rounded-full overflow-hidden mb-8">
        <div
          className="absolute h-full bg-[#3191C4] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between">
        {titles.map((title, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div
              key={title}
              className="flex flex-col items-center flex-1 text-center"
            >
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors
                  ${
                    isActive || isCompleted
                      ? 'bg-[#3191C4] text-white'
                      : 'bg-gray-800 text-gray-500'
                  }
                `}
              >
                {isCompleted ? <Check className="w-6 h-6" /> : stepNum}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  isActive ? 'text-[#3191C4]' : 'text-gray-500'
                }`}
              >
                {title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ServiceSelector = ({ selected, onSelect, onNext }) => (
  <div className="space-y-8">
    <div className="text-center">
      <h2 className="text-4xl font-bold mb-3">Let's Get Started</h2>
      <p className="text-gray-400 text-lg">
        Choose your service to begin your journey with ClientReach AI
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {SERVICES.map((service) => (
        <button
          key={service.id}
          type="button"
          onClick={() => onSelect(service.id)}
          className={`
            ${cardClassName} p-8 rounded-3xl text-left transition-all duration-300 relative
            ${
              selected === service.id
                ? 'border-[#3191C4] bg-[#3191C4]/10 shadow-[0_0_30px_rgba(49,145,196,0.25)]'
                : 'hover:border-white/30'
            }
          `}
        >
          <div
            className={`
              w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors
              ${
                selected === service.id
                  ? 'bg-[#3191C4] text-white'
                  : 'bg-white/5 text-[#3191C4]'
              }
            `}
          >
            {service.icon}
          </div>
          <h3 className="text-xl font-bold mb-2">{service.title}</h3>
          <p className="text-gray-400 leading-relaxed">{service.description}</p>
        </button>
      ))}
    </div>

    <div className="flex justify-end mt-12">
      <button
        type="button"
        disabled={!selected}
        onClick={onNext}
        className={`
          px-12 py-4 rounded-2xl font-bold text-lg transition-all
          ${
            selected
              ? 'bg-[#3191C4] text-white hover:brightness-110 active:scale-95'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        Next Step
      </button>
    </div>
  </div>
);

const BusinessDetails = ({ data, updateData, onNext, onBack }) => {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!data.company_name) newErrors.company_name = 'Company Name is required';
    if (!data.contact_name) newErrors.contact_name = 'Your Name is required';
    if (!data.contact_role) newErrors.contact_role = 'Role is required';
    if (!data.industry) newErrors.industry = 'Industry is required';
    if (
      !data.business_details?.problem_solving ||
      data.business_details.problem_solving.length < 20
    ) {
      newErrors.problem_solving = 'Please provide at least 20 characters';
    }
    if (
      !data.business_details?.success_90_days ||
      data.business_details.success_90_days.length < 20
    ) {
      newErrors.success_90_days = 'Please provide at least 20 characters';
    }
    if (!data.business_details?.launch_date) {
      newErrors.launch_date = 'Launch date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (validate()) onNext();
  };

  const updateDetails = (field, value) => {
    updateData({
      business_details: {
        ...data.business_details,
        [field]: value,
      },
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Business & Project Details</h2>
        <p className="text-gray-400">Tell us a bit about your organization</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Company Name*
          </label>
          <input
            type="text"
            placeholder="Acme Inc."
            className={inputClassName}
            value={data.company_name || ''}
            onChange={(e) => updateData({ company_name: e.target.value })}
          />
          {errors.company_name && (
            <p className="text-red-500 text-xs mt-1">{errors.company_name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Your Name*
            </label>
            <input
              type="text"
              placeholder="John Smith"
              className={inputClassName}
              value={data.contact_name || ''}
              onChange={(e) => updateData({ contact_name: e.target.value })}
            />
            {errors.contact_name && (
              <p className="text-red-500 text-xs mt-1">{errors.contact_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Role/Title*
            </label>
            <input
              type="text"
              placeholder="CEO"
              className={inputClassName}
              value={data.contact_role || ''}
              onChange={(e) => updateData({ contact_role: e.target.value })}
            />
            {errors.contact_role && (
              <p className="text-red-500 text-xs mt-1">{errors.contact_role}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="you@company.com"
              className={inputClassName}
              value={data.email || ''}
              onChange={(e) => updateData({ email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Phone
            </label>
            <input
              type="tel"
              placeholder="+1 555 123 4567"
              className={inputClassName}
              value={data.phone || ''}
              onChange={(e) => updateData({ phone: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Company Website
          </label>
          <input
            type="url"
            placeholder="https://yourcompany.com"
            className={inputClassName}
            value={data.company_website || ''}
            onChange={(e) => updateData({ company_website: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Industry*
          </label>
          <select
            className={selectClassName}
            value={data.industry || ''}
            onChange={(e) => updateData({ industry: e.target.value })}
          >
            <option value="">Select Industry</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
          {errors.industry && (
            <p className="text-red-500 text-xs mt-1">{errors.industry}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            What problem are you solving?*
          </label>
          <textarea
            rows={3}
            placeholder="Describe the main challenge..."
            className={inputClassName}
            value={data.business_details?.problem_solving || ''}
            onChange={(e) => updateDetails('problem_solving', e.target.value)}
          />
          {errors.problem_solving && (
            <p className="text-red-500 text-xs mt-1">
              {errors.problem_solving}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            What does success look like in 90 days?*
          </label>
          <textarea
            rows={3}
            placeholder="Define your metrics..."
            className={inputClassName}
            value={data.business_details?.success_90_days || ''}
            onChange={(e) => updateDetails('success_90_days', e.target.value)}
          />
          {errors.success_90_days && (
            <p className="text-red-500 text-xs mt-1">
              {errors.success_90_days}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Ideal Launch Date*
          </label>
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            className={inputClassName}
            value={data.business_details?.launch_date || ''}
            onChange={(e) => updateDetails('launch_date', e.target.value)}
          />
          {errors.launch_date && (
            <p className="text-red-500 text-xs mt-1">{errors.launch_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            What is your biggest concern about this project?
          </label>
          <textarea
            rows={3}
            placeholder="Share any risks or concerns..."
            className={inputClassName}
            value={data.business_details?.biggest_concern || ''}
            onChange={(e) => updateDetails('biggest_concern', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-between pt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-3 rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="bg-[#3191C4] text-white px-10 py-3 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all"
        >
          Next Step
        </button>
      </div>
    </form>
  );
};

const ServiceQuestions = ({
  serviceType,
  responses,
  industry,
  updateResponses,
  onNext,
  onBack,
}) => {
  const handleChange = (key, value) => {
    updateResponses({ ...responses, [key]: value });
  };

  const renderWebsiteQuestions = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Do you have an existing website?*
        </label>
        <div className="flex gap-4">
          {['Yes', 'No'].map((opt) => (
            <label key={opt} className="flex-1">
              <input
                type="radio"
                name="has_site"
                className="hidden peer"
                checked={responses?.has_site === opt}
                onChange={() => handleChange('has_site', opt)}
              />
              <div className="py-3 px-6 rounded-xl text-center cursor-pointer border border-white/10 peer-checked:border-[#3191C4] peer-checked:bg-[#3191C4]/10 transition-all">
                {opt}
              </div>
            </label>
          ))}
        </div>
      </div>

      {responses?.has_site === 'Yes' && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Current Website URL
          </label>
          <input
            type="url"
            placeholder="https://..."
            className={inputClassName}
            value={responses?.current_url || ''}
            onChange={(e) => handleChange('current_url', e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Required Features*
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'Online Booking',
            'Live Chat',
            'Contact Forms',
            'E-commerce',
            'Blog',
            'Client Portal',
            'Payment Processing',
          ].map((feature) => (
            <label
              key={feature}
              className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer hover:border-white/20"
            >
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-[#3191C4] focus:ring-[#3191C4]"
                checked={(responses?.features || []).includes(feature)}
                onChange={(e) => {
                  const current = responses?.features || [];
                  if (e.target.checked) {
                    handleChange('features', [...current, feature]);
                  } else {
                    handleChange(
                      'features',
                      current.filter((item) => item !== feature)
                    );
                  }
                }}
              />
              <span className="text-sm">{feature}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Design Style Preference*
        </label>
        <select
          className={selectClassName}
          value={responses?.style || ''}
          onChange={(e) => handleChange('style', e.target.value)}
        >
          <option value="">Select Style</option>
          {[
            'Modern/Minimal',
            'Bold/Creative',
            'Corporate',
            'Playful',
            'Luxury',
            'No Preference',
          ].map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderReceptionistQuestions = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Approx daily calls?*
        </label>
        <select
          className={selectClassName}
          value={responses?.daily_calls || ''}
          onChange={(e) => handleChange('daily_calls', e.target.value)}
        >
          <option value="">Select volume</option>
          {['1-10', '10-25', '25-50', '50-100', '100+'].map((volume) => (
            <option key={volume} value={volume}>
              {volume} calls
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Biggest phone frustration?*
        </label>
        <textarea
          rows={3}
          className={inputClassName}
          value={responses?.frustration || ''}
          onChange={(e) => handleChange('frustration', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          What info to collect?*
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            'Contact Info',
            'Service Interest',
            'Booking',
            'Support Request',
          ].map((item) => (
            <label
              key={item}
              className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl"
            >
              <input
                type="checkbox"
                checked={(responses?.data_points || []).includes(item)}
                onChange={(e) => {
                  const current = responses?.data_points || [];
                  if (e.target.checked) {
                    handleChange('data_points', [...current, item]);
                  } else {
                    handleChange(
                      'data_points',
                      current.filter((value) => value !== item)
                    );
                  }
                }}
              />
              <span className="text-sm">{item}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Forwarding Phone Number*
        </label>
        <input
          type="tel"
          placeholder="(XXX) XXX-XXXX"
          className={inputClassName}
          value={responses?.forward_phone || ''}
          onChange={(e) => handleChange('forward_phone', e.target.value)}
        />
      </div>
    </div>
  );

  const renderAutomationQuestions = () => {
    const volumeLabel =
      industry === 'E-commerce'
        ? 'Orders per month'
        : 'Client inquiries per month';
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Top 3 repetitive tasks?*
          </label>
          <textarea
            rows={4}
            className={inputClassName}
            value={responses?.tasks || ''}
            onChange={(e) => handleChange('tasks', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Current tools/software?*
          </label>
          <input
            type="text"
            placeholder="HubSpot, Slack, Sheets..."
            className={inputClassName}
            value={responses?.tools || ''}
            onChange={(e) => handleChange('tools', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {volumeLabel}*
          </label>
          <select
            className={selectClassName}
            value={responses?.volume || ''}
            onChange={(e) => handleChange('volume', e.target.value)}
          >
            <option value="">Select volume</option>
            {['<100', '100-500', '500-1000', '1000+'].map((volume) => (
              <option key={volume} value={volume}>
                {volume}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Ideal automated workflow?*
          </label>
          <textarea
            rows={4}
            className={inputClassName}
            value={responses?.workflow || ''}
            onChange={(e) => handleChange('workflow', e.target.value)}
          />
        </div>
      </div>
    );
  };

  const renderSoftwareQuestions = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Software type?*
        </label>
        <select
          className={selectClassName}
          value={responses?.sw_type || ''}
          onChange={(e) => handleChange('sw_type', e.target.value)}
        >
          <option value="">Select type</option>
          {['Web App', 'Mobile App', 'Desktop', 'API', 'Internal Tool'].map(
            (value) => (
              <option key={value} value={value}>
                {value}
              </option>
            )
          )}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Core problem this solves?*
        </label>
        <textarea
          rows={3}
          className={inputClassName}
          value={responses?.problem || ''}
          onChange={(e) => handleChange('problem', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Key features needed?*
        </label>
        <textarea
          rows={4}
          className={inputClassName}
          value={responses?.sw_features || ''}
          onChange={(e) => handleChange('sw_features', e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-2">Service Requirements</h2>
        <p className="text-gray-400 text-lg">
          Help us understand your specific needs
        </p>
      </div>

      <div className={`${cardClassName} p-8 border-white/5`}>
        {serviceType === 'website_build' && renderWebsiteQuestions()}
        {serviceType === 'ai_receptionist' && renderReceptionistQuestions()}
        {serviceType === 'ai_automation' && renderAutomationQuestions()}
        {serviceType === 'software_build' && renderSoftwareQuestions()}
      </div>

      <div className="flex justify-between mt-12">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-3 rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="bg-[#3191C4] text-white px-10 py-3 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all"
        >
          Next Step
        </button>
      </div>
    </div>
  );
};

const AssetsAndBooking = ({
  files,
  updateFiles,
  onBack,
  onSubmit,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files) {
      const uploadedFiles = Array.from(event.dataTransfer.files).map(
        (file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          url: '#',
        })
      );
      updateFiles([...files, ...uploadedFiles]);
    }
  };

  const handleFileSelect = (event) => {
    if (event.target.files) {
      const uploadedFiles = Array.from(event.target.files).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        url: '#',
      }));
      updateFiles([...files, ...uploadedFiles]);
    }
  };

  const removeFile = (index) => {
    updateFiles(files.filter((_, i) => i !== index));
  };

  const getCalendlyUrl = () => {
    const baseUrl =
      'https://calendly.com/your-username/30min?embed_type=Inline';
    try {
      if (typeof window !== 'undefined' && window.location?.hostname) {
        return `${baseUrl}&embed_domain=${window.location.hostname}`;
      }
    } catch {
      return baseUrl;
    }
    return baseUrl;
  };

  return (
    <div className="space-y-12 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">
          Final Step: Assets & Booking
        </h2>
        <p className="text-gray-400 text-lg">Help us get ready for our call</p>
      </div>

      <section>
        <div className="flex items-center gap-3 mb-6">
          <Upload className="text-[#3191C4]" />
          <h3 className="text-xl font-semibold">Upload Relevant Files</h3>
        </div>

        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={`
            border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer
            ${
              isDragging
                ? 'border-[#3191C4] bg-[#3191C4]/5'
                : 'border-white/10 bg-white/5'
            }
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 text-[#3191C4] mx-auto mb-4" />
          <p className="text-lg font-medium">
            Drag files here or click to browse
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Images, PDFs, Docs up to 10MB
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <File className="w-5 h-5 text-[#3191C4] shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeFile(idx);
                  }}
                  className="p-1 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="h-px bg-white/10" />

      <section>
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle className="text-[#3191C4]" />
          <h3 className="text-xl font-semibold">Schedule Your Strategy Call</h3>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden min-h-150 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[#111111]/50 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center z-10 pointer-events-none">
            <CheckCircle className="w-16 h-16 text-[#3191C4] mb-4" />
            <p className="text-xl font-bold">
              Calendly Integration Placeholder
            </p>
            <p className="text-gray-400 mt-2">
              In production, your custom booking calendar will appear here.
            </p>
          </div>
          <iframe src={getCalendlyUrl()} width="100%" height="600" />
        </div>
      </section>

      <div className="flex justify-between items-center pt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-3 rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="bg-[#3191C4] text-white px-12 py-4 rounded-2xl font-bold text-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(49,145,196,0.35)]"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Complete Onboarding'
          )}
        </button>
      </div>
    </div>
  );
};

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

  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    service_type: undefined,
    company_name: '',
    contact_name: '',
    contact_role: '',
    email: '',
    phone: '',
    company_website: '',
    industry: '',
    business_details: {
      problem_solving: '',
      success_90_days: '',
      launch_date: '',
      biggest_concern: '',
    },
    service_responses: {},
    uploaded_files: [],
    calendly_event_id: '',
  });

  const handleNext = () => {
    if (step === 1 && !formData.service_type) {
      toast.error('Please choose a service to continue.');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const updateFormData = (newData) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleSubmit = async () => {
    try {
      await submitIntake({
        token,
        payload: formData,
      });
      toast.success('Onboarding complete!');
      setIsSubmitted(true);
    } catch (error) {
      toast.error(error?.message || 'Failed to submit onboarding details.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className={`${cardClassName} max-w-lg w-full p-8 text-center`}>
          <h1 className="text-2xl font-semibold text-white">
            Invalid intake link
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Please request a new intake link from your workspace admin.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className={`${cardClassName} p-6 text-sm text-gray-300`}>
          Loading intake form...
        </div>
      </div>
    );
  }

  if (isError || !intake) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className={`${cardClassName} max-w-lg w-full p-8 text-center`}>
          <h1 className="text-2xl font-semibold text-white">
            Intake form unavailable
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            This link may have expired. Please request a fresh intake link.
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <div className={`${cardClassName} p-12 text-center max-w-xl`}>
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-20 h-20 text-[#3191C4]" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Thank you{formData.contact_name ? `, ${formData.contact_name}` : ''}
            !
          </h1>
          <p className="text-lg text-gray-400 mb-8">
            Your project details
            {formData.company_name ? ` for ${formData.company_name}` : ''} have
            been received. We'll review them and follow up shortly.
          </p>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">What happens next:</h3>
            <ul className="text-left space-y-3 text-gray-400">
              <li className="flex items-start gap-3">
                <span className="bg-[#3191C4]/20 text-[#3191C4] p-1 rounded-full text-xs mt-1">
                  1
                </span>
                <span>Our team reviews your submission (24-48h).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-[#3191C4]/20 text-[#3191C4] p-1 rounded-full text-xs mt-1">
                  2
                </span>
                <span>We'll connect during your scheduled strategy call.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-[#3191C4]/20 text-[#3191C4] p-1 rounded-full text-xs mt-1">
                  3
                </span>
                <span>Receive your custom project roadmap.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
            Client Onboarding
          </p>
          <h1 className="text-4xl font-bold mt-3">
            Tell us about your project
          </h1>
          <p className="text-gray-400 mt-3">
            {intake.workspaceName
              ? `Workspace: ${intake.workspaceName}`
              : 'Share the details so we can align on goals and scope.'}
          </p>
        </div>

        <StepIndicator currentStep={step} titles={STEP_TITLES} />

        <div className="mt-12">
          {step === 1 && (
            <ServiceSelector
              selected={formData.service_type}
              onSelect={(type) => updateFormData({ service_type: type })}
              onNext={handleNext}
            />
          )}

          {step === 2 && (
            <BusinessDetails
              data={formData}
              updateData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {step === 3 && (
            <ServiceQuestions
              serviceType={formData.service_type}
              responses={formData.service_responses}
              industry={formData.industry || ''}
              updateResponses={(responses) =>
                updateFormData({ service_responses: responses })
              }
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {step === 4 && (
            <AssetsAndBooking
              files={formData.uploaded_files}
              updateFiles={(files) => updateFormData({ uploaded_files: files })}
              onBack={handleBack}
              onSubmit={handleSubmit}
              isLoading={isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientIntake;
