/**
 * Tjing Connect Function
 * Establishes connection between Auth0 user and Tjing
 * 
 * POST /.netlify/functions/tjing-connect
 * Headers: Authorization: Bearer <auth0-token>
 * Body: { connectToken: "<tjing-connect-token>" }
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
    const { connectToken } = body;

    // Validate required fields
    if (!connectToken) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Missing connectToken in request body'
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

    // Validate connect token format
    if (!tjing.isValidConnectToken(connectToken)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Invalid connect token format (must be UUID)'
        })
      };
    }

    // Use Auth0 user ID as partner user ID
    const partnerUserId = validation.userId;

    // Validate partner user ID
    if (!tjing.isValidPartnerUserId(partnerUserId)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Invalid partner user ID'
        })
      };
    }

    // Establish connection with Tjing
    const result = await tjing.establishConnection(connectToken, partnerUserId);

    if (!result.success) {
      return {
        statusCode: result.status || 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: result.error,
          errorCode: result.errorCode
        })
      };
    }

    // Return success with Tjing user ID
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        tjingUserId: result.tjingUserId,
        message: result.message,
        auth0UserId: validation.userId
      })
    };

  } catch (error) {
    console.error('Error in tjing-connect:', error);
    
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