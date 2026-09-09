interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function FormInput({ label, error, id, className, ...props }: FormInputProps) {
  const inputId = id ?? props.name;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-ink mb-1">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`w-full border rounded-lg px-3.5 py-2.5 bg-white text-ink placeholder:text-ink/30 outline-none transition focus:ring-2 focus:ring-saffron focus:border-saffron ${
          error ? "border-red-400" : "border-gold/40"
        } ${className ?? ""}`}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-red-600 text-xs mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
