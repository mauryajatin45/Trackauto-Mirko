const fs = require('fs');

function findUniversalProducts() {
  const data = JSON.parse(fs.readFileSync('full_catalog_backup.json', 'utf8'));
  
  const specificSeries = ['40 series', '45 series', '47 series', '60 series', '70 series', '73 series', '75 series', '76 series', '78 series', '79 series', '80 series', 'fj40', 'hzj', 'hdj', 'vdj'];
  const matches = [];

  for (const product of data) {
    const textToSearch = (product.original_title + ' ' + (product.original_descriptionHtml || '')).toLowerCase();
    
    const isSpecific = specificSeries.some(kw => textToSearch.includes(kw));
    if (!isSpecific) {
      matches.push(product);
    }
  }

  console.log(`\nFound ${matches.length} products that do not mention a specific Series (could be universal):\n`);
  matches.forEach(p => {
    console.log(`- ${p.original_title}`);
  });
}

findUniversalProducts();
