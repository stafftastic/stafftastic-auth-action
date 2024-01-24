#!/usr/bin/env node
'use strict';

const { subtle: SubtleCrypto } = require('node:crypto').webcrypto;

const jwtLifeTimeSeconds = 60;

function base64URLEncode(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function createJWT(serviceAccount, tokenEndpoint) {
  const header = base64URLEncode(JSON.stringify({
    alg: 'ES256',
    typ: 'JWT',
  }));
  const payload = base64URLEncode(JSON.stringify({
    iss: serviceAccount.subject,
    sub: serviceAccount.subject,
    aud: tokenEndpoint,
    exp: Math.floor(Date.now() / 1000) + jwtLifeTimeSeconds,
  }));
  const signature = base64URLEncode(await SubtleCrypto.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    await SubtleCrypto.importKey(
      'pkcs8',
      Buffer.from(serviceAccount.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\n/g, ''),
      'base64'),
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['sign'],
    ),
    Buffer.from(`${header}.${payload}`),
  ));
  return `${header}.${payload}.${signature}`;
}

async function exchangeJWT(jwt, tokenEndpoint, clientID) {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}&client_id=${clientID}`,
  });
  return await response.json()
}

(async () => {
  const tokenEndpoint = process.env.TOKEN_ENDPOINT || 'https://oauth2.stafftastic.com/oauth2/token';
  const serviceAccount = JSON.parse(Buffer.from(process.env.BASE64_SERVICE_ACCOUNT, 'base64').toString('utf8'));
  const jwt = await createJWT(serviceAccount, tokenEndpoint);
  const response = await exchangeJWT(jwt, tokenEndpoint, serviceAccount.client_id);
  response.access_token ? console.log(response.access_token) : (() => {
    console.error(response.error_description);
    process.exit(1);
  })();
})();
