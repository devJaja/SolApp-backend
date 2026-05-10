# Deploying Firebase to Render

Since Render doesn't support uploading files directly, you need to use the environment variable approach for the Firebase service account.

## Steps

### 1. Get Your Service Account JSON

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click gear icon → "Project settings"
4. Go to "Service accounts" tab
5. Click "Generate new private key"
6. Download the JSON file

### 2. Prepare the JSON for Render

Open the downloaded JSON file. It should look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  ...
}
```

### 3. Add to Render Environment Variables

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add a new environment variable:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Copy the ENTIRE JSON content (all on one line)

Example:
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",...}
```

### 4. Save and Deploy

1. Click "Save Changes"
2. Render will automatically redeploy your service
3. Check the logs to verify Firebase initialized successfully

You should see:
```
[FirebaseService] Firebase initialized with service account from env
```

## Troubleshooting

### "Firebase service account not found"

- Make sure the environment variable is named exactly `FIREBASE_SERVICE_ACCOUNT`
- Ensure the JSON is valid (no extra spaces or line breaks)
- Check that all quotes are properly escaped

### "Failed to initialize Firebase"

- Verify the JSON is complete and valid
- Check that the private key includes the full `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
- Ensure newlines in the private key are represented as `\n`

### Testing

After deployment, test by:
1. Triggering a notification in your app
2. Checking Render logs for "Push notification sent successfully"
3. Verifying the notification appears on your device

## Local Development

For local development, you can use the file-based approach:

1. Place `firebase-service-account.json` in `solcial-backend/` folder
2. The service will automatically detect and use it
3. This file is in `.gitignore` so it won't be committed

## Security

- Never commit the service account JSON to git
- Never share the service account JSON publicly
- Rotate the key if it's ever exposed
- Use Render's environment variables for production
