# 📧 Email Service Setup (Resend)

## ✅ What's Done

- ✅ Email service library created (`src/lib/email.ts`)
- ✅ Beautiful HTML email templates for:
  - Welcome emails
  - Email verification
  - Password reset
  - Payment receipts
  - Payment failures
- ✅ All API routes updated to send real emails

## 🚀 Setup Instructions

### Step 1: Get Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free)
3. Go to API Keys section
4. Create a new API key
5. Copy the API key

### Step 2: Add to .env

Add these variables to your `.env` file:

```env
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email Configuration
FROM_EMAIL=noreply@yourdomain.com
APP_NAME=Football Analytics
APP_URL=http://localhost:3000
```

**Important:**
- `FROM_EMAIL`: Must be a verified domain in Resend (or use `onboarding@resend.dev` for testing)
- `APP_URL`: Your production URL (e.g., `https://yourapp.com`)

### Step 3: Install Dependencies

```bash
npm install resend
```

### Step 4: Verify Domain (Production)

For production, you need to:
1. Add your domain in Resend dashboard
2. Add DNS records (SPF, DKIM)
3. Wait for verification
4. Update `FROM_EMAIL` to use your domain

## 📨 Email Types

### 1. Welcome Email
- Sent after registration
- Beautiful gradient design
- Call-to-action button

### 2. Email Verification
- Sent during registration
- 24-hour expiration
- Secure verification link

### 3. Password Reset
- Sent when user requests reset
- 1-hour expiration
- Secure reset link

### 4. Payment Receipt
- Sent after successful payment
- Invoice details
- Professional receipt format

### 5. Payment Failure
- Sent when payment fails
- Error reason
- Link to update payment method

## 🧪 Testing

### Without API Key (Development)
If `RESEND_API_KEY` is not set, emails will be logged to console instead of being sent. Perfect for development!

### With API Key (Production)
Emails will be sent via Resend. Check Resend dashboard for delivery status.

## 🔧 Customization

Edit `src/lib/email.ts` to:
- Change email designs
- Add more email types
- Customize templates
- Add attachments

## 📊 Monitoring

- Check Resend dashboard for:
  - Delivery rates
  - Bounce rates
  - Open rates (if tracking enabled)
  - Error logs

## 🎨 Email Templates

All templates are:
- ✅ Mobile-responsive
- ✅ Professional design
- ✅ Branded with your app name
- ✅ Include both HTML and plain text versions

---

**Ready to send real emails!** 🚀

