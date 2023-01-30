const webpack = require("webpack"); // eslint-disable-line no-unused-vars
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const Dotenv = require("dotenv-webpack");

module.exports = {
    context: __dirname,
    entry: {
        main: "./src/js/index.js",
        admin: "./src/js/admin.js",
        login: "./src/js/login.js",
        "pdf.worker": "pdfjs-dist/build/pdf.worker.entry",
    },
    devtool: "source-map",
    devServer: {
        static: "./dist",
        port: 3000,
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: "index.html",
            template: "src/index.html",
            chunks: ["main"],
        }),
        new HtmlWebpackPlugin({
            filename: "admin.html",
            template: "src/admin.html",
            chunks: ["admin"],
        }),
        new HtmlWebpackPlugin({
            filename: "login.html",
            template: "src/login.html",
            chunks: ["login"],
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'cmaps'),
                    to: 'cmaps',
                }
            ]
        }),
        new Dotenv({
            path: "./.env",
            safe: true,
        }),
    ],
    mode: "none",
    output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].bundle.js",
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.(css)$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(scss)$/i,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader'
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: () => [
                                    require('autoprefixer')
                                ]
                            }
                        }
                    },
                    {
                        loader: 'sass-loader'
                    }
                ],
            },
            {
                test: /\.woff(2)?(\?)?(\w)?$/,
                include: path.resolve(__dirname, './node_modules/bootstrap-icons/font/fonts'),
                type: 'asset/resource',
            }
        ]
    },
    optimization: {
        runtimeChunk: "single",
    },
};