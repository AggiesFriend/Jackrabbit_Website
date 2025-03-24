# GitHub Pages Deployment Instructions

## Overview
This document provides instructions for deploying "The Jackrabbit" website to GitHub Pages.

## Steps for Deployment

1. **Create a GitHub Repository**
   - Sign in to your GitHub account
   - Click the "+" icon in the top right corner and select "New repository"
   - Name your repository (e.g., "the-jackrabbit-website")
   - Make the repository public
   - Click "Create repository"

2. **Upload the Website Files**
   - Clone the repository to your local machine:
     ```
     git clone https://github.com/yourusername/the-jackrabbit-website.git
     ```
   - Copy all files from the `/home/ubuntu/jackrabbit-website-static` directory to the cloned repository folder
   - Navigate to the repository folder:
     ```
     cd the-jackrabbit-website
     ```
   - Add all files to git:
     ```
     git add .
     ```
   - Commit the changes:
     ```
     git commit -m "Initial website upload"
     ```
   - Push to GitHub:
     ```
     git push origin main
     ```

3. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click on "Settings"
   - Scroll down to the "GitHub Pages" section
   - Under "Source", select "main" branch
   - Click "Save"
   - Wait a few minutes for GitHub to build and deploy your site

4. **Access Your Website**
   - Your website will be available at: `https://yourusername.github.io/the-jackrabbit-website/`
   - GitHub will display the URL in the GitHub Pages section of your repository settings

## Notes
- The website is fully static and compatible with GitHub Pages
- All links are relative, ensuring they work correctly when deployed
- The site is responsive and works on mobile devices
- No server-side processing is required

## Troubleshooting
- If images don't appear, check that the paths in the HTML files match the actual file locations
- If styling is missing, ensure all CSS files were uploaded
- For any issues, check the GitHub Pages documentation: https://docs.github.com/en/pages
