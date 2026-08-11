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

async function fetchCollectionProducts(collectionId) {
  let hasNextPage = true;
  let cursor = null;
  const products = [];
  
  while (hasNextPage) {
    const query = `
      query getCollectionProducts($id: ID!, $cursor: String) {
        collection(id: $id) {
          products(first: 250, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            edges { node { id tags } }
          }
        }
      }
    `;
    const res = await client.request(query, { variables: { id: collectionId, cursor } });
    const { pageInfo, edges } = res.data.collection.products;
    edges.forEach(edge => products.push(edge.node));
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
  return products;
}

async function addTagToProduct(productId, tag) {
  const mutation = `
    mutation tagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        userErrors { field message }
      }
    }
  `;
  try {
    const res = await client.request(mutation, { variables: { id: productId, tags: [tag] } });
    const errors = res.data.tagsAdd.userErrors;
    if (errors.length > 0) {
      console.error(`Error tagging ${productId}:`, errors);
    }
  } catch (error) {
    console.error(`Network error tagging ${productId}:`, error.message);
  }
}

async function run() {
  console.log("Fetching Land Cruiser ad products...");
  const lcProducts = await fetchCollectionProducts("gid://shopify/Collection/508402729251");
  
  console.log("Fetching Other 4WD ad products...");
  const otherProducts = await fetchCollectionProducts("gid://shopify/Collection/508402893091");
  
  let lcTagged = 0;
  let lcSkipped = 0;
  let otherTagged = 0;
  let otherSkipped = 0;

  console.log(`Starting to process ${lcProducts.length} Land Cruiser products...`);
  for (let i = 0; i < lcProducts.length; i++) {
    const p = lcProducts[i];
    if (p.tags.includes('Land-Cruiser-ad')) {
      lcSkipped++;
    } else {
      await addTagToProduct(p.id, 'Land-Cruiser-ad');
      lcTagged++;
    }
    // 600ms delay to respect rate limit (20 pts / sec, replenish is 50 pts / sec)
    await new Promise(res => setTimeout(res, 600)); 
    if (i > 0 && i % 50 === 0) console.log(`  ... processed ${i}/${lcProducts.length}`);
  }

  console.log(`Starting to process ${otherProducts.length} Other 4WD products...`);
  for (let i = 0; i < otherProducts.length; i++) {
    const p = otherProducts[i];
    if (p.tags.includes('Other-4WD-ad')) {
      otherSkipped++;
    } else {
      await addTagToProduct(p.id, 'Other-4WD-ad');
      otherTagged++;
    }
    await new Promise(res => setTimeout(res, 600)); 
    if (i > 0 && i % 25 === 0) console.log(`  ... processed ${i}/${otherProducts.length}`);
  }

  console.log("================================");
  console.log("TAGGING COMPLETE");
  console.log(`Land Cruiser ad: Tagged ${lcTagged}, Skipped (already tagged) ${lcSkipped}`);
  console.log(`Other 4WD ad: Tagged ${otherTagged}, Skipped (already tagged) ${otherSkipped}`);
  console.log("================================");
}

run().catch(console.error);
