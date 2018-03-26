const path = require('path')

const webpack = require('webpack')
const webpackNodeExternals = require('webpack-node-externals')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const { removeEmpty } = require('webpack-config-utils')

const { NODE_ENV } = process.env

const deploymentLevelSpecificConfigs = {
  client: {
    entry: {
      prod: {
        clientIndex: path.join(__dirname, 'src', 'clientIndex.js')
      },
      dev: {
        clientIndex: [
          // We only want to use this for the client bundle, because HMR for the server bundle
          // is handled not by webpack-hot-middleware but by webpack-hot-server-middleware
          'webpack-hot-middleware/client',
          path.join(__dirname, 'src', 'clientIndex.js')
        ]
      }
    },
    devtool: {
      prod: undefined,
      // 'cheap-module-eval-source-map' is the fastest type of source map that still
      // almost perfectly preserves the original source files and line numbers.
      dev: 'cheap-module-eval-source-map'
    },
    module: {
      rules: {
        prod: [
          // See README.md for explanation of prod and dev, client and ssr/server style/css -related config.
          {
            test: /\.css$/,
            use: ExtractTextPlugin.extract({
              fallback: 'style-loader',
              use: [{
                loader: 'css-loader',
                options: {
                  modules: true,
                  localIdentName: '[path][name]__[local]--[hash:base64:5]'
                }
              }]
            })
          }
        ],
        dev: [
          // See README.md for explanation of prod and dev, client and ssr/server style/css -related config.
          {
            test: /\.css$/,
            use: [
              {
                loader: 'style-loader',
              },
              {
                loader: 'css-loader',
                options: {
                  modules: true,
                  localIdentName: '[path][name]__[local]--[hash:base64:5]'
                }
              }
            ]
          }
        ]
      }
    },
    plugins: {
      prod: [
        // See README.md for explanation of prod and dev, client and ssr/server style/css -related config.
        new ExtractTextPlugin({
          filename: '[name].bundle.css',
          allChunks: true
        })
      ],
      dev: [
        // We only want to use this for the client bundle, because HMR for the server bundle
        // is handled not by webpack-hot-middleware but by webpack-hot-server-middleware
        new webpack.HotModuleReplacementPlugin()
      ]
    }
  },
  ssr: {
    devtool: {
      prod: undefined,
      // 'cheap-module-eval-source-map' is the fastest type of source map that still
      // almost perfectly preserves the original source files and line numbers.
      dev: 'cheap-module-eval-source-map'
    }
  }
}

const { client, ssr } = deploymentLevelSpecificConfigs

// In order to work with webpack-hot-server-middleware, module.exports must =
// array with two members
//  - one with name: 'client' for the bundle that gets sent to the browser
//  - one with name: 'server' for webpack-hot-server-middleware to use for SSR
const clientConfig = removeEmpty({
  name: 'client',
  target: 'web',
  entry: client.entry[NODE_ENV],
  output: {
    filename: '[name].bundle.js',
    path: path.join(__dirname, 'dist', 'public'),
    publicPath: '/'
  },
  devtool: client.devtool[NODE_ENV],
  module: {
    rules: [
      {
        test: /\.js(?:x?)$/, // match .js files and .jsx files
        include: [/src/], // !! verify this works like I think it does !! ¿¿ Why is it a regex ??
        loader: 'babel-loader'
      }
    ].concat(client.module.rules[NODE_ENV])
  },
  resolve: {
    // Make the webpack resolver look for .jsx files (in addition to defaults),
    // so you can import a .jsx file without specifying the extension
    extensions: ['.js', '.json', '.jsx']
  },
  plugins: removeEmpty([
    new CleanWebpackPlugin(
      [
        'dist/*.*',
        'dist/public/*.*',
        // This doesn't get cleaned because CleanWebpackPlugin has a bug.
        // However, the file does get updated with the latest content.
        // Leave this here just to note what I want to do and make it work if the bug gets fixed.
        'junk/index.html'
      ],
      {
        root: __dirname,
        exclude: '.gitkeep',
        verbose: true
        // set watch: true ??
      }
    ),
    new CopyWebpackPlugin([
      // The 'to:' paths are relative to the 'output.path:' directory
      {from: 'src/server.js', to: '../server.js'},
      {from: 'src/config.js', to: '../config.js'}
    ]),
    // THIS IS NOT USED BY THE APP WHATSOEVER.  I am only using it to generate index.html
    // to see what webpack is automatically doing, so that I can manually replicate
    // it in my <HTML/> react component (I have to do this for SSR).
    new HtmlWebpackPlugin({
      template: 'src/index.html.template',
      // The 'filename' path is relative to 'output.path'
      filename: '../../junk/index.html'
    })
  ].concat(client.plugins[NODE_ENV]))
})

const ssrConfig = removeEmpty({
  name: 'server',
  // Causes webpack to use normal 'require()' rather than the webpack require.
  // We want this because this file is for code that will always run on the server.
  target: 'node',
  // Causes webpack to not add to the bundle any packages in node_modules such as express.
  // We want this because this file is for server side code, so we don't need to bundle these things.
  externals: [webpackNodeExternals()],
  entry: {
    ssrIndex: path.join(__dirname, 'src', 'ssrIndex.js')
  },
  output: {
    filename: '[name].bundle.js',
    path: path.join(__dirname, 'dist'),
    // This makes it so ssrIndex.js's default export, which is a function, can be required and used.
    // Note:  When using the 'commonjs2' option, the webpack 'output.library:' member is irrelevant.
    libraryTarget: 'commonjs2'
  },
  devtool: ssr.devtool[NODE_ENV],
  module: {
    rules: [
      {
        test: /\.js(?:x?)$/, // match .js files and .jsx files
        include: [/src/], // !! verify this works like I think it does !! ¿¿ Why was it originally the regex [/src/] ??
        exclude: ['src/server.js', 'src/ssrIndex.js'], // !! fix this
        loader: 'babel-loader'
      },
      {
        // See README.md for explanation of prod and dev, client and ssr/server style/css -related config.
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [{
            loader: 'css-loader',
            options: {
              modules: true,
              localIdentName: '[path][name]__[local]--[hash:base64:5]'
            }
          }]
        })
      }
    ]
  },
  resolve: {
    // Make the webpack resolver look for .jsx files (in addition to defaults),
    // so you can import a .jsx file without specifying the extension
    extensions: ['.js', '.json', '.jsx']
  },
  plugins: [
    // See README.md for explanation of prod and dev, client and ssr/server style/css -related config.
    new ExtractTextPlugin({
      filename: '[name].bundle.css',
      allChunks: true
    })
  ]
})

module.exports = [ clientConfig, ssrConfig ]
