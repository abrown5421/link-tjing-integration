/**
 * Tjing API Client
 * Handles communication with Tjing API
 */

const fetch = require('node-fetch');

class TjingClient {
  constructor(apiUrl, partnerSlug, partnerToken) {
    this.apiUrl = apiUrl;
    this.partnerSlug = partnerSlug;
    this.partnerToken = partnerToken;
  }

  /**
   * Establish partner connection using connect token
   * This is step 2 in the Tjing integration flow
   */
  async establishConnection(connectToken, partnerUserId) {
    const url = `${this.apiUrl}/api/partner/establish-partner-connection`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectToken: connectToken,
          partnerUserId: partnerUserId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to establish connection',
          errorCode: data.errorCode,
          status: response.status
        };
      }

      return {
        success: true,
        tjingUserId: data.userId,
        message: data.message
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Create partner authentication token
   * This is step 3 in the Tjing integration flow
   * Requires PARTNER role authentication
   */
  async createAuthToken(tjingUserId) {
    const url = `${this.apiUrl}/graphql`;
    
    const query = `
      mutation CreatePartnerAuthToken($partnerSlug: String!, $tjingUserId: String!) {
        CreatePartnerAuthToken(partnerSlug: $partnerSlug, tjingUserId: $tjingUserId) {
          token
          expireAt
        }
      }
    `;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.partnerToken}`
        },
        body: JSON.stringify({
          query: query,
          variables: {
            partnerSlug: this.partnerSlug,
            tjingUserId: tjingUserId
          }
        })
      });

      const result = await response.json();

      if (result.errors) {
        return {
          success: false,
          error: result.errors[0].message || 'Failed to create auth token',
          errors: result.errors
        };
      }

      if (!result.data || !result.data.CreatePartnerAuthToken) {
        return {
          success: false,
          error: 'Invalid response from Tjing API'
        };
      }

      return {
        success: true,
        token: result.data.CreatePartnerAuthToken.token,
        expireAt: result.data.CreatePartnerAuthToken.expireAt
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Validate connect token format
   */
  isValidConnectToken(token) {
    // Must be UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(token);
  }

  /**
   * Validate partner user ID format
   */
  isValidPartnerUserId(userId) {
    // Must be 1-255 characters
    return userId && userId.length >= 1 && userId.length <= 255;
  }
}

module.exports = TjingClient;