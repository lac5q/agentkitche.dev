import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const profilesPath = path.join(root, 'config', 'operating-profiles.json');
const envPath = path.join(root, '.env.example');
const composePath = path.join(root, 'docker-compose.yml');

const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
const envText = fs.readFileSync(envPath, 'utf8');
const composeText = fs.readFileSync(composePath, 'utf8');

const requiredProfiles = ['local-dev', 'single-host', 'private-network', 'cloud-https', 'custom'];
for (const profile of requiredProfiles) {
  if (!profiles.profiles?.[profile]) {
    throw new Error(`Missing operating profile: ${profile}`);
  }
}

for (const key of profiles.requiredConfigKeys) {
  if (!envText.includes(`${key}=`) && !envText.includes(`# ${key}=`)) {
    throw new Error(`.env.example missing required key: ${key}`);
  }
}

const forbiddenComposeSnippets = ['qdrant:', 'image: qdrant/'];
for (const snippet of forbiddenComposeSnippets) {
  if (composeText.includes(snippet)) {
    throw new Error(`docker-compose.yml must not include local Qdrant service: ${snippet}`);
  }
}

const requiredServices = ['kitchen:', 'mem0:', 'neo4j:', 'orchestration:', 'voice:', 'knowledge-mcp:'];
for (const service of requiredServices) {
  if (!composeText.includes(`  ${service}`)) {
    throw new Error(`docker-compose.yml missing service: ${service}`);
  }
}

console.log('Operating profile validation passed');
