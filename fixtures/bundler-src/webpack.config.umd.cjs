module.exports = {
  mode: 'development',
  entry: './entry.js',
  target: 'node',
  devtool: "source-map", // to stop using eval
  output: {
    filename: '../../bundler-out/webpack.umd.js',
    libraryTarget: 'umd',
  }
};
