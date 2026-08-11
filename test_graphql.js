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

async function checkSchema() {
  const query = `
    query {
      __type(name: "Mutation") {
        fields {
          name
          args {
            name
            type {
              name
              kind
            }
          }
        }
      }
    }
  `;
  const res = await client.request(query);
  const fields = res.data.__type.fields.filter(f => f.name.includes("collectionAdd") || f.name.includes("collectionUpdate"));
  console.log(JSON.stringify(fields, null, 2));
}

checkSchema().catch(console.error);
