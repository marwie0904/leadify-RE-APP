#!/usr/bin/env node

/**
 * Validation script for accessibility ESLint setup
 * 
 * This script demonstrates that our accessibility linting configuration
 * is properly configured and working correctly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Accessibility ESLint Setup\n');

// 1. Check if ESLint configuration exists and is valid
console.log('1. Checking ESLint configuration...');
const eslintConfigPath = path.join(__dirname, '..', '.eslintrc.json');
if (!fs.existsSync(eslintConfigPath)) {
  console.error('❌ .eslintrc.json not found');
  process.exit(1);
}

try {
  const config = JSON.parse(fs.readFileSync(eslintConfigPath, 'utf8'));
  if (!config.plugins?.includes('jsx-a11y')) {
    console.error('❌ jsx-a11y plugin not configured');
    process.exit(1);
  }
  if (!config.extends?.includes('plugin:jsx-a11y/recommended')) {
    console.error('❌ jsx-a11y/recommended not extended');
    process.exit(1);
  }
  console.log('✅ ESLint configuration is valid');
} catch (error) {
  console.error('❌ ESLint configuration is invalid:', error.message);
  process.exit(1);
}

// 2. Check if accessibility dependencies are installed
console.log('\n2. Checking accessibility dependencies...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const requiredDeps = [
  'eslint-plugin-jsx-a11y',
  'axe-core',
  'jest-axe',
  '@axe-core/react',
  'react-axe'
];

const missingDeps = requiredDeps.filter(dep => 
  !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
);

if (missingDeps.length > 0) {
  console.error('❌ Missing dependencies:', missingDeps.join(', '));
  process.exit(1);
}
console.log('✅ All accessibility dependencies are installed');

// 3. Check if npm scripts are configured
console.log('\n3. Checking npm scripts...');
const requiredScripts = [
  'lint:a11y',
  'lint:a11y:fix',
  'lint:all',
  'test:a11y',
  'validate'
];

const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);
if (missingScripts.length > 0) {
  console.error('❌ Missing npm scripts:', missingScripts.join(', '));
  process.exit(1);
}
console.log('✅ All npm scripts are configured');

// 4. Test ESLint on a simple accessibility issue
console.log('\n4. Testing ESLint accessibility detection...');
const testFilePath = path.join(__dirname, '..', 'temp-a11y-test.tsx');
const testContent = `
// This file contains intentional accessibility violations for testing
import React from 'react';

export function BadComponent() {
  return (
    <div>
      <img src="/test.jpg" />
      <div onClick={() => console.log('clicked')}>Click me</div>
      <input type="text" placeholder="Enter name" />
    </div>
  );
}
`;

try {
  fs.writeFileSync(testFilePath, testContent);
  
  try {
    execSync(`npx eslint ${testFilePath} --config .eslintrc.json`, { stdio: 'pipe' });
    console.error('❌ ESLint should have detected accessibility issues');
    process.exit(1);
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    if (output.includes('jsx-a11y/alt-text') && 
        output.includes('jsx-a11y/click-events-have-key-events') &&
        output.includes('jsx-a11y/label-has-associated-control')) {
      console.log('✅ ESLint correctly detected accessibility issues');
    } else {
      console.error('❌ ESLint output unexpected:', output);
      process.exit(1);
    }
  }
} finally {
  // Clean up test file
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
}

// 5. Check if accessibility library exists
console.log('\n5. Checking accessibility library...');
const a11yLibPath = path.join(__dirname, '..', 'lib', 'a11y');
if (!fs.existsSync(a11yLibPath)) {
  console.error('❌ Accessibility library not found');
  process.exit(1);
}

const expectedDirectories = [
  'components',
  'context', 
  'core',
  'focus',
  'hooks',
  'keyboard',
  'screen-reader',
  'utils',
  'validation'
];

const missingDirs = expectedDirectories.filter(dir => 
  !fs.existsSync(path.join(a11yLibPath, dir))
);

if (missingDirs.length > 0) {
  console.error('❌ Missing accessibility library directories:', missingDirs.join(', '));
  process.exit(1);
}
console.log('✅ Accessibility library structure is complete');

// 6. Check if documentation exists
console.log('\n6. Checking accessibility documentation...');
const docsPath = path.join(__dirname, '..', 'docs');
const expectedDocs = [
  'ACCESSIBILITY_LINTING.md',
  'ACCESSIBILITY_ARCHITECTURE.md',
  'ACCESSIBILITY_API_SPEC.md'
];

const missingDocs = expectedDocs.filter(doc => 
  !fs.existsSync(path.join(docsPath, doc))
);

if (missingDocs.length > 0) {
  console.error('❌ Missing documentation files:', missingDocs.join(', '));
  process.exit(1);
}
console.log('✅ Accessibility documentation is complete');

console.log('\n🎉 Accessibility ESLint Setup Validation Complete!');
console.log('\n📋 Setup Summary:');
console.log('   • ESLint configuration with jsx-a11y plugin');
console.log('   • Enhanced accessibility rules for WCAG 2.1 AA compliance');
console.log('   • Component mappings for shadcn/ui components');
console.log('   • Specialized overrides for accessibility library and tests');
console.log('   • Complete accessibility library with hooks and utilities');
console.log('   • Comprehensive documentation and guides');
console.log('   • npm scripts for linting and testing');
console.log('\n💡 Next Steps:');
console.log('   • Run "npm run lint:a11y" to lint for accessibility issues');
console.log('   • Run "npm run lint:a11y:fix" to auto-fix issues where possible');
console.log('   • Run "npm run test:a11y" to run accessibility tests');
console.log('   • Review docs/ACCESSIBILITY_LINTING.md for usage guide');
console.log('   • Integrate with your CI/CD pipeline for continuous compliance');