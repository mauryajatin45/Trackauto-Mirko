require('dotenv').config();
const { shopifyApi, ApiVersion, Session } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_SCOPES ? process.env.SHOPIFY_SCOPES.split(',') : ['read_products'],
  hostName: process.env.HOST ? process.env.HOST.replace(/https?:\/\//, '') : 'localhost',
  apiVersion: ApiVersion.July24 || ApiVersion.Unstable,
  isEmbeddedApp: false,
});

const session = new Session({
  id: `offline_${process.env.SHOP_URL}`,
  shop: process.env.SHOP_URL,
  state: 'offline',
  isOnline: false,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
});

const client = new shopify.clients.Graphql({ session });

async function runTest() {
  try {
    console.log('Testing GraphQL request...');
    const response = await client.request(`
      query {
        collections(first: 5) {
          edges {
            node {
              id
              title
              handle
              description
            }
          }
        }
      }
    `);
    console.log('✅ GRAPHQL SUCCESS!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    if (err.response) {
      console.error('Response:', JSON.stringify(err.response, null, 2));
    }
  }
}

runTest();
