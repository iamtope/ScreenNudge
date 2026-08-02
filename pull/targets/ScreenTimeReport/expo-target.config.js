const getAppGroupFromExpoConfig = require("react-native-device-activity/config-plugin/getAppGroupFromExpoConfig");

// react-native-device-activity's createConfig() only knows its own three target
// types, so this one is spelled out. The "device-activity-report" type is taught to
// expo-apple-targets by scripts/fix-expo-macros-plugin.js.
/** @type {import('@kingstinct/expo-apple-targets/build/config-plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "device-activity-report",
  entitlements: {
    "com.apple.developer.family-controls": true,
    "com.apple.security.application-groups": [getAppGroupFromExpoConfig(config)],
  },
});
