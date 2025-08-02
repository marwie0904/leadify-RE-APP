'use client';

import * as React from 'react';
import { Control, FieldPath, FieldValues, useController, UseControllerProps } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input, InputProps } from '@/components/ui/input';
import { FormControl, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { CheckCircle2, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

interface ValidatedInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<InputProps, 'name' | 'defaultValue' | 'value' | 'onChange' | 'type'>,
    UseControllerProps<TFieldValues, TName> {
  label?: string;
  description?: string;
  showSuccess?: boolean;
  debounceMs?: number;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  showPasswordToggle?: boolean;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  showRequiredIndicator?: boolean;
}

export function ValidatedInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  rules,
  defaultValue,
  shouldUnregister,
  label,
  description,
  showSuccess = true,
  debounceMs = 300,
  className,
  type = 'text',
  showPasswordToggle = true,
  validateOnBlur = true,
  validateOnChange = true,
  showRequiredIndicator = true,
  disabled,
  ...props
}: ValidatedInputProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error, isDirty, isTouched, isValidating },
    formState: { isSubmitting }
  } = useController({
    name,
    control,
    rules,
    defaultValue,
    shouldUnregister
  });

  const [localValidating, setLocalValidating] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : type;

  const debouncedValidation = useDebouncedCallback(
    () => {
      setLocalValidating(false);
    },
    debounceMs
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    field.onChange(e);
    if (validateOnChange && !error) {
      setLocalValidating(true);
      debouncedValidation();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    field.onBlur();
    if (validateOnBlur) {
      setLocalValidating(false);
    }
  };

  const showValidating = (isValidating || localValidating) && !error;
  const showError = error && (isTouched || isSubmitting);
  const showSuccessIcon = showSuccess && isDirty && !error && !showValidating && isTouched;

  const isRequired = rules?.required || false;
  const isDisabled = disabled || isSubmitting;

  return (
    <FormItem className="space-y-2">
      {label && (
        <FormLabel htmlFor={name} className={cn(error && 'text-destructive')}>
          {label}
          {showRequiredIndicator && isRequired && (
            <span className="ml-1 text-destructive" aria-label="required">
              *
            </span>
          )}
        </FormLabel>
      )}
      <FormControl>
        <div className="relative">
          <Input
            {...field}
            {...props}
            id={name}
            type={inputType}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isDisabled}
            className={cn(
              showError && "border-destructive focus:ring-destructive",
              showSuccessIcon && "border-green-500 focus:ring-green-500",
              isPasswordField && showPasswordToggle && "pr-10",
              (showValidating || showError || showSuccessIcon) && "pr-10",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${name}-error` : description ? `${name}-description` : undefined
            }
          />
          
          <div className="absolute right-0 top-0 flex h-full items-center">
            {/* Password toggle button */}
            {isPasswordField && showPasswordToggle && !showValidating && !showError && !showSuccessIcon && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="mr-3 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
            
            {/* Status icons */}
            <div className="mr-3">
              {showValidating && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {showError && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              {showSuccessIcon && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>
        </div>
      </FormControl>
      {description && !error && (
        <FormDescription id={`${name}-description`}>
          {description}
        </FormDescription>
      )}
      {showError && (
        <FormMessage id={`${name}-error`} />
      )}
    </FormItem>
  );
}

/**
 * Validated input without form wrapper for inline usage
 */
export function ValidatedInputInline<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  rules,
  defaultValue,
  shouldUnregister,
  showSuccess = true,
  debounceMs = 300,
  className,
  type = 'text',
  showPasswordToggle = true,
  disabled,
  ...props
}: Omit<ValidatedInputProps<TFieldValues, TName>, 'label' | 'description'>) {
  const {
    field,
    fieldState: { error, isDirty, isTouched, isValidating },
    formState: { isSubmitting }
  } = useController({
    name,
    control,
    rules,
    defaultValue,
    shouldUnregister
  });

  const [localValidating, setLocalValidating] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : type;

  const debouncedValidation = useDebouncedCallback(
    () => {
      setLocalValidating(false);
    },
    debounceMs
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    field.onChange(e);
    setLocalValidating(true);
    debouncedValidation();
  };

  const showValidating = (isValidating || localValidating) && !error;
  const showError = error && (isTouched || isSubmitting);
  const showSuccessIcon = showSuccess && isDirty && !error && !showValidating && isTouched;

  const isDisabled = disabled || isSubmitting;

  return (
    <div className="relative">
      <Input
        {...field}
        {...props}
        type={inputType}
        onChange={handleChange}
        disabled={isDisabled}
        className={cn(
          showError && "border-destructive focus:ring-destructive",
          showSuccessIcon && "border-green-500 focus:ring-green-500",
          isPasswordField && showPasswordToggle && "pr-20",
          (showValidating || showError || showSuccessIcon) && !isPasswordField && "pr-10",
          className
        )}
        aria-invalid={!!error}
      />
      
      <div className="absolute right-0 top-0 flex h-full items-center">
        {isPasswordField && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="mr-3 text-muted-foreground hover:text-foreground focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
        
        {(showValidating || showError || showSuccessIcon) && (
          <div className="mr-3">
            {showValidating && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {showError && (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            {showSuccessIcon && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}