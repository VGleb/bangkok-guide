import { readFile } from 'node:fs/promises';

const [file = '../private-feedback.json'] = process.argv.slice(2);
const api = process.env.FEEDBACK_API_URL;
const token = process.env.FEEDBACK_API_TOKEN;

if (!api || !token) {
  console.error('Set FEEDBACK_API_URL and FEEDBACK_API_TOKEN.');
  process.exit(1);
}

const feedback = JSON.parse(await readFile(file, 'utf8'));
const response = await fetch(new URL('/api/feedback', api), {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(feedback)
});

if (!response.ok) {
  console.error(`Import failed: HTTP ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const result = await response.json();
console.log(`Imported ${Object.keys(result.records || {}).length} records.`);
