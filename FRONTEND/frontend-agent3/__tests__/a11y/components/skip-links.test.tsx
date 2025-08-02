import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SkipLinks, SkipLink } from '@/lib/a11y/components/skip-links';

describe('SkipLinks', () => {
  const defaultLinks = [
    { href: '#main', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#footer', label: 'Skip to footer' }
  ];

  beforeEach(() => {
    // Create target elements
    document.body.innerHTML = `
      <div id="main">Main content</div>
      <div id="navigation">Navigation</div>
      <div id="footer">Footer</div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Basic Rendering', () => {
    it('should render skip links', () => {
      render(<SkipLinks links={defaultLinks} />);
      
      expect(screen.getByText('Skip to main content')).toBeInTheDocument();
      expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
      expect(screen.getByText('Skip to footer')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <SkipLinks links={defaultLinks} className="custom-skip-links" />
      );
      
      expect(container.firstChild).toHaveClass('custom-skip-links');
    });

    it('should render with custom tag', () => {
      const { container } = render(
        <SkipLinks links={defaultLinks} as="nav" />
      );
      
      expect(container.firstChild?.tagName).toBe('NAV');
    });

    it('should render with aria-label', () => {
      render(<SkipLinks links={defaultLinks} ariaLabel="Skip navigation" />);
      
      const container = screen.getByLabelText('Skip navigation');
      expect(container).toBeInTheDocument();
    });

    it('should not render when no links provided', () => {
      const { container } = render(<SkipLinks links={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Link Behavior', () => {
    it('should focus target element when link is clicked', () => {
      render(<SkipLinks links={defaultLinks} />);
      
      const mainLink = screen.getByText('Skip to main content');
      const mainElement = document.getElementById('main')!;
      
      // Make element focusable
      mainElement.tabIndex = -1;
      
      fireEvent.click(mainLink);
      
      expect(document.activeElement).toBe(mainElement);
    });

    it('should focus target element when link is activated with Enter', () => {
      render(<SkipLinks links={defaultLinks} />);
      
      const navigationLink = screen.getByText('Skip to navigation');
      const navigationElement = document.getElementById('navigation')!;
      
      // Make element focusable
      navigationElement.tabIndex = -1;
      
      fireEvent.keyDown(navigationLink, { key: 'Enter', code: 'Enter' });
      
      expect(document.activeElement).toBe(navigationElement);
    });

    it('should focus target element when link is activated with Space', () => {
      render(<SkipLinks links={defaultLinks} />);
      
      const footerLink = screen.getByText('Skip to footer');
      const footerElement = document.getElementById('footer')!;
      
      // Make element focusable
      footerElement.tabIndex = -1;
      
      fireEvent.keyDown(footerLink, { key: ' ', code: 'Space' });
      
      expect(document.activeElement).toBe(footerElement);
    });

    it('should handle non-existent target gracefully', () => {
      const links = [{ href: '#nonexistent', label: 'Skip to nowhere' }];
      render(<SkipLinks links={links} />);
      
      const link = screen.getByText('Skip to nowhere');
      
      expect(() => {
        fireEvent.click(link);
      }).not.toThrow();
    });

    it('should call onActivate callback', () => {
      const onActivate = jest.fn();
      const links = [{ 
        href: '#main', 
        label: 'Skip to main content',
        onActivate 
      }];
      
      render(<SkipLinks links={links} />);
      
      const link = screen.getByText('Skip to main content');
      fireEvent.click(link);
      
      expect(onActivate).toHaveBeenCalledWith(
        expect.objectContaining({
          href: '#main',
          label: 'Skip to main content',
          onActivate: expect.any(Function)
        }),
        expect.any(Event)
      );
    });
  });

  describe('Visibility and Focus Management', () => {
    it('should be visually hidden by default', () => {
      const { container } = render(<SkipLinks links={defaultLinks} />);
      const skipLinksContainer = container.firstChild as HTMLElement;
      
      expect(skipLinksContainer).toHaveClass('sr-only');
    });

    it('should become visible on focus', () => {
      render(<SkipLinks links={defaultLinks} />);
      
      const firstLink = screen.getByText('Skip to main content');
      fireEvent.focus(firstLink);
      
      const container = firstLink.closest('.skip-links');
      expect(container).toHaveClass('skip-links--focused');
    });

    it('should hide when focus leaves all links', async () => {
      render(<SkipLinks links={defaultLinks} />);
      
      const firstLink = screen.getByText('Skip to main content');
      const container = firstLink.closest('.skip-links');
      
      // Focus first link
      fireEvent.focus(firstLink);
      expect(container).toHaveClass('skip-links--focused');
      
      // Blur (focus leaves) and simulate focus moving outside the container
      fireEvent.blur(firstLink);
      
      // Create an external element and focus it to simulate focus leaving
      const externalElement = document.createElement('button');
      document.body.appendChild(externalElement);
      externalElement.focus();
      
      // Wait for timeout to complete and wrap in act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });
      
      expect(container).not.toHaveClass('skip-links--focused');
      
      // Cleanup
      document.body.removeChild(externalElement);
    });

    it('should remain visible when focus moves between links', () => {
      render(<SkipLinks links={defaultLinks} />);
      
      const firstLink = screen.getByText('Skip to main content');
      const secondLink = screen.getByText('Skip to navigation');
      const container = firstLink.closest('.skip-links');
      
      // Focus first link
      fireEvent.focus(firstLink);
      expect(container).toHaveClass('skip-links--focused');
      
      // Move focus to second link
      fireEvent.blur(firstLink);
      fireEvent.focus(secondLink);
      expect(container).toHaveClass('skip-links--focused');
    });

    it('should always be visible when alwaysVisible is true', () => {
      const { container } = render(
        <SkipLinks links={defaultLinks} alwaysVisible />
      );
      
      const skipLinksContainer = container.firstChild as HTMLElement;
      expect(skipLinksContainer).not.toHaveClass('sr-only');
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      render(<SkipLinks links={defaultLinks} />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('should have proper tabindex for keyboard navigation', () => {
      render(<SkipLinks links={defaultLinks} />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('tabindex', '0');
      });
    });

    it('should support custom ARIA attributes on individual links', () => {
      const linksWithAria = [
        { 
          href: '#main', 
          label: 'Skip to main content',
          'aria-describedby': 'main-desc'
        }
      ];
      
      render(<SkipLinks links={linksWithAria} />);
      
      const link = screen.getByText('Skip to main content');
      expect(link).toHaveAttribute('aria-describedby', 'main-desc');
    });

    it('should announce when skip link is activated', () => {
      const announcer = jest.fn();
      const links = [{ 
        href: '#main', 
        label: 'Skip to main content',
        announce: 'Skipped to main content'
      }];
      
      // Mock the announcer
      (global as any).announce = announcer;
      
      render(<SkipLinks links={links} />);
      
      const link = screen.getByText('Skip to main content');
      fireEvent.click(link);
      
      // Would need actual announcer integration to test this properly
      // This is more of a documentation of the intended behavior
    });
  });

  describe('Keyboard Navigation', () => {
    it('should trap focus within skip links when focused', () => {
      render(<SkipLinks links={defaultLinks} />);
      
      const firstLink = screen.getByText('Skip to main content');
      const lastLink = screen.getByText('Skip to footer');
      
      // Focus first link
      fireEvent.focus(firstLink);
      
      // Tab backward from first link should go to last link
      fireEvent.keyDown(firstLink, { 
        key: 'Tab', 
        shiftKey: true,
        preventDefault: jest.fn()
      });
      
      // This would require more complex focus management implementation
      // For now, this documents the expected behavior
    });

    it('should handle Escape key to dismiss focus', () => {
      render(<SkipLinks links={defaultLinks} />);
      
      const firstLink = screen.getByText('Skip to main content');
      const container = firstLink.closest('.skip-links');
      
      // Focus first link
      fireEvent.focus(firstLink);
      expect(container).toHaveClass('skip-links--focused');
      
      // Press Escape
      fireEvent.keyDown(firstLink, { key: 'Escape', code: 'Escape' });
      
      // Should remove focus class
      expect(container).not.toHaveClass('skip-links--focused');
    });
  });

  describe('Customization', () => {
    it('should support custom link renderer', () => {
      const CustomLink = ({ link, ...props }: any) => (
        <button {...props} data-testid="custom-link">
          {link.label}
        </button>
      );
      
      render(
        <SkipLinks 
          links={defaultLinks} 
          renderLink={CustomLink}
        />
      );
      
      expect(screen.getAllByTestId('custom-link')).toHaveLength(3);
    });

    it('should support additional props on links', () => {
      const linksWithProps = [
        { 
          href: '#main', 
          label: 'Skip to main content',
          'data-testid': 'main-skip'
        }
      ];
      
      render(<SkipLinks links={linksWithProps} />);
      
      expect(screen.getByTestId('main-skip')).toBeInTheDocument();
    });

    it('should support custom positioning', () => {
      const { container } = render(
        <SkipLinks 
          links={defaultLinks} 
          position="bottom-left"
        />
      );
      
      const skipLinksContainer = container.firstChild as HTMLElement;
      expect(skipLinksContainer).toHaveClass('skip-links--bottom-left');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid href gracefully', () => {
      const invalidLinks = [
        { href: '', label: 'Empty href' },
        { href: 'invalid', label: 'Invalid href' }
      ];
      
      expect(() => {
        render(<SkipLinks links={invalidLinks} />);
      }).not.toThrow();
    });

    it('should handle missing target elements', () => {
      const missingTargetLinks = [
        { href: '#missing', label: 'Missing target' }
      ];
      
      render(<SkipLinks links={missingTargetLinks} />);
      
      const link = screen.getByText('Missing target');
      
      expect(() => {
        fireEvent.click(link);
      }).not.toThrow();
    });
  });
});

describe('SkipLink', () => {
  const mockLink = {
    href: '#main',
    label: 'Skip to main content'
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="main">Main content</div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Individual Skip Link', () => {
    it('should render individual skip link', () => {
      render(<SkipLink link={mockLink} />);
      
      const link = screen.getByText('Skip to main content');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '#main');
    });

    it('should handle activation', () => {
      const linkOnActivate = jest.fn();
      const componentOnActivate = jest.fn();
      
      render(
        <SkipLink 
          link={{ ...mockLink, onActivate: linkOnActivate }} 
          onActivate={componentOnActivate}
        />
      );
      
      const link = screen.getByText('Skip to main content');
      fireEvent.click(link);
      
      expect(linkOnActivate).toHaveBeenCalled();
      expect(componentOnActivate).toHaveBeenCalled();
    });

    it('should focus target on activation', () => {
      render(<SkipLink link={mockLink} />);
      
      const link = screen.getByText('Skip to main content');
      const mainElement = document.getElementById('main')!;
      
      // Make element focusable
      mainElement.tabIndex = -1;
      
      fireEvent.click(link);
      
      expect(document.activeElement).toBe(mainElement);
    });

    it('should support custom className', () => {
      render(<SkipLink link={mockLink} className="custom-link" />);
      
      const link = screen.getByText('Skip to main content');
      expect(link).toHaveClass('custom-link');
    });
  });
});