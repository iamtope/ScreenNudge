#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const nestedScopeDir = path.join(
  projectRoot,
  'node_modules',
  'expo-modules-core',
  'node_modules',
  '@expo',
);
const nestedPluginPath = path.join(nestedScopeDir, 'expo-modules-macros-plugin');
const hoistedPluginPath = path.join(
  projectRoot,
  'node_modules',
  '@expo',
  'expo-modules-macros-plugin',
);

if (!fs.existsSync(hoistedPluginPath)) {
  console.warn('[pull] Skipping Expo macros plugin link: package not installed.');
  process.exit(0);
}

fs.mkdirSync(nestedScopeDir, { recursive: true });

if (fs.existsSync(nestedPluginPath)) {
  const stat = fs.lstatSync(nestedPluginPath);
  if (stat.isSymbolicLink()) {
    process.exit(0);
  }
}

const relativeTarget = path.relative(nestedScopeDir, hoistedPluginPath);
fs.symlinkSync(relativeTarget, nestedPluginPath, 'dir');
console.log('[pull] Linked Expo macros plugin for iOS builds.');
