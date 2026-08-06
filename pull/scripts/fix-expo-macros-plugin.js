#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const deviceActivityRoot = path.join(
  projectRoot,
  'node_modules',
  'react-native-device-activity',
);
const appleTargetsTargetJs = path.join(
  projectRoot,
  'node_modules',
  '@kingstinct',
  'expo-apple-targets',
  'build',
  'target.js',
);
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

function filesIn(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(filePath) : [filePath];
  });
}

function sanitizeSwift(source) {
  return source
    .split('\n')
    .map((line) => {
      if (/^\s*print\(/.test(line)) return '';
      let inString = false;
      let escaped = false;
      for (let index = 0; index < line.length - 1; index += 1) {
        const character = line[index];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (character === '\\') {
            escaped = true;
          } else if (character === '"') {
            inString = false;
          }
          continue;
        }
        if (character === '"') {
          inString = true;
          continue;
        }
        if (character === '/' && line[index + 1] === '/') {
          return line.slice(0, index).replace(/[ \t]+$/g, '');
        }
      }
      return line.replace(/[ \t]+$/g, '');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * expo-apple-targets only knows a fixed set of Apple extension points, and the
 * Device Activity *report* extension is not one of them — so `targets/screen-time-report`
 * would never become an Xcode target. Teach it the type here.
 *
 * The report extension is an ExtensionKit extension (it conforms to AppExtension),
 * so it uses EXAppExtensionAttributes and the extensionkit-extension product type —
 * the same shape as app-intent, not the NSExtension shape the monitor extension uses.
 * Both values are taken from Xcode's own "Device Activity Report Extension" template.
 */
function registerDeviceActivityReportTarget() {
  if (!fs.existsSync(appleTargetsTargetJs)) return;

  const original = fs.readFileSync(appleTargetsTargetJs, 'utf8');

  const edits = [
    // 1. Make the extension point resolvable by type name.
    {
      find: '    "com.apple.deviceactivity.monitor-extension": "device-activity-monitor",\n',
      replace:
        '    "com.apple.deviceactivity.monitor-extension": "device-activity-monitor",\n' +
        '    "com.apple.deviceactivityui.report-extension": "device-activity-report",\n',
    },
    // 2. Entitlements are set explicitly by our expo-target.config.js, as with the monitor.
    {
      find: '    "device-activity-monitor": false,\n',
      replace:
        '    "device-activity-monitor": false,\n    "device-activity-report": false,\n',
    },
    // 3. ExtensionKit Info.plist shape.
    {
      find: '    const NSExtensionPointIdentifier = Object.keys(exports.KNOWN_EXTENSION_POINT_IDENTIFIERS)',
      replace:
        '    else if (type === "device-activity-report") {\n' +
        '        return plist_1.default.build({\n' +
        '            EXAppExtensionAttributes: {\n' +
        '                EXExtensionPointIdentifier: "com.apple.deviceactivityui.report-extension",\n' +
        '            },\n' +
        '        });\n' +
        '    }\n' +
        '    const NSExtensionPointIdentifier = Object.keys(exports.KNOWN_EXTENSION_POINT_IDENTIFIERS)',
    },
    // 4. ExtensionKit product type, not the default app-extension.
    {
      find: '        case "app-intent":\n            return "com.apple.product-type.extensionkit-extension";\n',
      replace:
        '        case "app-intent":\n        case "device-activity-report":\n            return "com.apple.product-type.extensionkit-extension";\n',
    },
    // 5. Frameworks the report scene links against.
    {
      find: 'function getFrameworksForType(type) {\n',
      replace:
        'function getFrameworksForType(type) {\n' +
        '    if (type === "device-activity-report") {\n' +
        '        return ["DeviceActivity", "FamilyControls", "ManagedSettings", "SwiftUI"];\n' +
        '    }\n',
    },
    // 6. Detect the ExtensionKit target on subsequent Prebuild runs. Without
    // this branch, the package only recognizes classic app-extension targets
    // and creates a second ScreenTimeReport target every time.
    {
      find:
        '    if (target.props.productType !== "com.apple.product-type.app-extension") {\n' +
        '        return false;\n' +
        '    }\n',
      replace:
        '    if (type === "device-activity-report" &&\n' +
        '        target.props.productType === "com.apple.product-type.extensionkit-extension") {\n' +
        '        const infoPlist = target.getDefaultConfiguration().getInfoPlist();\n' +
        '        return Boolean(infoPlist.EXAppExtensionAttributes &&\n' +
        '            infoPlist.EXAppExtensionAttributes.EXExtensionPointIdentifier ===\n' +
        '                "com.apple.deviceactivityui.report-extension");\n' +
        '    }\n' +
        '    if (target.props.productType !== "com.apple.product-type.app-extension") {\n' +
        '        return false;\n' +
        '    }\n',
    },
  ];

  let patched = original;
  for (const { find, replace } of edits) {
    if (patched.includes(replace)) continue;
    if (!patched.includes(find)) {
      throw new Error(
        `Could not patch @kingstinct/expo-apple-targets for the Device Activity report ` +
          `target: anchor not found. The package layout changed — update ` +
          `scripts/fix-expo-macros-plugin.js before building.\nAnchor: ${find.trim()}`,
      );
    }
    patched = patched.replace(find, replace);
  }

  fs.writeFileSync(appleTargetsTargetJs, patched);
}

registerDeviceActivityReportTarget();

for (const filePath of filesIn(deviceActivityRoot).filter(
  (candidate) => path.extname(candidate) === '.swift',
)) {
  const source = fs.readFileSync(filePath, 'utf8');
  const output = sanitizeSwift(source);
  if (source !== output) fs.writeFileSync(filePath, output);
}

if (!fs.existsSync(hoistedPluginPath)) {
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
