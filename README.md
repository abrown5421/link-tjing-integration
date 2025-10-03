Link Tjing Integration API
Serverless API layer for connecting Link WordPress users (via Auth0) to Tjing accounts.
Architecture
This project provides two Netlify serverless functions that act as a secure bridge between:

Link WordPress Site (using Auth0 for authentication)
Tjing API (disc golf platform)

API Endpoints
1. /tjing-connect - Establish Connection
Connects an Auth0-authenticated user to their Tjing account using a connect token.
Request:
javascriptPOST /.netlify/functions/tjing-connect
Headers:
  Authorization: Bearer <auth0-access-token>
  Content-Type: application/json
Body:
  { "connectToken": "<tjing-connect-token-uuid>" }
Response:
json{
  "success": true,
  "tjingUserId": "uuid-of-tjing-user",
  "message": "Connection established successfully",
  "auth0UserId": "auth0|123456"
}
2. /tjing-auth - Get Authentication Token
Creates a Tjing authentication token for a connected user.
Request:
javascriptPOST /.netlify/functions/tjing-auth
Headers:
  Authorization: Bearer <auth0-access-token>
  Content-Type: application/json
Body:
  { "tjingUserId": "<tjing-user-id-uuid>" }
Response:
json{
  "success": true,
  "token": "tjing-session-token",
  "expireAt": "2025-08-18T11:20:08.408Z",
  "tjingUserId": "uuid-of-tjing-user"
}
Setup Instructions
Prerequisites

Node.js 18+ installed
GitHub account
Netlify account
Auth0 account (already configured by client)
Tjing partner credentials

Local Development

Clone and install dependencies:

bash   npm install

Create .env file:

bash   cp .env.example .env

Configure environment variables in .env:

   AUTH0_DOMAIN=your-tenant.auth0.com
   AUTH0_AUDIENCE=your-api-identifier
   TJING_API_URL=https://dev.api.tjing.se
   TJING_PARTNER_SLUG=link
   TJING_PARTNER_TOKEN=your-partner-session-token

Run locally:

bash   npx netlify dev

Test the endpoints:

bash   # Test tjing-connect
   curl -X POST http://localhost:8888/.netlify/functions/tjing-connect \
     -H "Authorization: Bearer YOUR_AUTH0_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"connectToken":"tjing-connect-token-uuid"}'
Deployment
Deploy to Netlify
Once connected to GitHub (see setup steps below), Netlify will automatically deploy on every push to main.
Manual Deploy
bashnpx netlify deploy --prod
Environment Variables
Set these in Netlify Dashboard → Site Settings → Environment Variables:
VariableDescriptionExampleAUTH0_DOMAINYour Auth0 tenant domainyour-tenant.auth0.comAUTH0_AUDIENCEAuth0 API identifierhttps://your-apiTJING_API_URLTjing API base URLhttps://dev.api.tjing.seTJING_PARTNER_SLUGPartner identifierlinkTJING_PARTNER_TOKENPartner session tokenGet from Tjing team
Integration Flow

User on Tjing Side:

User selects "Connect to Link" in Tjing
Tjing generates a connectToken (expires in 1 hour)


User on WordPress Side:

User is authenticated via Auth0
WordPress sends Auth0 token + Tjing connectToken to /tjing-connect
API validates Auth0 token and establishes connection
Returns tjingUserId


Creating Auth Tokens:

WordPress can request Tjing auth tokens via /tjing-auth
Sends Auth0 token + tjingUserId
Returns Tjing session token (expires in 2 weeks, auto-renews on use)



WordPress Integration Example
javascript// Example: Connect to Tjing from WordPress
async function connectToTjing(auth0Token, connectToken) {
  const response = await fetch('https://your-site.netlify.app/.netlify/functions/tjing-connect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + auth0Token
    },
    body: JSON.stringify({ connectToken: connectToken })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Store tjingUserId for future use
    localStorage.setItem('tjingUserId', result.tjingUserId);
    console.log('Connected to Tjing!', result);
  } else {
    console.error('Connection failed:', result.error);
  }
}

// Example: Get Tjing auth token
async function getTjingAuthToken(auth0Token, tjingUserId) {
  const response = await fetch('https://your-site.netlify.app/.netlify/functions/tjing-auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + auth0Token
    },
    body: JSON.stringify({ tjingUserId: tjingUserId })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Use result.token for Tjing API calls
    console.log('Tjing token:', result.token);
    return result.token;
  } else {
    console.error('Auth failed:', result.error);
  }
}
Security Notes

All requests require valid Auth0 JWT tokens
Tjing partner token is securely stored in environment variables
CORS is configured for cross-origin requests
All sensitive operations are logged for audit
Tokens are validated for format, expiration, and authenticity

Support
For questions about:

Tjing Integration: Contact Marcus (Tjing founder)
Auth0 Setup: Contact client team
API Issues: Check Netlify function logs

License
Proprietary - Link Disc Golf