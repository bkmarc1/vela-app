# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Backend API
```
curl -X GET "$URL/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X GET "$URL/api/properties" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X POST "$URL/api/properties" -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_SESSION_TOKEN" -d '{"name":"Demo","city":"Athens"}'
```

## Step 3: Browser Cookie
Set cookie `session_token` with value YOUR_SESSION_TOKEN, then navigate.

## Checklist
- user has `user_id` UUID
- session.user_id matches user.user_id
- queries use {"_id": 0}
