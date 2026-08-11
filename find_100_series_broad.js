require('dotenv').config();
const { shopifyApi, ApiVersion, Session } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');
const fs = require('fs');

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_SCOPES.split(','),
  hostName: process.env.HOST ? process.env.HOST.replace(/https?:\/\//, '') : 'localhost',
  apiVersion: ApiVersion.April26,
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

async function fetchAllProducts() {
  let hasNextPage = true;
  let cursor = null;
  const allProducts = [];
  
  console.log('Fetching all live products...');

  while (hasNextPage) {
    const query = `
      query getProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              tags
            }
          }
        }
      }
    `;

    const res = await client.request(query, { variables: { cursor } });
    const products = res.data.products.edges;

    for (const edge of products) {
      allProducts.push(edge.node);
    }

    hasNextPage = res.data.products.pageInfo.hasNextPage;
    cursor = res.data.products.pageInfo.endCursor;
  }

  // Filter for 100/105 series
  const matches = allProducts.filter(p => {
    const text = (p.title + ' ' + (p.tags ? p.tags.join(' ') : '')).toLowerCase();
    // Match 100 or 105, followed eventually by 'series' or 'landcruiser'
    // Specifically looking for "100" in contexts like "100/105", "100 series", "100", "uzj100"
    if (text.includes('100') || text.includes('105')) {
       // exclude things like 100mm, 100t
       if (!text.includes('100mm') && !text.includes('100t') && !text.includes('100kg')) {
           return true;
       }
    }
    return false;
  });

  console.log(`\nFound ${matches.length} products that mention 100 or 105:\n`);
  matches.forEach(p => {
    console.log(`- ${p.title}`);
  });
}

fetchAllProducts().catch(console.error);
