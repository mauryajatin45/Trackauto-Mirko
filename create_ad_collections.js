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
const restClient = new shopify.clients.Rest({ session });

async function createCustomCollection(title, handle, productGids) {
  console.log(`\n--- Creating collection: ${title} ---`);
  
  // 1. Create collection (without products first to ensure it creates)
  const createQuery = `
    mutation collectionCreate($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const input = { title, handle };
  const res = await client.request(createQuery, { variables: { input } });
  
  if (res.data.collectionCreate.userErrors.length > 0) {
    console.error(`Failed to create ${title}:`, res.data.collectionCreate.userErrors);
    return;
  }
  
  const collectionIdGid = res.data.collectionCreate.collection.id;
  const collectionId = collectionIdGid.split('/').pop();
  console.log(`Created collection ID: ${collectionIdGid}`);
  
  // 2. Add products via REST API (Collects) to avoid any 250 array limits in GraphQL
  console.log(`Adding ${productGids.length} products to ${title}...`);
  
  let successCount = 0;
  for (let i = 0; i < productGids.length; i++) {
    const productId = productGids[i].split('/').pop();
    try {
      await restClient.post({
        path: 'collects',
        data: {
          collect: {
            collection_id: collectionId,
            product_id: productId
          }
        },
      });
      successCount++;
      if (successCount % 50 === 0) console.log(`  ... added ${successCount}/${productGids.length}`);
    } catch (err) {
      console.error(`Error adding product ${productId}:`, err.message);
    }
    
    // Slight delay to respect REST API rate limit (2 calls / sec)
    await new Promise(r => setTimeout(r, 600)); 
  }
  
  console.log(`✅ Successfully added ${successCount} products to ${title}`);
}

async function run() {
  const products = JSON.parse(fs.readFileSync('live_catalog_for_analysis.json', 'utf8'));

  const landCruiserKeywords = [
    'landcruiser', 'land cruiser', 'prado', 'fj cruiser',
    '40 series', '45 series', '47 series',
    '60 series', 
    '70 series', '73 series', '75 series', '76 series', '78 series', '79 series', 
    '80 series', 
    '100 series', '105 series', 
    '200 series', 
    '300 series',
    'hzj', 'vdj', 'fzj', 'hdj'
  ];

  const lcGids = [];
  const otherGids = [];

  products.forEach(p => {
    const title = p.title.toLowerCase();
    const tags = p.tags.map(t => t.toLowerCase());

    let isLC = false;
    if (landCruiserKeywords.some(kw => title.includes(kw))) isLC = true;
    else if (tags.some(tag => landCruiserKeywords.some(kw => tag.includes(kw)))) isLC = true;

    if (isLC) lcGids.push(p.id);
    else otherGids.push(p.id);
  });

  console.log(`Classification complete. LC: ${lcGids.length}, Other: ${otherGids.length}`);

  await createCustomCollection('Land Cruiser ad', 'land-cruiser-ad', lcGids);
  await createCustomCollection('Other 4WD ad', 'other-4wd-ad', otherGids);
  
  console.log('\nAll done!');
}

run().catch(console.error);
