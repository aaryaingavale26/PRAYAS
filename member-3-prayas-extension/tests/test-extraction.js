const fs = require('fs');

const html = fs.readFileSync('demo/job-application-demo.html', 'utf8');

// Match all interactive tags
const regex = /<(input|select|textarea|button)\b([^>]*)>/gi;
let match;
let count = 0;

console.log('=== TEST EXTRACTION ON DEMO HTML ===');
while ((match = regex.exec(html)) !== null) {
  count++;
  const tag = match[1].toLowerCase();
  const attrs = match[2];

  const idMatch = attrs.match(/id=["']([^"']+)["']/i);
  const nameMatch = attrs.match(/name=["']([^"']+)["']/i);
  const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
  const placeholderMatch = attrs.match(/placeholder=["']([^"']+)["']/i);
  const isRequired = /\brequired\b/i.test(attrs);

  const id = idMatch ? idMatch[1] : '';
  const name = nameMatch ? nameMatch[1] : '';
  const type = typeMatch ? typeMatch[1] : tag;
  const placeholder = placeholderMatch ? placeholderMatch[1] : '';

  console.log(
    `[${count}] ${tag.padEnd(8)} | type: ${type.padEnd(8)} | id: ${id.padEnd(20)} | name: ${name.padEnd(18)} | req: ${isRequired}`
  );
}

console.log(`Total elements extracted: ${count}`);
