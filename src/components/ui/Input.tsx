import {
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  forwardRef,
} from "react";
import clsx from "clsx";

export interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldWrapperProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, required, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-brown">
            {label} {required && <span className="text-maroon">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full rounded-sm border bg-ivory px-3.5 py-2.5 text-sm text-brown placeholder:text-brown-light/50 outline-none transition focus:border-gold-dark focus:ring-2 focus:ring-gold-light",
            error ? "border-red-500" : "border-cream-dark",
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-brown-light">{hint}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldWrapperProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, required, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-brown">
            {label} {required && <span className="text-maroon">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full rounded-sm border bg-ivory px-3.5 py-2.5 text-sm text-brown placeholder:text-brown-light/50 outline-none transition focus:border-gold-dark focus:ring-2 focus:ring-gold-light",
            error ? "border-red-500" : "border-cream-dark",
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-brown-light">{hint}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    FieldWrapperProps {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, required, id, children, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-brown">
            {label} {required && <span className="text-maroon">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full rounded-sm border bg-ivory px-3.5 py-2.5 text-sm text-brown outline-none transition focus:border-gold-dark focus:ring-2 focus:ring-gold-light",
            error ? "border-red-500" : "border-cream-dark",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {hint && !error && <p className="text-xs text-brown-light">{hint}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";
