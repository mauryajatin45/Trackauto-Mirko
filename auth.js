require('dotenv').config();
const express = require('express');
const { shopifyApi, ApiVersion } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');
const fs = require('fs');

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_SCOPES.split(','),
  hostName: process.env.HOST ? process.env.HOST.replace(/https?:\/\//, '') : 'localhost:3000',
  hostScheme: 'http',
  apiVersion: ApiVersion.April26,
  isEmbeddedApp: false,
});

const app = express();

app.get('/login', async (req, res) => {
  const shop = req.query.shop || process.env.SHOP_URL;
  if (!shop) {
    return res.status(400).send('Missing shop parameter.');
  }

  try {
    await shopify.auth.begin({
      shop,
      callbackPath: '/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

app.get('/auth/callback', async (req, res) => {
  try {
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });
    
    const session = callbackResponse.session;
    console.log('\n=============================================');
    console.log('✅ AUTHENTICATION SUCCESSFUL!');
    console.log('Access Token:', session.accessToken);
    console.log('=============================================\n');

    // Update .env file automatically
    let envContent = fs.readFileSync('.env', 'utf8');
    envContent = envContent.replace(/SHOPIFY_ACCESS_TOKEN=.*/, `SHOPIFY_ACCESS_TOKEN=${session.accessToken}`);
    fs.writeFileSync('.env', envContent);
    console.log('Updated .env file with new SHOPIFY_ACCESS_TOKEN');

    res.send('Authentication successful! You can close this tab and return to the chat. The token has been logged in the terminal and saved to .env.');
  } catch (error) {
    console.error('Error in callback:', error);
    res.status(500).send(error.message);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`\n🚀 Auth server is running.`);
  console.log(`To authenticate, please visit:`);
  console.log(`http://localhost:${port}/login?shop=${process.env.SHOP_URL}\n`);
  console.log(`Make sure your App Settings in Shopify Partner Dashboard has this Allowed redirection URI:`);
  console.log(`http://localhost:${port}/auth/callback\n`);
});
