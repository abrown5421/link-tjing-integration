/**
 * Tjing Auth Function
 * Creates Tjing authentication token for connected user
 * 
 * POST /.netlify/functions/tjing-auth
 * Headers: Authorization: Bearer <auth0-token>
 * Body: { tjingUserId: "<tjing-user-id>" }
 */

const Auth0Validator = require('../../src/auth0-validator');
const TjingClient = require('../../src/tjing-client');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { tjingUserId } = body;

    // Validate required fields
    if (!tjingUserId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Missing tjingUserId in request body'
        })
      };
    }

    // Initialize Auth0 validator
    const auth0 = new Auth0Validator(
      process.env.AUTH0_DOMAIN,
      process.env.AUTH0_AUDIENCE
    );

    // Extract and validate Auth0 token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = auth0.extractTokenFromHeader(authHeader);

    if (!token) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Missing or invalid Authorization header'
        })
      };
    }

    // Validate the Auth0 token
    const validation = await auth0.validateToken(token);
    
    if (!validation.valid) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Invalid or expired token',
          details: validation.error
        })
      };
    }

    // Initialize Tjing client
    const tjing = new TjingClient(
      process.env.TJING_API_URL,
      process.env.TJING_PARTNER_SLUG,
      process.env.TJING_PARTNER_TOKEN
    );

    // Validate Tjing user ID format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tjingUserId)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Invalid Tjing user ID format (must be UUID)'
        })
      };
    }

    // Create authentication token
    const result = await tjing.createAuthToken(tjingUserId);

    if (!result.success) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: result.error,
          errorCode: result.errorCode
        })
      };
    }

    // Return success with auth token
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        token: result.token,
        expireAt: result.expireAt,
        tjingUserId: tjingUserId
      })
    };

  } catch (error) {
    console.error('Error in tjing-auth:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};