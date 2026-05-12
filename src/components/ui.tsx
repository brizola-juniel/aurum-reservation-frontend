import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'sidebar';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant;
  mobileFullWidth?: boolean;
};

const buttonBaseClass =
  'pointer-events-auto relative z-10 inline-flex min-h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-md border-0 px-3.5 py-2.5 font-extrabold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-[0.64]';

const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: 'bg-aurum-primary text-white hover:bg-aurum-primary-strong focus-visible:outline-aurum-primary',
  secondary: 'bg-aurum-page text-aurum-text hover:bg-aurum-soft focus-visible:outline-aurum-primary',
  danger: 'bg-aurum-danger text-white hover:bg-aurum-danger-strong focus-visible:outline-aurum-danger',
  sidebar: 'border border-white/15 bg-transparent text-white hover:bg-white/10 focus-visible:outline-aurum-accent'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, mobileFullWidth = false, type = 'button', variant = 'primary', ...props },
  ref
) {
  return (
    <button
      className={cx(buttonBaseClass, buttonVariantClass[variant], mobileFullWidth && 'max-[520px]:w-full', className)}
      ref={ref}
      type={type}
      {...props}
    />
  );
});

type IconButtonVariant = 'neutral' | 'soft' | 'danger';
type IconButtonSize = 'md' | 'lg';

type IconButtonProps = ComponentPropsWithoutRef<'button'> & {
  size?: IconButtonSize;
  variant?: IconButtonVariant;
};

const iconButtonBaseClass =
  'inline-flex shrink-0 items-center justify-center rounded-md font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-[0.64]';

const iconButtonSizeClass: Record<IconButtonSize, string> = {
  md: 'size-[38px]',
  lg: 'size-10'
};

const iconButtonVariantClass: Record<IconButtonVariant, string> = {
  neutral:
    'border border-aurum-border bg-white text-aurum-muted hover:border-aurum-primary hover:text-aurum-primary focus-visible:outline-aurum-primary',
  soft: 'border-0 bg-aurum-page text-aurum-text hover:bg-aurum-soft focus-visible:outline-aurum-primary',
  danger:
    'border border-aurum-danger bg-aurum-danger text-white hover:bg-aurum-danger-strong focus-visible:outline-aurum-danger'
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, size = 'md', type = 'button', variant = 'neutral', ...props },
  ref
) {
  return (
    <button
      className={cx(iconButtonBaseClass, iconButtonSizeClass[size], iconButtonVariantClass[variant], className)}
      ref={ref}
      type={type}
      {...props}
    />
  );
});

export const fieldControlClass =
  'min-h-[42px] w-full rounded-md border border-aurum-control bg-white px-3 py-2.5 text-aurum-text outline-none focus:border-aurum-primary focus:ring-[3px] focus:ring-aurum-primary/15';

type FieldProps = {
  children: ReactNode;
  className?: string;
  controlId?: string | undefined;
  error?: ReactNode;
  errorId?: string | undefined;
  help?: ReactNode;
  helpId?: string | undefined;
  label: ReactNode;
};

export function Field({ children, className, controlId, error, errorId, help, helpId, label }: FieldProps) {
  return (
    <div className={cx('grid gap-[7px] text-[0.88rem] font-bold text-aurum-text', className)}>
      <label htmlFor={controlId}>{label}</label>
      {children}
      {help ? <HelpText id={helpId}>{help}</HelpText> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

type TextProps = {
  children: ReactNode;
  id?: string | undefined;
};

export function FieldError({ children, id }: TextProps) {
  return (
    <small className="text-[0.78rem] font-bold text-aurum-danger" id={id}>
      {children}
    </small>
  );
}

export function HelpText({ children, id }: TextProps) {
  return (
    <small className="text-[0.78rem] font-semibold text-aurum-muted" id={id}>
      {children}
    </small>
  );
}

export function FeedbackMessage({ children }: { children: ReactNode }) {
  return (
    <p
      className="m-0 rounded-md border border-aurum-danger/30 bg-aurum-danger-soft px-3 py-2.5 text-[0.9rem] font-bold text-aurum-danger"
      role="alert"
    >
      {children}
    </p>
  );
}
