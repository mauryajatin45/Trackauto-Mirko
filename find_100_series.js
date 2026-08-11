require('dotenv').config();
const { shopifyApi, ApiVersion, Session } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');

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

async function find100SeriesProducts() {
  let hasNextPage = true;
  let cursor = null;
  const matches = [];
  
  const keywords = ['100 series', '100-series', '105 series', '105-series', 'uzj100', 'fzj105', 'hzj105', 'hdj100'];

  console.log('Fetching products and scanning for 100 series...');

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
      const p = edge.node;
      const textToSearch = (p.title + ' ' + (p.tags ? p.tags.join(' ') : '')).toLowerCase();
      
      const isMatch = keywords.some(kw => textToSearch.includes(kw));
      if (isMatch) {
        matches.push(p);
      }
    }

    hasNextPage = res.data.products.pageInfo.hasNextPage;
    cursor = res.data.products.pageInfo.endCursor;
  }

  console.log(`\nFound ${matches.length} products that can be added to the LandCruiser 100/105 Series collection:\n`);
  matches.forEach(p => {
    console.log(`- ${p.title} (https://80df6d-2.myshopify.com/products/${p.handle})`);
  });
}

find100SeriesProducts().catch(console.error);
