# Page Transitions with Framer Motion

This document explains how to use the global page transition system implemented with Framer Motion in AuctionDraft.io.

## Overview

The page transition system provides subtle, elegant animations that enhance the user experience without being distracting. All transitions are optimized for performance and accessibility.

## Components

### PageTransition

The main wrapper component that handles global page transitions. Automatically applied to all pages through the layout files.

```tsx
import { PageTransition } from "@/components/ui/page-transition";

// Automatically applied in layouts
<PageTransition>{children}</PageTransition>;
```

### PageContent

Wraps individual page content with fade-in and slide animations.

```tsx
import { PageContent } from "@/components/ui/page-transition";

export default function MyPage() {
  return (
    <PageContent>
      <div>Your page content here</div>
    </PageContent>
  );
}
```

### StaggeredContent & StaggeredItem

Creates staggered animations for multiple elements on a page.

```tsx
import {
  StaggeredContent,
  StaggeredItem,
} from "@/components/ui/page-transition";

export default function MyPage() {
  return (
    <PageContent>
      <StaggeredContent>
        <StaggeredItem>
          <div>First element</div>
        </StaggeredItem>
        <StaggeredItem>
          <div>Second element (animates after first)</div>
        </StaggeredItem>
        <StaggeredItem>
          <div>Third element (animates after second)</div>
        </StaggeredItem>
      </StaggeredContent>
    </PageContent>
  );
}
```

### FadeIn

Simple fade-in animation with optional delay.

```tsx
import { FadeIn } from "@/components/ui/page-transition";

<FadeIn delay={0.2}>
  <div>This will fade in after 0.2 seconds</div>
</FadeIn>;
```

### SlideUp

Slide up animation from bottom with optional delay.

```tsx
import { SlideUp } from "@/components/ui/page-transition";

<SlideUp delay={0.1}>
  <div>This will slide up from the bottom</div>
</SlideUp>;
```

## Usage Examples

### Basic Page Structure

```tsx
"use client";

import {
  PageContent,
  StaggeredContent,
  StaggeredItem,
} from "@/components/ui/page-transition";

export default function ExamplePage() {
  return (
    <PageContent>
      <StaggeredContent>
        <StaggeredItem>
          <h1>Page Title</h1>
        </StaggeredItem>
        <StaggeredItem>
          <p>Page content</p>
        </StaggeredItem>
      </StaggeredContent>
    </PageContent>
  );
}
```

### Loading States

```tsx
if (loading) {
  return (
    <PageContent>
      <div className="flex items-center justify-center min-h-screen">
        <FadeIn>
          <div>Loading...</div>
        </FadeIn>
      </div>
    </PageContent>
  );
}
```

### Error States

```tsx
if (error) {
  return (
    <PageContent>
      <div className="flex items-center justify-center min-h-screen">
        <SlideUp>
          <div className="text-red-600">Error: {error}</div>
        </SlideUp>
      </div>
    </PageContent>
  );
}
```

## Animation Settings

### Page Transitions

- **Duration**: 0.4 seconds
- **Easing**: "anticipate" (smooth deceleration)
- **Effects**: Fade + slight scale + vertical movement

### Content Animations

- **Duration**: 0.3-0.5 seconds
- **Easing**: "easeOut" (smooth acceleration)
- **Stagger Delay**: 0.1 seconds between items

### Performance Optimizations

- Uses `AnimatePresence` with `mode="wait"` for clean transitions
- Hardware acceleration enabled
- Reduced motion support for accessibility

## Best Practices

1. **Wrap all page content** with `PageContent` for consistent animations
2. **Use staggered animations** for lists and multiple elements
3. **Add delays** to create visual hierarchy
4. **Keep animations subtle** - they should enhance, not distract
5. **Test on slower devices** to ensure smooth performance

## Accessibility

The animations respect the user's motion preferences:

- Automatically disabled when `prefers-reduced-motion` is enabled
- Smooth, predictable transitions that don't cause motion sickness
- Proper focus management during transitions

## Customization

To customize animations, modify the variants in `components/ui/page-transition.tsx`:

```tsx
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 0.98,
  },
};
```
