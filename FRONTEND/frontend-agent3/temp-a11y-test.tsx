
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
