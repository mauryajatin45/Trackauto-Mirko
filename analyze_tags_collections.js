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

async function fetchCollectionProducts(collectionId) {
  let hasNextPage = true;
  let cursor = null;
  const productIds = new Set();
  
  while (hasNextPage) {
    const query = `
      query getCollectionProducts($id: ID!, $cursor: String) {
        collection(id: $id) {
          products(first: 250, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            edges { node { id title } }
          }
        }
      }
    `;
    const res = await client.request(query, { variables: { id: collectionId, cursor } });
    const { pageInfo, edges } = res.data.collection.products;
    edges.forEach(edge => productIds.add(edge.node.id));
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
  return productIds;
}

async function fetchAllProducts() {
  let hasNextPage = true;
  let cursor = null;
  const products = [];
  
  while (hasNextPage) {
    const query = `
      query getProducts($cursor: String) {
        products(first: 250, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges { node { id title tags } }
        }
      }
    `;
    const res = await client.request(query, { variables: { cursor } });
    const { pageInfo, edges } = res.data.products;
    edges.forEach(edge => products.push(edge.node));
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
  return products;
}

async function run() {
  console.log("Fetching Land Cruiser ad products...");
  const lcIds = await fetchCollectionProducts("gid://shopify/Collection/508402729251");
  console.log("Fetching Other 4WD ad products...");
  const otherIds = await fetchCollectionProducts("gid://shopify/Collection/508402893091");
  console.log("Fetching all products...");
  const allProducts = await fetchAllProducts();
  
  const report = {
    totalAll: allProducts.length,
    landCruiserCount: lcIds.size,
    otherCount: otherIds.size,
    inBoth: [],
    inNeither: []
  };

  allProducts.forEach(p => {
    const inLc = lcIds.has(p.id);
    const inOther = otherIds.has(p.id);
    
    if (inLc && inOther) {
      report.inBoth.push({ id: p.id, title: p.title });
    } else if (!inLc && !inOther) {
      report.inNeither.push({ id: p.id, title: p.title });
    }
  });

  fs.writeFileSync('tag_analysis_report.json', JSON.stringify(report, null, 2));
  console.log("Saved report to tag_analysis_report.json");
}

run().catch(console.error);
