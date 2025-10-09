const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    entry: "./src/index.tsx",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      publicPath: "/static/",
      clean: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                "@babel/preset-react",
                "@babel/preset-typescript",
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
          ],
        },
        {
          test: /\.less$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            {
              loader: "less-loader",
              options: {
                lessOptions: {
                  modifyVars: {
                    "@primary-color": "#1890ff",
                    "@link-color": "#1890ff",
                    "@border-radius-base": "6px",
                  },
                  javascriptEnabled: true,
                },
              },
            },
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: "asset/resource",
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./public/index.html",
        title: "GraphXR Database Proxy",
        favicon: "./public/favicon.ico",
        templateParameters: {
          PUBLIC_URL: "",
        },
        inject: true,
        minify: isProduction
          ? {
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
            }
          : false,
      }),
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: "[name].[contenthash].css",
            }),
          ]
        : []),
    ],
    devServer: {
      devMiddleware: {
        writeToDisk: true, // Enable writing to disk
      },
      static: {
        directory: path.join(__dirname, "dist"),
        publicPath: "/",
        serveIndex: false,
        watch: true,
      },
      port: 3002,
      open: true,
      hot: true,
      historyApiFallback: {
        disableDotRule: true,
        htmlAcceptHeaders: ["text/html", "application/xhtml+xml"],
      },
      compress: true,
      allowedHosts: "all",
      proxy: {
        "/api": {
          target: "http://localhost:9080",
          changeOrigin: true,
        },
        "/google": {
          target: "http://localhost:9080",
          changeOrigin: true,
        },
        "/docs": {
          target: "http://localhost:9080",
          changeOrigin: true,
        },
        "/openapi.json": {
          target: "http://localhost:9080",
          changeOrigin: true,
        },
      },
    },
    optimization: {
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      },
    },
    devtool: isProduction ? "source-map" : "eval-cheap-module-source-map",
  };
};
