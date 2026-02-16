import React from 'react';
import clsx from 'clsx';

const Card = ({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  className,
  noPadding = false,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow-md border border-gray-200',
        className
      )}
      {...props}
    >
      {(title || headerAction) && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      <div className={clsx(!noPadding && 'px-6 py-4')}>{children}</div>

      {footer && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
