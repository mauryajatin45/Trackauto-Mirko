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
  const products = [];

  console.log("Fetching live catalog...");

  while (hasNextPage) {
    const query = `
      query getProducts($cursor: String) {
        products(first: 250, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              productType
              tags
              vendor
            }
          }
        }
      }
    `;

    try {
      const response = await client.request(query, { variables: { cursor } });
      const { pageInfo, edges } = response.data.products;
      
      edges.forEach(edge => products.push(edge.node));
      
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    } catch (error) {
      console.error("Error fetching products:", error);
      break;
    }
  }

  console.log(`Fetched ${products.length} products.`);
  fs.writeFileSync('live_catalog_for_analysis.json', JSON.stringify(products, null, 2));
  console.log("Saved to live_catalog_for_analysis.json");
}

fetchAllProducts();
