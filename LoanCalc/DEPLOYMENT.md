# Deployment Guide for LoanCopilot

## Overview
This guide explains how to deploy the LoanCopilot app to a subdomain (e.g., loans.mezanitech.com)

## Prerequisites
- Node.js and npm installed
- Access to your mezanitech.com server/hosting

## Build Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Web Version
```bash
npm run export:web
```

This will create a `dist` folder with all the static files needed for deployment.

### 3. Upload to Your Server
Upload the contents of the `dist` folder to your server at the path that serves `mezanitech.com/LoanCopilot`

## Server Configuration

### Option A: Apache (.htaccess)
If using Apache, create a `.htaccess` file in the LoanCopilot directory:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /LoanCopilot/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /LoanCopilot/index.html [L]
</IfModule>
```

### Option B: Nginx
Add this to your Nginx configuration:

```nginx
location /LoanCopilot {
    alias /path/to/your/dist/folder;
    try_files $uri $uri/ /LoanCopilot/index.html;
    index index.html;
}
```

### Option C: Static Hosting (Netlify, Vercel, etc.)
If deploying to a static hosting platform:
- Set the publish directory to `dist`
- Set the base path to `/LoanCopilot`
- Configure redirects to handle client-side routing

## Directory Structure on Server
Your server should have:
```
/var/www/mezanitech.com/
  ├── (other site files)
  └── LoanCopilot/
      ├── index.html
      ├── _expo/
      ├── assets/
      └── (other built files from dist/)
```

## Testing
After deployment, visit:
- https://mezanitech.com/LoanCopilot

The app should load and all navigation should work correctly.

## Troubleshooting

### Routes Not Working
- Ensure your server is configured to redirect all requests to index.html
- Check that the baseUrl is correctly set in app.json

### Assets Not Loading
- Verify that all files from the `dist` folder were uploaded
- Check browser console for 404 errors
- Ensure file permissions are correct on the server

### White Screen
- Check browser console for errors
- Verify that JavaScript files are being served with correct MIME types
- Clear browser cache and try again

## Updates
To update the deployed app:
1. Make your changes
2. Run `npm run export:web`
3. Upload the new contents of the `dist` folder to replace the old files
