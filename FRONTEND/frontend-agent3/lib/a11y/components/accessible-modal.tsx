'use client';

import React, { 
  useState, 
  useEffect, 
  useRef, 
  createContext, 
  useContext, 
  useCallback,
  useMemo,
  ReactNode,
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { FocusTrap } from '../focus/trap';
import { KeyboardShortcutManager } from '../keyboard/shortcuts';
import { getAnnouncer } from '../screen-reader/announcer';
import { KeyboardShortcut } from '../core/types';

// Modal size variants
export type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen' | 'auto';
export type ModalRole = 'dialog' | 'alertdialog';
export type AnimationType = 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn' | 'none';

export interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  ariaLabel?: string;
  className?: string;
  size?: ModalSize;
  role?: ModalRole;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  hideExternalContent?: boolean;
  initialFocus?: string | HTMLElement;
  returnFocus?: HTMLElement;
  zIndex?: number;
  animationDuration?: number;
  enterAnimation?: AnimationType;
  exitAnimation?: AnimationType;
  announceOnOpen?: string;
  announceOnClose?: string;
  keyboardShortcuts?: KeyboardShortcut[];
  onOpen?: () => void;
  onClosed?: () => void;
  backdropClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  preventScroll?: boolean;
  persistent?: boolean;
}

interface ModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  setModalProps: (props: Partial<AccessibleModalProps>) => void;
}

// Modal context for provider pattern
const ModalContext = createContext<ModalContextType | null>(null);

// Hook to use modal context
export function useModal(): ModalContextType {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

// Modal provider component
export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalProps, setModalProps] = useState<Partial<AccessibleModalProps>>({});

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({
    isOpen,
    openModal,
    closeModal,
    setModalProps,
  }), [isOpen, openModal, closeModal]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      {isOpen && modalProps.children && (
        <AccessibleModal
          {...modalProps}
          isOpen={isOpen}
          onClose={closeModal}
        />
      )}
    </ModalContext.Provider>
  );
}

// Modal stack management
class ModalStack {
  private static instance: ModalStack;
  private stack: Set<string> = new Set();
  private zIndexBase = 1000;

  static getInstance(): ModalStack {
    if (!ModalStack.instance) {
      ModalStack.instance = new ModalStack();
    }
    return ModalStack.instance;
  }

  push(id: string): number {
    this.stack.add(id);
    return this.zIndexBase + this.stack.size;
  }

  remove(id: string): void {
    this.stack.delete(id);
  }

  getCount(): number {
    return this.stack.size;
  }

  isTop(id: string): boolean {
    const stackArray = Array.from(this.stack);
    return stackArray[stackArray.length - 1] === id;
  }
}

// External content management
class ExternalContentManager {
  private hiddenElements: Map<Element, string | null> = new Map();

  hideExternalContent(modalElement: HTMLElement): void {
    // Find the modal's root container (the portal div)
    let modalContainer = modalElement;
    while (modalContainer && modalContainer.parentElement !== document.body) {
      modalContainer = modalContainer.parentElement;
    }
    
    // Find all direct children of body that are not the modal container
    const bodyChildren = Array.from(document.body.children);
    
    for (const element of bodyChildren) {
      if (element !== modalContainer && 
          !element.contains(modalElement) && 
          !modalElement.contains(element)) {
        const currentAriaHidden = element.getAttribute('aria-hidden');
        this.hiddenElements.set(element, currentAriaHidden);
        element.setAttribute('aria-hidden', 'true');
      }
    }
  }

  restoreExternalContent(): void {
    for (const [element, originalValue] of this.hiddenElements) {
      if (document.body.contains(element)) {
        if (originalValue === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', originalValue);
        }
      }
    }
    this.hiddenElements.clear();
  }
}

// Main AccessibleModal component
export function AccessibleModal({
  isOpen,
  onClose,
  children,
  title,
  description,
  ariaLabel,
  className,
  size = 'medium',
  role = 'dialog',
  closeOnEscape = true,
  closeOnBackdropClick = true,
  hideExternalContent = true,
  initialFocus,
  returnFocus,
  zIndex,
  animationDuration = 200,
  enterAnimation = 'fadeIn',
  exitAnimation = 'fadeOut',
  announceOnOpen,
  announceOnClose,
  keyboardShortcuts = [],
  onOpen,
  onClosed,
  backdropClassName,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  preventScroll = true,
  persistent = false,
  ...rest
}: AccessibleModalProps & HTMLAttributes<HTMLDivElement>) {
  const modalRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);
  const keyboardManagerRef = useRef<KeyboardShortcutManager | null>(null);
  const externalContentManagerRef = useRef<ExternalContentManager | null>(null);
  const modalIdRef = useRef<string>(`modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const titleIdRef = useRef<string>(`modal-title-${modalIdRef.current}`);
  const descriptionIdRef = useRef<string>(`modal-description-${modalIdRef.current}`);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const modalStack = ModalStack.getInstance();

  // Determine if reduced motion is preferred
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Calculate z-index
  const computedZIndex = useMemo(() => {
    if (zIndex) return zIndex;
    if (isOpen) {
      return modalStack.push(modalIdRef.current);
    }
    return 1000;
  }, [zIndex, isOpen]);

  // Handle modal opening
  useEffect(() => {
    if (isOpen && !shouldRender) {
      setShouldRender(true);
      setIsAnimating(true);

      // Announce opening if specified
      if (announceOnOpen) {
        const announcer = getAnnouncer();
        announcer.announce(announceOnOpen, { priority: 'assertive' });
      }

      // Call onOpen callback
      if (onOpen) {
        onOpen();
      }

      // Prevent body scroll if requested
      if (preventScroll) {
        document.body.style.overflow = 'hidden';
      }

      // Animation timeout
      const animationTimeout = setTimeout(() => {
        setIsAnimating(false);
      }, prefersReducedMotion ? 0 : animationDuration);

      return () => clearTimeout(animationTimeout);
    }
  }, [isOpen, shouldRender, announceOnOpen, onOpen, preventScroll, prefersReducedMotion, animationDuration]);

  // Handle modal closing
  useEffect(() => {
    if (!isOpen && shouldRender) {
      setIsAnimating(true);

      // Announce closing if specified
      if (announceOnClose) {
        const announcer = getAnnouncer();
        announcer.announce(announceOnClose, { priority: 'assertive' });
      }

      // Remove from modal stack
      modalStack.remove(modalIdRef.current);

      // Restore body scroll if no other modals
      if (preventScroll && modalStack.getCount() === 0) {
        document.body.style.overflow = '';
      }

      // Animation delay before unmounting
      const hideTimeout = setTimeout(() => {
        setShouldRender(false);
        setIsAnimating(false);
        
        if (onClosed) {
          onClosed();
        }
      }, prefersReducedMotion ? 0 : animationDuration);

      return () => clearTimeout(hideTimeout);
    }
  }, [isOpen, shouldRender, announceOnClose, preventScroll, prefersReducedMotion, animationDuration, onClosed]);

  // Setup focus trap
  useEffect(() => {
    if (shouldRender && modalRef.current) {
      // Small delay to ensure modal is fully rendered
      const setupFocusTrap = () => {
        if (modalRef.current) {
          // Resolve initial focus - if string, find element in modal
          let resolvedInitialFocus = initialFocus;
          if (typeof initialFocus === 'string') {
            resolvedInitialFocus = modalRef.current.querySelector(initialFocus) as HTMLElement;
          }
          
          const focusTrap = new FocusTrap(modalRef.current, {
            initialFocus: resolvedInitialFocus || modalRef.current,
            returnFocus,
            escapeDeactivates: closeOnEscape,
            clickOutsideDeactivates: closeOnBackdropClick,
            hideExternalContent: false, // We handle this separately
            onEscape: closeOnEscape ? onClose : undefined,
            onClickOutside: closeOnBackdropClick ? onClose : undefined,
          });

          focusTrapRef.current = focusTrap;
          focusTrap.activate();
        }
      };

      const timeoutId = setTimeout(setupFocusTrap, 0);

      return () => {
        clearTimeout(timeoutId);
        if (focusTrapRef.current) {
          focusTrapRef.current.destroy();
          focusTrapRef.current = null;
        }
      };
    }
  }, [shouldRender, initialFocus, returnFocus, closeOnEscape, closeOnBackdropClick, onClose]);

  // Setup keyboard shortcuts
  useEffect(() => {
    if (shouldRender && keyboardShortcuts.length > 0) {
      const keyboardManager = new KeyboardShortcutManager();
      keyboardManagerRef.current = keyboardManager;

      // Register modal-specific shortcuts
      keyboardShortcuts.forEach(shortcut => {
        keyboardManager.register({
          ...shortcut,
          context: `modal-${modalIdRef.current}`,
        });
      });

      // Set modal context as active
      keyboardManager.setActiveContext(`modal-${modalIdRef.current}`);

      return () => {
        keyboardManager.destroy();
        keyboardManagerRef.current = null;
      };
    }
  }, [shouldRender, keyboardShortcuts]);

  // Setup external content hiding
  useEffect(() => {
    if (shouldRender && hideExternalContent && modalRef.current) {
      const externalContentManager = new ExternalContentManager();
      externalContentManagerRef.current = externalContentManager;
      
      externalContentManager.hideExternalContent(modalRef.current);

      return () => {
        externalContentManager.restoreExternalContent();
        externalContentManagerRef.current = null;
      };
    }
  }, [shouldRender, hideExternalContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup modal stack
      modalStack.remove(modalIdRef.current);
      
      // Restore body scroll if this was the last modal
      if (preventScroll && modalStack.getCount() === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [preventScroll]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && closeOnBackdropClick && !persistent) {
      onClose();
    }
  }, [closeOnBackdropClick, persistent, onClose]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && closeOnEscape && !persistent) {
      event.preventDefault();
      onClose();
    }
  }, [closeOnEscape, persistent, onClose]);

  // Don't render if not open and not animating
  if (!shouldRender) {
    return null;
  }

  // Modal styles
  const modalClasses = cn(
    'modal',
    `modal--${size}`,
    {
      'modal--animating': isAnimating,
      [`modal--${isOpen ? enterAnimation : exitAnimation}`]: !prefersReducedMotion,
      'motion-reduce': prefersReducedMotion,
      'modal--persistent': persistent,
    },
    className
  );

  const backdropClasses = cn(
    'modal-backdrop',
    'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4',
    {
      'modal-backdrop--animating': isAnimating,
    },
    backdropClassName
  );

  const contentClasses = cn(
    'modal-content',
    'bg-white rounded-lg shadow-xl max-h-full overflow-auto',
    'focus:outline-none focus:ring-2 focus:ring-blue-500',
    {
      'w-full max-w-sm': size === 'small',
      'w-full max-w-md': size === 'medium',
      'w-full max-w-2xl': size === 'large',
      'w-full h-full': size === 'fullscreen',
      'w-auto': size === 'auto',
    },
    contentClassName
  );

  const modalContent = (
    <div
      className={backdropClasses}
      style={{ zIndex: computedZIndex }}
      onMouseDown={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={modalRef}
        className={modalClasses}
        role={role}
        aria-modal={true}
        aria-labelledby={title ? titleIdRef.current : undefined}
        aria-label={ariaLabel}
        aria-describedby={description ? descriptionIdRef.current : undefined}
        tabIndex={-1}
        {...rest}
      >
        <div className={contentClasses}>
          {title && (
            <div className={cn('modal-header', 'p-6 pb-4', headerClassName)}>
              <h2
                id={titleIdRef.current}
                className="text-xl font-semibold text-gray-900"
              >
                {title}
              </h2>
              {description && (
                <p
                  id={descriptionIdRef.current}
                  className="mt-2 text-sm text-gray-600"
                >
                  {description}
                </p>
              )}
            </div>
          )}
          
          <div className={cn('modal-body', 'p-6', !title && 'pt-6', bodyClassName)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Render in portal
  try {
    return createPortal(modalContent, document.body);
  } catch (error) {
    console.error('Failed to create modal portal:', error);
    // Fallback to inline rendering
    return modalContent;
  }
}

// Modal compound components
export const ModalHeader = ({ 
  children, 
  className, 
  ...props 
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('modal-header', 'p-6 pb-4', className)} {...props}>
    {children}
  </div>
);

export const ModalBody = ({ 
  children, 
  className, 
  ...props 
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('modal-body', 'p-6', className)} {...props}>
    {children}
  </div>
);

export const ModalFooter = ({ 
  children, 
  className, 
  ...props 
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('modal-footer', 'p-6 pt-4 border-t border-gray-200', className)} {...props}>
    {children}
  </div>
);

// Confirmation modal preset
export interface ConfirmationModalProps extends Omit<AccessibleModalProps, 'children'> {
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
  title = 'Confirm Action',
  ...props
}: ConfirmationModalProps) {
  const handleConfirm = useCallback(() => {
    onConfirm();
    props.onClose();
  }, [onConfirm, props]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    props.onClose();
  }, [onCancel, props]);

  const variantStyles = {
    danger: 'text-red-600 border-red-600 hover:bg-red-50',
    warning: 'text-orange-600 border-orange-600 hover:bg-orange-50',
    info: 'text-blue-600 border-blue-600 hover:bg-blue-50',
  };

  return (
    <AccessibleModal
      {...props}
      title={title}
      role="alertdialog"
      size="small"
      keyboardShortcuts={[
        {
          key: 'Enter',
          callback: handleConfirm,
          description: 'Confirm action',
        },
        {
          key: 'Escape',
          callback: handleCancel,
          description: 'Cancel action',
        },
      ]}
    >
      <div className="text-gray-700 mb-6">
        {message}
      </div>
      
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={cn(
            'px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-offset-2',
            variantStyles[variant]
          )}
        >
          {confirmText}
        </button>
      </div>
    </AccessibleModal>
  );
}

// Utility function to create modal
export function createModal(props: AccessibleModalProps) {
  return <AccessibleModal {...props} />;
}

// Hook for modal with state management
export function useModalState(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
  };
}