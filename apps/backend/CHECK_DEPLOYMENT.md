# Check if Backend is Deployed with Latest Changes

## Quick Check

Run this command to see the latest commit on Render:

```bash
# Check your Render dashboard logs
# Look for: "feat(posts): add missing comment like/unlike/replies methods to service"
# Commit hash: 889a546
```

## Test Endpoints

### 1. Check if endpoint exists
```bash
curl -X OPTIONS https://your-backend.onrender.com/api/posts/comments/test/like \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return 200 or 204, not 404
```

### 2. Test with actual comment ID
```bash
# Get a comment ID from your app first, then:
curl -X POST https://your-backend.onrender.com/api/posts/comments/COMMENT_ID/like \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Common Issues

### Issue 1: Render hasn't deployed yet
**Solution:** 
- Go to Render dashboard
- Check deployment status
- Wait for deployment to complete (usually 2-5 minutes)
- Look for "Live" status

### Issue 2: CommentLike model not initialized
**Error:** "Cannot read property 'create' of undefined"
**Solution:** Backend needs to restart to register the new model

### Issue 3: Database doesn't have CommentLike collection
**Solution:** The collection will be created automatically on first use

## Check Render Logs

Look for these errors in Render logs:

1. **"commentLikeModel is not defined"**
   - Model not injected properly
   - Need to redeploy

2. **"Cannot read property 'create' of undefined"**
   - Model not registered in module
   - Check posts.module.ts

3. **"Cast to ObjectId failed"**
   - Invalid comment ID
   - Check frontend is sending correct ID

4. **"Comment not found"**
   - Comment doesn't exist
   - Check comment ID is valid

## Force Redeploy on Render

If deployment seems stuck:

1. Go to Render dashboard
2. Click on your backend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment to complete

## Verify Deployment

Once deployed, check:
- ✅ Deployment status shows "Live"
- ✅ Latest commit hash matches: 889a546
- ✅ No errors in logs
- ✅ Service is responding

Then test the like comment feature again!
