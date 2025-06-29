const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.js',
    output: {
      filename: isProduction ? 'main.[contenthash].js' : 'main.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
      assetModuleFilename: 'assets/[name].[hash][ext]',
    },
    devServer: {
      static: [
        { directory: path.join(__dirname, 'public') },
        { directory: path.join(__dirname, 'assets') },
      ],
      port: 8080,
      open: true,
      hot: true,
      compress: true,
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
            },
            mangle: isProduction,
          },
        }),
        new CssMinimizerPlugin(),
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        filename: 'index.html',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true,
        } : false,
      }),
      new CopyWebpackPlugin({
        patterns: [
          { 
            from: 'assets', 
            to: 'assets',
            info: { minimized: true },
          },
        ],
      }),
      ...(isProduction ? [
        new CompressionPlugin({
          test: /\.(js|css|html|svg|wav|mp3|ogg)$/,
          algorithm: 'gzip',
          threshold: 10240,
          minRatio: 0.8,
          filename: '[path][base].gz',
        }),
        new CompressionPlugin({
          test: /\.(wav|mp3|ogg)$/,
          algorithm: 'brotliCompress',
          threshold: 10240,
          minRatio: 0.8,
          filename: '[path][base].br',
        }),
      ] : []),
    ],
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: '> 0.25%, not dead',
                  useBuiltIns: 'usage',
                  corejs: 3,
                }],
              ],
            },
          },
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name].[hash][ext]',
          },
        },
        {
          test: /\.(wav|mp3|ogg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/audio/[name].[hash][ext]',
          },
          ...(isProduction && {
            use: [
              {
                loader: 'file-loader',
                options: {
                  name: 'assets/audio/[name].[hash].[ext]',
                  quality: 85,
                },
              },
            ],
          }),
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@assets': path.resolve(__dirname, 'assets'),
        '@public': path.resolve(__dirname, 'public'),
      },
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
      assetFilter: (assetFilename) => {
        if (assetFilename.endsWith('.wav') || assetFilename.endsWith('.mp3') || assetFilename.endsWith('.ogg')) {
          return false;
        }
        return true;
      },
    },
  };
};