#!/usr/bin/env node
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

const profiles = JSON.parse(fs.readFileSync('config/operating-profiles.json', 'utf8'));
const envExample = fs.readFileSync('.env.example', 'utf8');
const envFile = process.env.ENV_FILE || '.env';
const supportedOptionalCapabilities = new Set(['gitnexus', 'agent-lightning']);

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return { check: args.has('--check'), dryRun: args.has('--dry-run') };
}

function validateWizardInputs(values) {
  const errors = [];
  if (!profiles.profiles[values.KITCHEN_A2A_PROFILE]) errors.push('Unknown profile');
  try {
    const qdrantUrl = new URL(values.QDRANT_URL);
    if (!['http:', 'https:'].includes(qdrantUrl.protocol)) errors.push('QDRANT_URL must be an HTTP(S) URL');
  } catch {
    errors.push('QDRANT_URL must be an HTTP(S) URL');
  }
  if (!values.QDRANT_API_KEY || values.QDRANT_API_KEY.startsWith('your-')) errors.push('QDRANT_API_KEY is required');
  if (!values.NEO4J_PASSWORD || values.NEO4J_PASSWORD === 'change-me') errors.push('NEO4J_PASSWORD must be changed');
  if (!values.KITCHEN_OPERATOR_API_KEY || values.KITCHEN_OPERATOR_API_KEY === 'change-me') errors.push('KITCHEN_OPERATOR_API_KEY must be changed');
  const optionalCapabilities = String(values.KITCHEN_OPTIONAL_CAPABILITIES || '').split(',').map((item) => item.trim()).filter(Boolean);
  const unsupported = optionalCapabilities.filter((item) => !supportedOptionalCapabilities.has(item));
  if (unsupported.length) errors.push(`Unsupported optional capabilities: ${unsupported.join(', ')}`);
  return errors;
}

function applyEnvValues(text, values) {
  let next = text;
  for (const [key, value] of Object.entries(values)) {
    const escaped = String(value).replace(/[$`\\]/g, '\\$&');
    const pattern = new RegExp(`^#?\\s*${key}=.*$`, 'm');
    if (pattern.test(next)) next = next.replace(pattern, `${key}=${escaped}`);
    else next += `\n${key}=${escaped}`;
  }
  return next;
}

async function secretQuestion(prompt) {
  output.write(prompt);
  emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  if (input.setRawMode) input.setRawMode(true);
  input.resume();

  return new Promise((resolve, reject) => {
    let value = '';

    const cleanup = () => {
      input.off('keypress', onKeypress);
      if (input.setRawMode) input.setRawMode(Boolean(wasRaw));
      output.write('\n');
    };

    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('First-run wizard cancelled'));
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(value);
        return;
      }
      if (key.name === 'backspace' || key.name === 'delete') {
        value = value.slice(0, -1);
        return;
      }
      if (character && !key.ctrl && !key.meta) value += character;
    };

    input.on('keypress', onKeypress);
  });
}

async function promptForValues() {
  const rl = readline.createInterface({ input, output });
  try {
    const profile = await rl.question('Profile [local-dev/private-network/cloud-https/custom] (private-network): ');
    const qdrantUrl = await rl.question('Qdrant Cloud URL: ');
    const qdrantKey = await secretQuestion('Qdrant API key (input hidden): ');
    const neo4jPassword = await secretQuestion('Neo4j password (input hidden): ');
    const operatorKey = await secretQuestion('Kitchen operator API key (input hidden): ');
    const geminiKey = await secretQuestion('Gemini API key (optional, input hidden, press Enter to skip): ');
    const optionalCapabilities = await rl.question('Optional capabilities [gitnexus,agent-lightning] (blank to skip): ');
    const firstAgentId = await rl.question('First agent id to prepare (optional): ');
    return {
      KITCHEN_A2A_PROFILE: profile.trim() || 'private-network',
      QDRANT_URL: qdrantUrl.trim(),
      QDRANT_API_KEY: qdrantKey.trim(),
      NEO4J_PASSWORD: neo4jPassword.trim(),
      KITCHEN_OPERATOR_API_KEY: operatorKey.trim(),
      KITCHEN_OPTIONAL_CAPABILITIES: optionalCapabilities.trim(),
      GEMINI_API_KEY: geminiKey.trim() || 'your-gemini-key-here',
      FIRST_AGENT_ID: firstAgentId.trim(),
    };
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs();
  if (args.check) {
    const sample = {
      KITCHEN_A2A_PROFILE: 'private-network',
      QDRANT_URL: 'https://qdrant.example',
      QDRANT_API_KEY: 'dummy-key',
      NEO4J_PASSWORD: 'neo4j-secret',
      KITCHEN_OPERATOR_API_KEY: 'operator-secret',
      KITCHEN_OPTIONAL_CAPABILITIES: 'gitnexus,agent-lightning',
    };
    const errors = validateWizardInputs(sample);
    if (errors.length) throw new Error(errors.join('; '));
    console.log('First-run wizard validation passed');
    return;
  }

  if (!process.stdin.isTTY) {
    throw new Error('First-run wizard requires an interactive terminal. Use --check for CI validation.');
  }

  const values = await promptForValues();
  const errors = validateWizardInputs(values);
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join('\n'));
    process.exit(1);
  }

  const rendered = applyEnvValues(envExample, values);
  if (args.dryRun) {
    console.log(rendered);
    return;
  }
  if (fs.existsSync(envFile)) {
    fs.copyFileSync(envFile, `${envFile}.backup-${Date.now()}`);
  }
  fs.writeFileSync(envFile, rendered);
  console.log(`Wrote ${envFile}. Next: ./setup.sh`);
  if (values.FIRST_AGENT_ID) {
    console.log(`After Kitchen starts, register first agent '${values.FIRST_AGENT_ID}' from /agents or POST /api/agents/register.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
