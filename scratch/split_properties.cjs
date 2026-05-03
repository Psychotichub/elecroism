const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/Panels/PropertyPanel.tsx');
let content = fs.readFileSync(file, 'utf8');

// Find all render*Props definitions
const regex = /const (render\w+Props) = (\([^)]*\))?\s*=>\s*(\(|{)/g;
let match;
const functions = [];

while ((match = regex.exec(content)) !== null) {
  const name = match[1];
  const startIndex = match.index;
  const bodyStartIdx = match.index + match[0].length - 1;
  const startChar = match[3];

  let openCount = 1;
  let i = bodyStartIdx + 1;
  const closeChar = startChar === '{' ? '}' : ')';
  const matchChar = startChar;

  while (openCount > 0 && i < content.length) {
    if (content[i] === matchChar) {
      openCount++;
    } else if (content[i] === closeChar) {
      openCount--;
    }
    i++;
  }

  // Also include any trailing semicolon
  if (content[i] === ';') {
    i++;
  }

  functions.push({
    name,
    start: startIndex,
    end: i,
    code: content.substring(startIndex, i)
  });
}

console.log(`Found ${functions.length} render props functions`);
functions.forEach(f => console.log(f.name));

// We could write them out here
