const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /node_modules\/\.pnpm\/qrcode@.*\/node_modules\/qrcode_tmp.*/,
];

module.exports = config;
