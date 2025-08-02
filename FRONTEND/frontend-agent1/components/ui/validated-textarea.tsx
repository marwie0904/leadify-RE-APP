'use client';

import * as React from 'react';
import { Control, FieldPath, FieldValues, useController, UseControllerProps } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Textarea, TextareaProps } from '@/components/ui/textarea';
import { FormControl, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

interface ValidatedTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<TextareaProps, 'name' | 'defaultValue' | 'value' | 'onChange'>,
    UseControllerProps<TFieldValues, TName> {
  label?: string;
  description?: string;
  showSuccess?: boolean;
  debounceMs?: number;
  showCharacterCount?: boolean;
  maxLength?: number;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  showRequiredIndicator?: boolean;
}

export function ValidatedTextarea<
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
  showCharacterCount = false,
  maxLength,
  className,
  validateOnBlur = true,
  validateOnChange = true,
  showRequiredIndicator = true,
  disabled,
  ...props
}: ValidatedTextareaProps<TFieldValues, TName>) {
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
  const [characterCount, setCharacterCount] = React.useState(
    field.value?.length || 0
  );

  const debouncedValidation = useDebouncedCallback(
    () => {
      setLocalValidating(false);
    },
    debounceMs
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Enforce maxLength if specified
    if (maxLength && value.length > maxLength) {
      return;
    }
    
    field.onChange(e);
    setCharacterCount(value.length);
    
    if (validateOnChange && !error) {
      setLocalValidating(true);
      debouncedValidation();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
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
  
  // Calculate remaining characters
  const remainingChars = maxLength ? maxLength - characterCount : null;
  const isNearLimit = remainingChars !== null && remainingChars <= 20;
  const isAtLimit = remainingChars === 0;

  return (
    <FormItem className="space-y-2">
      <div className="flex items-center justify-between">
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
        {showCharacterCount && maxLength && (
          <span 
            className={cn(
              "text-sm text-muted-foreground",
              isNearLimit && !isAtLimit && "text-orange-500",
              isAtLimit && "text-destructive"
            )}
          >
            {characterCount}/{maxLength}
          </span>
        )}
      </div>
      <FormControl>
        <div className="relative">
          <Textarea
            {...field}
            {...props}
            id={name}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isDisabled}
            maxLength={maxLength}
            className={cn(
              showError && "border-destructive focus:ring-destructive",
              showSuccessIcon && "border-green-500 focus:ring-green-500",
              (showValidating || showError || showSuccessIcon) && "pr-10",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${name}-error` : description ? `${name}-description` : undefined
            }
          />
          
          {(showValidating || showError || showSuccessIcon) && (
            <div className="absolute right-3 top-3">
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
 * Auto-resizing validated textarea
 */
export function ValidatedAutoResizeTextarea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  minRows = 3,
  maxRows = 10,
  ...props
}: ValidatedTextareaProps<TFieldValues, TName> & {
  minRows?: number;
  maxRows?: number;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate scrollHeight properly
    textarea.style.height = 'auto';
    
    // Calculate new height
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
    const minHeight = minRows * lineHeight;
    const maxHeight = maxRows * lineHeight;
    const scrollHeight = textarea.scrollHeight;
    
    // Set new height within bounds
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    
    // Show scrollbar if content exceeds maxHeight
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [minRows, maxRows]);

  React.useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  const originalOnChange = props.onChange;
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (originalOnChange) {
      originalOnChange(e);
    }
    adjustHeight();
  };

  return (
    <ValidatedTextarea
      {...props}
      onChange={handleChange}
      rows={minRows}
      style={{
        resize: 'none',
        transition: 'height 0.1s ease',
      }}
    />
  );
}