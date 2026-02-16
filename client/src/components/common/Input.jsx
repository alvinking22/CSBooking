import React from 'react';
import clsx from 'clsx';

const Input = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  disabled = false,
  icon: Icon,
  className,
  inputClassName,
  ...props
}) => {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(
            'block w-full rounded-lg border shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            Icon && 'pl-10',
            error
              ? 'border-red-300 text-red-900 placeholder-red-300'
              : 'border-gray-300',
            disabled && 'bg-gray-100 cursor-not-allowed',
            inputClassName || 'px-4 py-2'
          )}
          {...props}
        />
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default Input;
