import React from 'react';

function Button({
  variant = 'secondary',
  size = 'md',
  full = false,
  loading = false,
  type = 'button',
  className = '',
  disabled,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold select-none transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--ring) disabled:cursor-not-allowed disabled:opacity-50 enabled:active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0 ${
        size === 'lg'
          ? 'min-h-14 px-7 text-lg'
          : size === 'sm'
            ? 'min-h-11 px-3 text-sm lg:min-h-9'
            : 'min-h-11 min-w-11 px-5 text-base'
      } ${
        variant === 'primary'
          ? 'bg-gold text-ink border border-(--gold-edge) shadow-(--shadow-btn) enabled:hover:bg-gold-hover disabled:bg-[#e7dfd0] disabled:text-ink disabled:border-[#cfc3ab] disabled:shadow-none'
          : variant === 'danger'
            ? 'bg-danger text-white shadow-(--shadow-btn) enabled:hover:bg-[#991b1b] disabled:bg-[#e7dfd0] disabled:text-ink disabled:shadow-none'
            : variant === 'ghost'
              ? 'bg-transparent text-current enabled:hover:bg-current/10 underline-offset-4'
              : variant === 'outline'
                ? 'bg-transparent text-paper border border-paper/60 shadow-none enabled:hover:bg-paper/10'
                : 'bg-card text-ink border border-line-strong shadow-(--shadow-btn) enabled:hover:bg-white disabled:bg-[#e7dfd0] disabled:text-ink disabled:border-[#cfc3ab] disabled:shadow-none'
      } ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && (
        <svg
          className='h-4 w-4 animate-spin'
          viewBox='0 0 24 24'
          fill='none'
          aria-hidden='true'
        >
          <circle
            cx='12'
            cy='12'
            r='9'
            stroke='currentColor'
            strokeWidth='3'
            opacity='0.3'
          />
          <path
            d='M21 12a9 9 0 0 0-9-9'
            stroke='currentColor'
            strokeWidth='3'
            strokeLinecap='round'
          />
        </svg>
      )}
      {children}
    </button>
  );
}

export default Button;
