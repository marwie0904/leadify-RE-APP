'use client';

import React, { useState, useRef, useEffect, KeyboardEvent, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

export interface SkipLinkItem {
  href: string;
  label: string;
  onActivate?: (link: SkipLinkItem, event: Event) => void;
  announce?: string;
  [key: string]: any; // Allow additional props
}

export interface SkipLinksProps {
  links: SkipLinkItem[];
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  ariaLabel?: string;
  alwaysVisible?: boolean;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  renderLink?: (props: { link: SkipLinkItem; onActivate: (event: Event) => void; [key: string]: any }) => React.ReactNode;
}

export interface SkipLinkProps {
  link: SkipLinkItem;
  className?: string;
  onActivate?: (link: SkipLinkItem, event: Event) => void;
  [key: string]: any;
}

// Default skip links styles (would typically be in CSS)
const skipLinksStyles = {
  container: `
    skip-links
    fixed z-50 p-2 bg-white border border-gray-300 shadow-lg
    focus-within:block
  `.replace(/\s+/g, ' ').trim(),
  
  containerHidden: 'sr-only',
  containerFocused: 'skip-links--focused',
  
  link: `
    skip-link
    block px-3 py-2 text-sm text-blue-600 
    hover:text-blue-800 hover:underline
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    no-underline
  `.replace(/\s+/g, ' ').trim(),
  
  // Position variants
  positions: {
    'top-left': 'top-0 left-0',
    'top-center': 'top-0 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-center': 'bottom-0 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-0 right-0',
  }
};

export function SkipLink({ 
  link, 
  className, 
  onActivate,
  ...rest 
}: SkipLinkProps) {
  const handleActivation = (event: Event) => {
    event.preventDefault();
    
    // Find target element
    const targetId = link.href.replace('#', '');
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      // Make element focusable if it isn't already
      if (!targetElement.hasAttribute('tabindex')) {
        targetElement.setAttribute('tabindex', '-1');
      }
      
      // Focus the target element
      targetElement.focus();
      
      // Scroll to element
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Announce if specified (would integrate with announcement system)
      if (link.announce && typeof (global as any).announce === 'function') {
        (global as any).announce(link.announce);
      }
    }
    
    // Call custom onActivate handlers
    if (link.onActivate) {
      link.onActivate(link, event);
    }
    if (onActivate) {
      onActivate(link, event);
    }
  };

  const handleClick = (event: MouseEvent) => {
    handleActivation(event.nativeEvent);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivation(event.nativeEvent);
    }
  };

  // Extract custom props from link
  const { href, label, onActivate: linkOnActivate, announce, ...linkProps } = link;

  return (
    <a
      href={href}
      className={cn(skipLinksStyles.link, className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      {...linkProps}
      {...rest}
    >
      {label}
    </a>
  );
}

export function SkipLinks({
  links,
  className,
  as: Component = 'div',
  ariaLabel = 'Skip links',
  alwaysVisible = false,
  position = 'top-left',
  renderLink,
}: SkipLinksProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout>();

  // Don't render if no links
  if (!links || links.length === 0) {
    return null;
  }

  const handleFocusIn = () => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    setIsFocused(true);
  };

  const handleFocusOut = (event: React.FocusEvent) => {
    // Delay to check if focus moved to another skip link
    focusTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (container && document.activeElement && !container.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 10); // Slightly longer delay for test stability
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsFocused(false);
      
      // Move focus out of skip links
      if (containerRef.current) {
        (containerRef.current.querySelector('a') as HTMLElement)?.blur();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  const containerClasses = cn(
    skipLinksStyles.container,
    skipLinksStyles.positions[position],
    {
      [skipLinksStyles.containerHidden]: !alwaysVisible && !isFocused,
      [skipLinksStyles.containerFocused]: isFocused,
      [`skip-links--${position}`]: position !== 'top-left',
    },
    className
  );

  const LinkComponent = renderLink || SkipLink;

  return React.createElement(
    Component,
    {
      ref: containerRef,
      className: containerClasses,
      'aria-label': ariaLabel,
      role: 'navigation',
      onFocusCapture: handleFocusIn,
      onBlurCapture: handleFocusOut,
      onKeyDown: handleKeyDown,
    },
    links.map((link, index) => {
      if (renderLink) {
        return React.createElement(LinkComponent, {
          key: link.href || index,
          link,
          onActivate: (event: Event) => {
            // Handle activation logic here if using custom renderer
            const targetId = link.href.replace('#', '');
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
              if (!targetElement.hasAttribute('tabindex')) {
                targetElement.setAttribute('tabindex', '-1');
              }
              targetElement.focus();
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            if (link.onActivate) {
              link.onActivate(link, event);
            }
          }
        });
      }
      
      return React.createElement(SkipLink, {
        key: link.href || index,
        link,
      });
    })
  );
}

// Hook for easy skip links management
export function useSkipLinks(initialLinks: SkipLinkItem[] = []) {
  const [links, setLinks] = useState<SkipLinkItem[]>(initialLinks);

  const addLink = (link: SkipLinkItem) => {
    setLinks(prev => [...prev, link]);
  };

  const removeLink = (href: string) => {
    setLinks(prev => prev.filter(link => link.href !== href));
  };

  const updateLink = (href: string, updates: Partial<SkipLinkItem>) => {
    setLinks(prev => prev.map(link => 
      link.href === href ? { ...link, ...updates } : link
    ));
  };

  const clearLinks = () => {
    setLinks([]);
  };

  return {
    links,
    addLink,
    removeLink,
    updateLink,
    clearLinks,
    setLinks,
  };
}

// Utility function to create common skip links
export function createCommonSkipLinks(): SkipLinkItem[] {
  return [
    {
      href: '#main',
      label: 'Skip to main content',
      announce: 'Skipped to main content'
    },
    {
      href: '#navigation',
      label: 'Skip to navigation',
      announce: 'Skipped to navigation'
    },
    {
      href: '#search',
      label: 'Skip to search',
      announce: 'Skipped to search'
    },
    {
      href: '#footer',
      label: 'Skip to footer',
      announce: 'Skipped to footer'
    }
  ];
}

// Higher-order component for adding skip links to any component
export function withSkipLinks<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  skipLinks: SkipLinkItem[]
) {
  const ComponentWithSkipLinks = (props: P) => {
    return (
      <>
        <SkipLinks links={skipLinks} />
        <WrappedComponent {...props} />
      </>
    );
  };

  ComponentWithSkipLinks.displayName = `withSkipLinks(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ComponentWithSkipLinks;
}