const fs = require('fs');

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

// Some items might mention a series but are actually universal, or vice-versa.
// For trackauto, usually if it has a specific series in the title, it's vehicle-specific.

const landCruiserProducts = [];
const otherProducts = [];

products.forEach(p => {
  const title = p.title.toLowerCase();
  const type = (p.productType || '').toLowerCase();
  const tags = p.tags.map(t => t.toLowerCase());

  let isLC = false;

  // Check title
  if (landCruiserKeywords.some(kw => title.includes(kw))) {
    isLC = true;
  }
  // Check tags
  else if (tags.some(tag => landCruiserKeywords.some(kw => tag.includes(kw)))) {
    isLC = true;
  }

  // Exemptions: if it's heavily universal like "Recovery Ring" or "12V", but happens to have a tag?
  // User said: "specifically designed for Toyota LandCruiser". 
  // Let's rely mainly on title containing the series/model.

  if (isLC) {
    landCruiserProducts.push(p);
  } else {
    otherProducts.push(p);
  }
});

console.log(`Total Products: ${products.length}`);
console.log(`Land Cruiser Products: ${landCruiserProducts.length}`);
console.log(`Other 4WD Products: ${otherProducts.length}`);

fs.writeFileSync('classification_report.json', JSON.stringify({
  landCruiser: landCruiserProducts.map(p => p.title),
  other: otherProducts.map(p => p.title)
}, null, 2));

console.log('Saved lists to classification_report.json');
