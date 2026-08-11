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

async function replaceCollection() {
  console.log("Finding the old collection...");
  
  // 1. Find the collection by handle
  const findQuery = `
    query {
      collectionByHandle(handle: "100-series-landcruiser") {
        id
      }
    }
  `;
  
  const findRes = await client.request(findQuery);
  const oldCollectionId = findRes.data.collectionByHandle?.id;

  // 2. Delete the old collection if it exists
  if (oldCollectionId) {
    console.log(`Deleting old collection: ${oldCollectionId}`);
    const deleteQuery = `
      mutation collectionDelete($input: CollectionDeleteInput!) {
        collectionDelete(input: $input) {
          deletedCollectionId
          userErrors {
            field
            message
          }
        }
      }
    `;
    await client.request(deleteQuery, { variables: { input: { id: oldCollectionId } } });
    console.log("Old collection deleted.");
  }

  // 3. Create the new collection called "LandCruiser 100 Series"
  console.log("Creating the new LandCruiser 100 Series smart collection...");
  
  const createQuery = `
    mutation collectionCreate($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection {
          id
          title
          handle
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    title: "LandCruiser 100 Series",
    handle: "landcruiser-100-series",
    descriptionHtml: "<p>Premium parts and upgrades designed for the Toyota LandCruiser 100 and 105 Series.</p>",
    ruleSet: {
      appliedDisjunctively: true, // "Any condition"
      rules: [
        {
          column: "TITLE",
          relation: "CONTAINS",
          condition: "100 Series"
        },
        {
          column: "TITLE",
          relation: "CONTAINS",
          condition: "100/105"
        }
      ]
    }
  };

  const createRes = await client.request(createQuery, { variables: { input } });
  const errors = createRes.data.collectionCreate.userErrors;

  if (errors && errors.length > 0) {
    console.error("Errors creating collection:");
    console.error(errors);
  } else {
    const collection = createRes.data.collectionCreate.collection;
    console.log(`✅ New collection created successfully!`);
    console.log(`Title: ${collection.title}`);
    console.log(`URL: https://${process.env.SHOP_URL}/collections/${collection.handle}`);
  }
}

replaceCollection().catch(console.error);
