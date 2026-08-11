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

async function create100SeriesCollection() {
  const query = `
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

  // Create an automated collection based on title containing '100 Series' or '105 Series'
  const input = {
    title: "100 Series LandCruiser",
    handle: "100-series-landcruiser",
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
          condition: "105 Series"
        }
      ]
    }
  };

  try {
    const response = await client.request(query, { variables: { input } });
    const errors = response.data.collectionCreate.userErrors;

    if (errors && errors.length > 0) {
      console.error("Errors creating collection:");
      console.error(errors);
    } else {
      const collection = response.data.collectionCreate.collection;
      console.log(`✅ Collection created successfully!`);
      console.log(`Title: ${collection.title}`);
      console.log(`URL: https://${process.env.SHOP_URL}/collections/${collection.handle}`);
    }
  } catch (err) {
    console.error("GraphQL request failed:", err);
  }
}

create100SeriesCollection().catch(console.error);
