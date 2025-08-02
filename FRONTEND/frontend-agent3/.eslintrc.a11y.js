/**
 * Enhanced ESLint Configuration for Accessibility
 * 
 * This configuration provides strict accessibility rules
 * specific to our accessibility system and WCAG 2.1 AA compliance.
 * 
 * Usage: npx eslint --config .eslintrc.a11y.js [files]
 */

module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:jsx-a11y/recommended'
  ],
  plugins: ['jsx-a11y'],
  rules: {
    // Enhanced accessibility rules for strict WCAG 2.1 AA compliance
    'jsx-a11y/alt-text': ['error', {
      elements: ['img', 'object', 'area', 'input[type="image"]'],
      img: ['Image', 'Img'],
      object: ['Object'],
      area: ['Area'],
      'input[type="image"]': ['InputImage']
    }],
    
    'jsx-a11y/anchor-is-valid': ['error', {
      components: ['Link', 'NextLink'],
      specialLink: ['hrefLeft', 'hrefRight'],
      aspects: ['noHref', 'invalidHref', 'preferButton']
    }],
    
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/mouse-events-have-key-events': 'error',
    
    // Form accessibility - stricter rules
    'jsx-a11y/label-has-associated-control': ['error', {
      labelComponents: ['Label', 'FormLabel', 'InputLabel'],
      labelAttributes: ['htmlFor'],
      controlComponents: ['Input', 'Select', 'TextArea', 'Checkbox', 'Radio', 'Switch'],
      assert: 'either',
      depth: 25
    }],
    
    // ARIA rules - strict compliance
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    
    // Interactive elements
    'jsx-a11y/interactive-supports-focus': ['error', {
      tabbable: [
        'button',
        'checkbox',
        'link',
        'searchbox',
        'spinbutton',
        'switch',
        'textbox'
      ]
    }],
    
    // Heading structure
    'jsx-a11y/heading-has-content': ['error', {
      components: ['Heading', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']
    }],
    
    // Media accessibility
    'jsx-a11y/media-has-caption': ['warn', {
      audio: ['Audio'],
      video: ['Video'],
      track: ['Track']
    }],
    
    // Focus management
    'jsx-a11y/no-autofocus': ['warn', { ignoreNonDOM: true }],
    'jsx-a11y/tabindex-no-positive': 'error',
    
    // Custom rules for our accessibility system
    'jsx-a11y/no-aria-hidden-on-focusable': ['error', {
      // Allow aria-hidden on elements that are programmatically focusable
      // but should be hidden from screen readers (like our focus trap elements)
      exemptTags: ['div', 'span']
    }]
  },
  
  overrides: [
    {
      // Accessibility library files - allow some patterns needed for a11y utilities
      files: ['lib/a11y/**/*.{ts,tsx}', 'components/ui/accessibility/**/*.{ts,tsx}'],
      rules: {
        'jsx-a11y/no-noninteractive-tabindex': 'warn',
        'jsx-a11y/no-static-element-interactions': 'warn',
        'jsx-a11y/click-events-have-key-events': 'warn', // Our utilities handle this
        'jsx-a11y/no-noninteractive-element-interactions': 'warn'
      }
    },
    
    {
      // Test files - more relaxed rules for testing scenarios
      files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      rules: {
        'jsx-a11y/no-autofocus': 'off',
        'jsx-a11y/control-has-associated-label': 'off',
        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/no-static-element-interactions': 'off',
        'jsx-a11y/anchor-is-valid': 'off'
      }
    },
    
    {
      // Component stories/examples - allow demo patterns
      files: ['**/*.stories.{ts,tsx}', '**/examples/**/*.{ts,tsx}'],
      rules: {
        'jsx-a11y/no-autofocus': 'warn',
        'jsx-a11y/control-has-associated-label': 'warn'
      }
    }
  ],
  
  settings: {
    'jsx-a11y': {
      polymorphicPropName: 'as',
      components: {
        // shadcn/ui components
        'Button': 'button',
        'Input': 'input',
        'Label': 'label',
        'Select': 'select',
        'SelectTrigger': 'button',
        'SelectContent': 'div',
        'SelectItem': 'option',
        'Textarea': 'textarea',
        'Checkbox': 'input',
        'RadioGroup': 'div',
        'RadioGroupItem': 'input',
        'Switch': 'button',
        'Slider': 'input',
        'Progress': 'progressbar',
        'Avatar': 'img',
        'Card': 'div',
        'CardHeader': 'header',
        'CardContent': 'div',
        'CardFooter': 'footer',
        'Dialog': 'dialog',
        'DialogTrigger': 'button',
        'DialogContent': 'div',
        'DialogHeader': 'header',
        'DialogTitle': 'h2',
        'DialogDescription': 'p',
        'AlertDialog': 'dialog',
        'AlertDialogTrigger': 'button',
        'AlertDialogContent': 'div',
        'AlertDialogHeader': 'header',
        'AlertDialogTitle': 'h2',
        'AlertDialogDescription': 'p',
        'Sheet': 'dialog',
        'SheetTrigger': 'button',
        'SheetContent': 'div',
        'SheetHeader': 'header',
        'SheetTitle': 'h2',
        'SheetDescription': 'p',
        'Popover': 'div',
        'PopoverTrigger': 'button',
        'PopoverContent': 'div',
        'HoverCard': 'div',
        'HoverCardTrigger': 'button',
        'HoverCardContent': 'div',
        'DropdownMenu': 'div',
        'DropdownMenuTrigger': 'button',
        'DropdownMenuContent': 'div',
        'DropdownMenuItem': 'menuitem',
        'DropdownMenuCheckboxItem': 'menuitemcheckbox',
        'DropdownMenuRadioItem': 'menuitemradio',
        'DropdownMenuSeparator': 'separator',
        'NavigationMenu': 'nav',
        'NavigationMenuList': 'ul',
        'NavigationMenuItem': 'li',
        'NavigationMenuTrigger': 'button',
        'NavigationMenuContent': 'div',
        'NavigationMenuLink': 'a',
        'Tabs': 'div',
        'TabsList': 'div',
        'TabsTrigger': 'button',
        'TabsContent': 'div',
        'Accordion': 'div',
        'AccordionItem': 'div',
        'AccordionTrigger': 'button',
        'AccordionContent': 'div',
        'Alert': 'div',
        'AlertTitle': 'h5',
        'AlertDescription': 'div',
        'Badge': 'span',
        'Separator': 'separator',
        'ScrollArea': 'div',
        'Table': 'table',
        'TableHeader': 'thead',
        'TableBody': 'tbody',
        'TableFooter': 'tfoot',
        'TableHead': 'th',
        'TableRow': 'tr',
        'TableCell': 'td',
        'Toast': 'div',
        'ToastTitle': 'div',
        'ToastDescription': 'div',
        'ToastAction': 'button',
        'ToastClose': 'button',
        'Tooltip': 'div',
        'TooltipTrigger': 'button',
        'TooltipContent': 'div',
        'Command': 'div',
        'CommandInput': 'input',
        'CommandList': 'div',
        'CommandEmpty': 'div',
        'CommandGroup': 'div',
        'CommandItem': 'div',
        'CommandSeparator': 'separator',
        
        // Our custom accessibility components
        'AccessibleModal': 'dialog',
        'SkipLinks': 'nav',
        'SkipLink': 'a',
        'AnnouncementRegion': 'div',
        'FocusTrap': 'div'
      }
    }
  }
};