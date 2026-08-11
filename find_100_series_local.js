const fs = require('fs');

function find100SeriesProducts() {
  const data = JSON.parse(fs.readFileSync('full_catalog_backup.json', 'utf8'));
  
  const keywords = ['100 series', '100-series', '105 series', '105-series', 'uzj100', 'fzj105', 'hzj105', 'hdj100', '100series', '105series'];
  const matches = [];

  for (const product of data) {
    const textToSearch = (product.original_title + ' ' + (product.original_descriptionHtml || '')).toLowerCase();
    
    const isMatch = keywords.some(kw => textToSearch.includes(kw));
    if (isMatch) {
      matches.push(product);
    }
  }

  console.log(`\nFound ${matches.length} products that can be added to the LandCruiser 100/105 Series collection:\n`);
  matches.forEach(p => {
    console.log(`- ${p.original_title} (ID: ${p.id})`);
  });
}

find100SeriesProducts();
