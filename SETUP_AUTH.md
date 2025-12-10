# Authentication Setup Guide

This guide will help you set up Google OAuth and email-based password reset for your Sahara app.

## Prerequisites

1. A Google Cloud Console account
2. An email account (Gmail recommended) for sending password reset emails

## Step 1: Google OAuth Setup

### 1.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or **Google Identity Services**)
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required information
   - Add your email to test users
6. Create OAuth client IDs for:
   - **Web application** (for web)
   - **iOS** (for iOS app) - You'll need your iOS bundle ID
   - **Android** (for Android app) - You'll need your Android package name (e.g., `com.anonymous.Sahara`)

### 1.2 Configure Frontend Environment Variables

Create a `.env` file in the root directory of your project:

```env
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

**Note:** For Expo, you can also use a single `EXPO_PUBLIC_GOOGLE_CLIENT_ID` if you're using the same client ID for all platforms.

### 1.3 Update App Scheme

Make sure your `app.json` has the correct scheme. The Google auth utility uses `com.anonymous.Sahara` - update this in `src/utils/googleAuth.js` if your app uses a different scheme.

## Step 2: Email Service Setup

### 2.1 Gmail Setup (Recommended)

1. Go to your Google Account settings
2. Enable **2-Step Verification**
3. Go to **App Passwords** (you may need to search for it)
4. Generate an app password for "Mail"
5. Copy the generated password (you'll use this in your backend `.env`)

### 2.2 Other Email Providers

For other email providers (Outlook, Yahoo, etc.), you'll need:
- SMTP server address
- SMTP port (usually 587 for TLS or 465 for SSL)
- Your email address
- Your email password or app-specific password

### 2.3 Configure Backend Environment Variables

Create a `.env` file in the `Backend` directory:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000

# MongoDB Connection
MONGO_URI=your-mongodb-connection-string

# Server Port
PORT=5000
```

**Important:** 
- For Gmail, use the **App Password** you generated, not your regular password
- For other providers, update `EMAIL_SERVICE` accordingly
- The `FRONTEND_URL` should point to where your frontend is hosted (for password reset email links)

### 2.4 Update Email Service Configuration

If you're using a provider other than Gmail, you may need to update `Backend/utils/emailService.js`:

```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.your-provider.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

## Step 3: Install Dependencies

### Backend Dependencies

Navigate to the `Backend` directory and run:

```bash
npm install
```

This will install `nodemailer` which is required for sending emails.

### Frontend Dependencies

Navigate to the root directory and run:

```bash
npm install
```

This will install `expo-web-browser` and `expo-crypto` which are required for Google OAuth.

## Step 4: Test the Setup

### Test Google OAuth

1. Start your Expo app: `npm start`
2. Navigate to the Login or Sign Up screen
3. Click "Sign in with Google" or "Sign up with Google"
4. You should see the Google sign-in screen

### Test Password Reset

1. Go to the Login screen
2. Click "Forgot Password"
3. Enter your email address
4. Check your email for the reset token
5. Enter the token and new password in the app

## Troubleshooting

### Google OAuth Issues

- **"Google OAuth is not configured"**: Make sure you've set the environment variables correctly
- **"Invalid client"**: Verify your client IDs in Google Cloud Console
- **Redirect URI mismatch**: Make sure the redirect URI in Google Cloud Console matches your app scheme

### Email Issues

- **"Failed to send reset email"**: 
  - Check your email credentials
  - For Gmail, make sure you're using an App Password, not your regular password
  - Check that `EMAIL_SERVICE` matches your provider
  - Verify your email server allows SMTP connections

- **Emails going to spam**: 
  - Configure SPF and DKIM records for your domain
  - Use a professional email service for production

### Backend Connection Issues

- Make sure your backend server is running on the correct port
- Check that `API_BASE` in `api.js` matches your backend URL
- Verify CORS is configured correctly in `Backend/server.js`

## Security Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use App Passwords** - Don't use your main email password
3. **Verify Google tokens server-side** - The current implementation trusts the client token; in production, verify tokens with Google's API
4. **Use HTTPS in production** - Password reset links should use HTTPS
5. **Rate limit** - Consider adding rate limiting to prevent abuse of the password reset endpoint

## Production Considerations

1. Set up proper email service (SendGrid, AWS SES, etc.) instead of Gmail
2. Implement proper token verification for Google OAuth
3. Add rate limiting to prevent abuse
4. Use environment-specific configuration
5. Set up proper logging and monitoring
6. Configure SPF/DKIM for your email domain

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check that your backend server is running

