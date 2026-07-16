module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Doit être en DERNIER — requis pour les micro-anims réactions (PopIcon)
    plugins: ["react-native-reanimated/plugin"],
  };
};
