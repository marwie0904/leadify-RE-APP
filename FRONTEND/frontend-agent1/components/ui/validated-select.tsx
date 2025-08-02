'use client';

import * as React from 'react';
import { Control, FieldPath, FieldValues, useController, UseControllerProps } from 'react-hook-form';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { FormControl, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface ValidatedSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends UseControllerProps<TFieldValues, TName> {
  label?: string;
  description?: string;
  placeholder?: string;
  options?: SelectOption[];
  optionGroups?: SelectOptionGroup[];
  showSuccess?: boolean;
  showRequiredIndicator?: boolean;
  disabled?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
  searchable?: boolean;
  clearable?: boolean;
}

export function ValidatedSelect<
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
  placeholder = 'Select an option',
  options = [],
  optionGroups = [],
  showSuccess = true,
  showRequiredIndicator = true,
  disabled,
  className,
  onValueChange,
  searchable = false,
  clearable = false,
}: ValidatedSelectProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error, isDirty, isTouched },
    formState: { isSubmitting }
  } = useController({
    name,
    control,
    rules,
    defaultValue,
    shouldUnregister
  });

  const [searchQuery, setSearchQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);

  const showError = error && (isTouched || isSubmitting);
  const showSuccessIcon = showSuccess && isDirty && !error && isTouched;
  const isRequired = rules?.required || false;
  const isDisabled = disabled || isSubmitting;

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchQuery) return options;
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery, searchable]);

  const filteredOptionGroups = React.useMemo(() => {
    if (!searchable || !searchQuery) return optionGroups;
    
    return optionGroups
      .map(group => ({
        ...group,
        options: group.options.filter(option =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
      .filter(group => group.options.length > 0);
  }, [optionGroups, searchQuery, searchable]);

  const handleValueChange = (value: string) => {
    if (value === '__clear__' && clearable) {
      field.onChange('');
      onValueChange?.('');
    } else {
      field.onChange(value);
      onValueChange?.(value);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const selectedOption = [...options, ...optionGroups.flatMap(g => g.options)]
    .find(opt => opt.value === field.value);

  const hasOptions = options.length > 0 || optionGroups.length > 0;

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
          <Select
            value={field.value}
            onValueChange={handleValueChange}
            disabled={isDisabled}
            open={isOpen}
            onOpenChange={setIsOpen}
          >
            <SelectTrigger
              id={name}
              className={cn(
                showError && "border-destructive focus:ring-destructive",
                showSuccessIcon && "border-green-500 focus:ring-green-500",
                (showError || showSuccessIcon) && "pr-10",
                className
              )}
              aria-invalid={!!error}
              aria-describedby={
                error ? `${name}-error` : description ? `${name}-description` : undefined
              }
            >
              <SelectValue placeholder={placeholder}>
                {selectedOption?.label || placeholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {searchable && (
                <>
                  <div className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <SelectSeparator />
                </>
              )}
              
              {clearable && field.value && (
                <>
                  <SelectItem value="__clear__" className="text-muted-foreground">
                    Clear selection
                  </SelectItem>
                  <SelectSeparator />
                </>
              )}
              
              {!hasOptions && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No options available
                </div>
              )}
              
              {/* Render flat options */}
              {filteredOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
              
              {/* Render grouped options */}
              {filteredOptionGroups.map((group, index) => (
                <SelectGroup key={`${group.label}-${index}`}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.options.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
              
              {searchable && hasOptions && filteredOptions.length === 0 && filteredOptionGroups.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No options match "{searchQuery}"
                </div>
              )}
            </SelectContent>
          </Select>
          
          {(showError || showSuccessIcon) && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
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
 * Multi-select variant
 */
export function ValidatedMultiSelect<
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
  placeholder = 'Select options',
  options = [],
  showSuccess = true,
  showRequiredIndicator = true,
  disabled,
  className,
  maxSelections,
}: Omit<ValidatedSelectProps<TFieldValues, TName>, 'optionGroups' | 'clearable' | 'searchable' | 'onValueChange'> & {
  maxSelections?: number;
}) {
  const {
    field,
    fieldState: { error, isDirty, isTouched },
    formState: { isSubmitting }
  } = useController({
    name,
    control,
    rules,
    defaultValue: defaultValue || [],
    shouldUnregister
  });

  const selectedValues = Array.isArray(field.value) ? field.value : [];
  const showError = error && (isTouched || isSubmitting);
  const showSuccessIcon = showSuccess && isDirty && !error && isTouched;
  const isRequired = rules?.required || false;
  const isDisabled = disabled || isSubmitting;

  const toggleValue = (value: string) => {
    const currentValues = [...selectedValues];
    const index = currentValues.indexOf(value);
    
    if (index > -1) {
      currentValues.splice(index, 1);
    } else {
      if (!maxSelections || currentValues.length < maxSelections) {
        currentValues.push(value);
      }
    }
    
    field.onChange(currentValues);
  };

  const selectedLabels = options
    .filter(opt => selectedValues.includes(opt.value))
    .map(opt => opt.label)
    .join(', ');

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
          <Select
            value="__multi__"
            disabled={isDisabled}
          >
            <SelectTrigger
              id={name}
              className={cn(
                showError && "border-destructive focus:ring-destructive",
                showSuccessIcon && "border-green-500 focus:ring-green-500",
                className
              )}
              aria-invalid={!!error}
            >
              <SelectValue>
                {selectedLabels || placeholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent",
                    option.disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !option.disabled && toggleValue(option.value)}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    disabled={option.disabled}
                    onChange={() => {}}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
              ))}
              {maxSelections && (
                <div className="px-2 py-1 text-xs text-muted-foreground border-t">
                  {selectedValues.length}/{maxSelections} selected
                </div>
              )}
            </SelectContent>
          </Select>
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