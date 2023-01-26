const webpack = require("webpack"); // eslint-disable-line no-unused-vars
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: "development",
    context: __dirname,
    entry: {
        main: "./src/index.js",
        "pdf.worker": "pdfjs-dist/build/pdf.worker.entry",
    },
    devtool: "source-map",
    devServer: {
        static: "./dist",
        port: 3000,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "src/index.html",
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'cmaps'),
                    to: 'cmaps',
                }
            ]
        }),
    ],
    mode: "none",
    output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].bundle.js",
        // clean: true,
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
        ]
    },
    optimization: {
        runtimeChunk: "single",
    },
};