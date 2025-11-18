module.exports = {
  // Keep this list narrowly scoped to your app source files to avoid
  // accidentally scanning `node_modules` or other large folders.
  content: [
    './index.html',
    './App.{js,ts,jsx,tsx}',
    './index.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
