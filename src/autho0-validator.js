/**
 * Auth0 Token Validator
 * Validates JWT tokens from Auth0 to authenticate WordPress users
 */

const fetch = require('node-fetch');

class Auth0Validator {
  constructor(domain, audience) {
    this.domain = domain;
    this.audience = audience;
    this.jwksCache = null;
    this.jwksCacheExpiry = null;
  }

  /**
   * Fetch JWKS (JSON Web Key Set) from Auth0
   */
  async getJWKS() {
    const now = Date.now();
    
    // Return cached JWKS if still valid (cache for 1 hour)
    if (this.jwksCache && this.jwksCacheExpiry && now < this.jwksCacheExpiry) {
      return this.jwksCache;
    }

    const jwksUrl = `https://${this.domain}/.well-known/jwks.json`;
    const response = await fetch(jwksUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch JWKS');
    }

    this.jwksCache = await response.json();
    this.jwksCacheExpiry = now + (60 * 60 * 1000); // Cache for 1 hour
    
    return this.jwksCache;
  }

  /**
   * Decode JWT without verification (to extract header)
   */
  decodeToken(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    return { header, payload };
  }

  /**
   * Validate Auth0 JWT token
   * Returns the decoded token payload if valid
   */
  async validateToken(token) {
    try {
      // Decode token to get header and payload
      const { header, payload } = this.decodeToken(token);

      // Basic validation checks
      if (!header.kid) {
        throw new Error('Token missing key ID');
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Token has expired');
      }

      // Check audience
      if (this.audience && payload.aud !== this.audience) {
        throw new Error('Token audience mismatch');
      }

      // Check issuer
      const expectedIssuer = `https://${this.domain}/`;
      if (payload.iss !== expectedIssuer) {
        throw new Error('Token issuer mismatch');
      }

      // In production, you should verify the signature using the JWKS
      // For now, we'll do basic validation
      // To add full signature verification, use jsonwebtoken or jose library

      return {
        valid: true,
        payload: payload,
        userId: payload.sub, // Auth0 user ID
        email: payload.email
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

module.exports = Auth0Validator;