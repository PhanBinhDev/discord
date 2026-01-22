# Discord Color System

Hệ thống màu sắc giống Discord với khả năng tùy chỉnh accent color theo user settings.

## 🎨 Cách hoạt động

### 1. **CSS Variables**
Accent color được lưu trong CSS custom properties:
```css
--accent-color: #5865f2;         /* Main color */
--accent-color-rgb: 88, 101, 242; /* RGB for opacity */
--accent-hover: #4752c4;          /* Hover state (darker) */
--accent-active: #3c45a5;         /* Active state (even darker) */
```

### 2. **Theme Provider**
`ThemeProvider` tự động apply accent color từ user settings:
- Đọc `settings.accentColor` từ Convex
- Convert hex sang RGB
- Tạo hover/active variants (darker 20% và 40%)
- Update CSS variables globally

### 3. **Available Colors**
8 Discord colors:
- **Blurple** (default): `#5865F2`
- **Green**: `#57F287`
- **Yellow**: `#FEE75C`
- **Fuchsia**: `#EB459E`
- **Red**: `#ED4245`
- **Aqua**: `#45DDC0`
- **Orange**: `#F47B67`
- **Purple**: `#9B84EE`

## 💻 Cách sử dụng

### Option 1: Inline Styles (Recommended)
```tsx
import { accentColorStyle, accentTextStyle } from '@/lib/accent-color';

// Background
<div style={accentColorStyle()}>Accent BG</div>

// With opacity
<div style={accentColorStyle(0.5)}>50% opacity</div>

// Text color
<span style={accentTextStyle()}>Accent text</span>
```

### Option 2: Tailwind Classes
```tsx
import { accentClasses } from '@/lib/accent-color';

<button className={accentClasses.bg}>
  Click me
</button>

// With hover
<button className={`${accentClasses.bg} ${accentClasses.bgHover}`}>
  Hover effect
</button>
```

### Option 3: Direct CSS Variables
```tsx
// Inline style
<div style={{ backgroundColor: 'var(--accent-color)' }}>
  Direct CSS var
</div>

// Tailwind arbitrary value
<div className="bg-[var(--accent-color)]">
  Tailwind + CSS var
</div>
```

### Option 4: Hover Handlers
```tsx
import { getAccentHoverHandlers } from '@/lib/accent-color';

<button
  className="bg-background"
  {...getAccentHoverHandlers()}
>
  Hover to see accent color
</button>
```

## 📝 Examples

### Button với accent color
```tsx
<button
  className="px-4 py-2 rounded-lg transition-colors"
  style={accentColorStyle()}
>
  Accent Button
</button>
```

### Link với hover effect
```tsx
<a
  href="#"
  className="transition-colors"
  style={{ color: 'var(--muted-foreground)' }}
  onMouseEnter={(e) => {
    e.currentTarget.style.color = 'var(--accent-color)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.color = '';
  }}
>
  Hover me
</a>
```

### Badge với opacity
```tsx
<span
  className="px-2 py-1 rounded-full text-xs"
  style={{
    ...accentColorStyle(0.1),
    ...accentTextStyle(1),
  }}
>
  Badge
</span>
```

### Progress bar
```tsx
<div className="w-full h-2 bg-muted rounded-full overflow-hidden">
  <div
    className="h-full transition-all"
    style={{
      ...accentColorStyle(),
      width: '60%',
    }}
  />
</div>
```

## 🔐 Subscription Gating

Accent color chỉ dành cho premium users:
```tsx
import { useUser } from '@clerk/nextjs';

const { user } = useUser();
const hasSubscription = user?.publicMetadata?.subscription === 'premium';

if (!hasSubscription) {
  // Show locked state
  return <Lock />;
}
```

## 🎯 Best Practices

1. **Consistency**: Dùng accent color cho:
   - Primary buttons
   - Active states
   - Links hover
   - Selection highlights
   - Progress indicators

2. **Accessibility**: Luôn check contrast với background
   ```tsx
   // Good - high contrast
   <button style={accentColorStyle()}>
     <span className="text-white">Click</span>
   </button>
   ```

3. **Hover states**: Use auto-generated hover colors
   ```css
   .my-button:hover {
     background-color: var(--accent-hover);
   }
   ```

4. **Opacity for backgrounds**: Use RGB variant
   ```tsx
   style={{ backgroundColor: 'rgba(var(--accent-color-rgb), 0.1)' }}
   ```

## 🚀 Migration Guide

### From hardcoded colors:
```tsx
// Before
<button className="bg-emerald-500 hover:bg-emerald-600">
  Button
</button>

// After
<button 
  className="transition-colors"
  style={accentColorStyle()}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
  }}
>
  Button
</button>
```

### From Tailwind classes:
```tsx
// Before
<div className="text-blue-600">Text</div>

// After
<div style={accentTextStyle()}>Text</div>
```
