# Whitelabel Configuration

This gallery system is designed to be completely whitelabel and brandable.

## What's Already Generic

✅ **No hardcoded branding** - All company-specific code is in `examples/_reference-thicket/`
✅ **No logos** - Uses generic icons (lucide-react)
✅ **Customizable colors** - Uses CSS custom properties/Tailwind tokens
✅ **Customizable text** - All titles and descriptions are props

## How to Customize

### 1. Update Package Name

Edit `package.json`:
```json
{
  "name": "your-company-gallery",
  "description": "Your company design system gallery"
}
```

### 2. Customize Gallery Header

The `PortableGalleryPage` accepts props for branding:

```tsx
<PortableGalleryPage
  title="Your Company Design System"
  description="Browse all components"
  // All text is customizable via props
/>
```

### 3. Customize Colors

The gallery uses Tailwind CSS. Update `demo/index.css` or your theme:

```css
/* Example: Custom brand colors */
:root {
  --color-brand-500: #your-color;
  --color-brand-600: #your-color;
  --color-brand-700: #your-color;
}
```

Or configure in `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#your-color',
          600: '#your-color',
          700: '#your-color',
        }
      }
    }
  }
}
```

### 4. Add Your Logo

Replace the generic icon in `GalleryHeader`:

```tsx
// In your wrapper component
import YourLogo from './your-logo.svg'

<div className="flex h-10 w-10 items-center justify-center">
  <YourLogo />
</div>
```

### 5. Remove Reference Examples

The `examples/_reference-thicket/` folder contains the original implementation examples.

**Delete this folder** for a completely clean installation:

```bash
rm -rf examples/_reference-thicket
```

## What to Keep

- `core/` - Gallery engine (whitelabel)
- `components/` - Gallery UI (whitelabel, customizable via props)
- `hooks/` - React hooks (whitelabel)
- `demo/` - Clean example setup (generic components)

## What to Remove/Customize

- `examples/_reference-thicket/` - Reference implementation (delete or ignore)
- `demo/components/` - Example components (replace with yours)
- Package name in `package.json`
- Colors in Tailwind config
