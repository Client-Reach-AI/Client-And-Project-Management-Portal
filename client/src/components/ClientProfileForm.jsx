export const initialClientProfileForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  industry: '',
  contactName: '',
  address: '',
  goals: '',
  budget: '',
  timeline: '',
  targetAudience: '',
  brandGuidelines: '',
  competitors: '',
  successMetrics: '',
  notes: '',
};

const inputFields = [
  { name: 'name', label: 'Client Name', required: true },
  { name: 'company', label: 'Company' },
  { name: 'contactName', label: 'Primary Contact' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' },
  { name: 'website', label: 'Website' },
  { name: 'industry', label: 'Industry' },
  { name: 'address', label: 'Address' },
  { name: 'budget', label: 'Budget' },
  { name: 'timeline', label: 'Timeline' },
];

const textAreaFields = [
  { name: 'goals', label: 'Project Goals' },
  { name: 'targetAudience', label: 'Target Audience' },
  { name: 'brandGuidelines', label: 'Brand Guidelines' },
  { name: 'competitors', label: 'Competitors' },
  { name: 'successMetrics', label: 'Success Metrics' },
  { name: 'notes', label: 'Notes' },
];

const defaultInputClassName =
  'w-full mt-2 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm';
const defaultTextAreaClassName = `${defaultInputClassName} h-24`;

const ClientProfileForm = ({
  formData,
  onFieldChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save Client',
  submittingLabel = 'Saving...',
  cancelLabel = 'Cancel',
  title,
  description,
  errors = {},
  showCancel = true,
  containerClassName = 'space-y-6',
  actionsClassName = 'flex justify-end gap-3',
  inputClassName = defaultInputClassName,
  textAreaClassName = defaultTextAreaClassName,
  inputErrorClassName = '',
  textAreaErrorClassName = '',
  labelClassName = 'text-sm',
  cancelButtonClassName =
    'px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded',
  submitButtonClassName =
    'px-4 py-2 text-sm bg-linear-to-br from-blue-500 to-blue-600 text-white rounded disabled:opacity-60',
}) => {
  const renderFieldError = (fieldName) =>
    errors[fieldName] ? (
      <p className="mt-1 text-xs text-red-500">{errors[fieldName]}</p>
    ) : null;

  return (
    <form onSubmit={onSubmit} className={containerClassName}>
      {(title || description) && (
        <div>
          {title ? (
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="text-sm hidden text-zinc-500 dark:text-zinc-400 mt-2">
              {description}
            </p>
          ) : null}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {inputFields.map((field) => (
          <div key={field.name}>
            <label className={labelClassName}>
              {field.label}
              {field.required ? ' *' : ''}
            </label>
            <input
              type={field.type || 'text'}
              value={formData[field.name] || ''}
              onChange={(event) => onFieldChange(field.name, event.target.value)}
              className={`${inputClassName} ${
                errors[field.name] ? inputErrorClassName : ''
              }`}
              required={field.required}
            />
            {renderFieldError(field.name)}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {textAreaFields.map((field) => (
          <div key={field.name}>
            <label className={labelClassName}>{field.label}</label>
            <textarea
              value={formData[field.name] || ''}
              onChange={(event) => onFieldChange(field.name, event.target.value)}
              className={`${textAreaClassName} ${
                errors[field.name] ? textAreaErrorClassName : ''
              }`}
            />
            {renderFieldError(field.name)}
          </div>
        ))}
      </div>

      <div className={actionsClassName}>
        {showCancel && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className={cancelButtonClassName}
          >
            {cancelLabel}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className={submitButtonClassName}
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ClientProfileForm;