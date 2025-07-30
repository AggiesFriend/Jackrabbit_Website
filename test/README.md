# The Jackrabbit Jekyll Site

This is a Jekyll-powered version of The Jackrabbit website, converted from static HTML to use Jekyll's templating system for easier navigation management.

## What's Been Done

### 1. Jekyll Structure Created
- `_config.yml` - Site configuration with navigation menu
- `_layouts/` - Page templates (default.html, page.html)
- `_includes/` - Reusable components (navigation.html, head.html, footer.html)
- `css/` - Stylesheets (styles.css, modern-elements.css)
- `js/` - JavaScript files (script.js)

### 2. Navigation System
The navigation is now centrally managed in `_config.yml`:

```yaml
navigation:
  - title: "Home"
    url: "/"
  - title: "Books"
    url: "/books/"
  - title: "Characters"
    url: "/characters/"
  - title: "Encyclopedia"
    url: "/encyclopedia/encyclopedia.html"
  - title: "Contact"
    url: "/contact/"
```

### 3. Pages Converted
- `index.md` - Homepage
- `books.md` - Books listing page
- `characters.md` - Characters page
- `contact.md` - Contact page
- `book1/index.md` - Individual book page example

## Benefits of Jekyll Implementation

1. **Centralized Navigation**: All navigation links are managed in one place (`_config.yml`)
2. **Template Reuse**: Common elements (header, footer, navigation) are in reusable includes
3. **Easy Maintenance**: Adding new pages or changing navigation is much simpler
4. **Consistent Styling**: All pages use the same layout templates
5. **GitHub Pages Ready**: Can be deployed directly to GitHub Pages

## Local Development

To run the site locally:

```bash
cd /path/to/jekyll/site
bundle install
bundle exec jekyll serve --host 0.0.0.0 --port 4000
```

Then visit `http://localhost:4000`

## Deployment to GitHub Pages

1. **Create a new repository** on GitHub (or use your existing one)

2. **Push the Jekyll files** to your repository:
   ```bash
   git init
   git add .
   git commit -m "Convert to Jekyll"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository settings
   - Scroll to "Pages" section
   - Set source to "Deploy from a branch"
   - Select "main" branch and "/ (root)" folder
   - Click Save

4. **Update _config.yml**:
   ```yaml
   url: "https://yourusername.github.io"
   baseurl: "/your-repo-name"  # Only if not using a custom domain
   ```

## Adding New Pages

To add a new page:

1. Create a new `.md` file (e.g., `new-page.md`)
2. Add front matter:
   ```yaml
   ---
   layout: page
   title: "New Page Title"
   description: "Page description"
   ---
   ```
3. Add the page to navigation in `_config.yml`

## Adding New Navigation Items

Simply edit the `navigation` section in `_config.yml`:

```yaml
navigation:
  - title: "New Section"
    url: "/new-section/"
```

The navigation will automatically update across all pages.

## File Structure

```
my_jekyll_site/
├── _config.yml          # Site configuration
├── _includes/           # Reusable components
│   ├── navigation.html  # Navigation menu
│   ├── head.html       # HTML head section
│   └── footer.html     # Footer
├── _layouts/           # Page templates
│   ├── default.html    # Base template
│   └── page.html       # Page template
├── css/               # Stylesheets
├── js/                # JavaScript files
├── images/            # Images (you'll need to copy these)
├── book1/             # Individual book pages
├── index.md           # Homepage
├── books.md           # Books page
├── characters.md      # Characters page
├── contact.md         # Contact page
├── Gemfile           # Ruby dependencies
└── README.md         # This file
```

## Next Steps

1. **Copy your images**: Copy your `images/` directory to the Jekyll site
2. **Copy remaining assets**: Copy any other CSS, JS, or asset files you need
3. **Convert remaining pages**: Convert your individual character pages and book pages
4. **Test thoroughly**: Test all links and functionality
5. **Deploy**: Push to GitHub and enable GitHub Pages

## Maintenance

With Jekyll, maintaining your site is now much easier:

- **Adding pages**: Create new `.md` files with front matter
- **Updating navigation**: Edit `_config.yml`
- **Changing design**: Edit the layout files in `_layouts/` and `_includes/`
- **Adding content**: Edit the Markdown files

The navigation will automatically stay consistent across all pages!

