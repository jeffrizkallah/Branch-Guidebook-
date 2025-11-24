# Branch Guidebook

A comprehensive operational guide web application for Mikana branch operations across 12 UAE locations. Built with Next.js 14, TypeScript, TailwindCSS, and shadcn/ui.

## Features

- 📚 **12 Branches**: Complete coverage of all Mikana branch locations
- 👥 **5 Role Guides**: Detailed operational guides for Manager, Supervisor, Kitchen, Counter, and Cleaner roles
- ✅ **Interactive Checklists**: Daily task tracking with localStorage persistence
- 📅 **Daily Timelines**: Time-based operational flows for each role
- 🔍 **Search & Filter**: Find branches by name, location, manager, or hygiene score
- 🖨️ **Print-Friendly**: Clean print layouts with appropriate styling
- 🌓 **Dark Mode**: Full dark mode support
- 📱 **Mobile Responsive**: Optimized for all device sizes
- ✏️ **Edit Mode**: Local editing capability with JSON export for updates
- ♿ **Accessible**: WCAG compliant with keyboard navigation and ARIA labels

## Quick Start

### Prerequisites

- Node.js 18+ or pnpm installed
- Modern web browser

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

### Development

```bash
# Run development server (default port 3000)
npm run dev
# or
pnpm dev

# Run on specific port (e.g., 3001)
npm run dev:3001
# or
next dev -p 3001
```

Open [http://localhost:3000](http://localhost:3000) in your browser (or the port you specified).

**Note**: If port 3000 is already in use, Next.js will automatically use the next available port (usually 3001). Check the terminal output to see which port the server is running on.

### Build for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Project Structure

```
branch-guidebook/
├── app/                          # Next.js 14 App Router pages
│   ├── page.tsx                 # Home page with branch grid
│   ├── about/page.tsx           # About page
│   ├── branch/[slug]/
│   │   ├── page.tsx             # Branch detail page
│   │   └── role/[role]/page.tsx # Role-specific page
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles
│   └── not-found.tsx            # 404 page
├── components/                   # Reusable UI components
│   ├── ui/                      # shadcn/ui components
│   ├── BranchCard.tsx           # Branch display card
│   ├── Breadcrumbs.tsx          # Navigation breadcrumbs
│   ├── Checklist.tsx            # Interactive checklist with persistence
│   ├── DailyTimeline.tsx        # Daily operational timeline
│   ├── EditMode.tsx             # Edit mode indicator and JSON export
│   ├── EditableField.tsx        # Editable text field for edit mode
│   ├── Footer.tsx               # Site footer
│   ├── KPIBadge.tsx             # KPI indicator badges
│   ├── MediaGallery.tsx         # Photo gallery with lightbox
│   ├── PrintHeader.tsx          # Print-specific header
│   ├── RoleTabs.tsx             # Role navigation tabs
│   └── TopNav.tsx               # Top navigation bar
├── data/                         # Static JSON data
│   ├── branches.json            # All 12 branch configurations
│   └── roles.json               # 5 role definitions
├── hooks/                        # Custom React hooks
│   └── useEditMode.ts           # Edit/print mode detection
├── lib/                          # Utility functions
│   ├── data.ts                  # Data loading and filtering
│   ├── date.ts                  # Date utilities
│   ├── utils.ts                 # General utilities
│   └── __tests__/
│       └── data.test.ts         # Unit tests
└── package.json                  # Dependencies and scripts
```

## Usage Guide

### Browsing Branches

1. Navigate to the home page
2. Use the search bar to find branches by name or school
3. Apply filters for location, manager, or hygiene score
4. Click "Open Guide" on any branch card

### Viewing Role Information

1. On a branch detail page, select a role tab
2. Click "View Full Details" to see:
   - Responsibilities
   - Daily timeline
   - Opening, service, and closing checklists
   - Do's and don'ts
   - "What good looks like" reference photos

### Using Checklists

- Check off tasks as you complete them
- Progress is saved automatically to localStorage
- Checklists reset daily (keyed by date)
- Use the "Reset" button to clear a checklist

### Print Mode

Add `?print=1` to any URL to enable print mode:
```
/branch/isc-soufouh?print=1
/branch/isc-soufouh/role/manager?print=1
```

Print mode:
- Hides navigation and interactive elements
- Uses print-friendly serif fonts
- Adds header with branch name and date
- Optimized spacing for paper

### Edit Mode

Add `?edit=1` to enable edit mode:
```
/branch/isc-soufouh?edit=1
```

Edit mode allows:
- Inline editing of text fields
- Changes saved to localStorage
- Export merged JSON for committing updates
- Click "Copy Merged JSON" to get updated data

**Note**: Edit mode changes are local only. Send exported JSON to operations team to make permanent updates.

## Data Management

### Adding a New Branch

1. Open `data/branches.json`
2. Add a new branch object with all required fields:

```json
{
  "id": "13",
  "slug": "new-branch",
  "name": "New Branch Name",
  "school": "School Name",
  "location": "City",
  "manager": "Manager Name",
  "contacts": [...],
  "operatingHours": "...",
  "deliverySchedule": [...],
  "kpis": {...},
  "roles": ["manager", "supervisor", "kitchen", "counter", "cleaner"],
  "media": {...}
}
```

3. Rebuild the application

### Editing Role Content

1. Open `data/roles.json`
2. Modify the relevant role object
3. Update responsibilities, checklists, or daily flow as needed
4. Rebuild the application

### Exporting Updated JSON

1. Make changes in edit mode (`?edit=1`)
2. Click "Copy Merged JSON"
3. Paste into a text editor
4. Extract updated `branches` or `roles` arrays
5. Update the corresponding JSON files
6. Commit changes to version control

## Testing

```bash
# Run unit tests
npm run test
# or
pnpm test
```

Tests cover:
- Data loading functions
- Branch and role filtering
- Search functionality
- Filter combinations

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure build settings (Vercel auto-detects Next.js)
4. Deploy

Or use the Vercel CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Other Platforms

The app is a standard Next.js 14 application and can be deployed to:
- Netlify
- AWS Amplify
- Railway
- Self-hosted with Node.js

Build command: `npm run build`  
Start command: `npm start`  
Output directory: `.next`

## Environment Variables

Currently, no environment variables are required. The application uses static JSON data.

For future Supabase integration, you would add:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Technologies

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Testing**: Vitest
- **Deployment**: Vercel-ready

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome)

## Performance

- Lighthouse scores: 90+ (Performance & Accessibility)
- Static generation for all pages
- Optimized images and assets
- Minimal JavaScript bundle

## Contributing

1. Make changes in a feature branch
2. Test locally (`npm run dev`)
3. Run tests (`npm run test`)
4. Build for production (`npm run build`)
5. Submit for review

## License

Proprietary - Mikana Group © 2025

## Support

For issues or questions:
- Email: support@mikana.ae
- Operations: operations@mikana.ae

## Version History

- **2.0.0** (Current) - Latest version
- **1.0.0** (November 2025) - Initial release
  - 12 branches
  - 5 roles
  - Interactive checklists
  - Print mode
  - Edit mode
  - Search and filters
  - Dark mode

