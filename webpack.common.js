const ExtractTextPlugin = require('extract-text-webpack-plugin');
const extractSass = new ExtractTextPlugin({ filename: 'app.css' });
// const webpack = require('webpack');

module.exports = {
    entry: [__dirname + '/src/index.js', __dirname + '/src/styles/app.scss', /*'webpack-hot-middleware/client'*/],
    output: {
        path: __dirname + '/build',
        filename: 'index_bundle.js',
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            },
            {
                test: /.scss$/,
                use: extractSass.extract({
                    use: [{loader: 'css-loader'}, {loader: 'sass-loader'}],
                    fallback: 'style-loader'
                })
            }
        ]
    },
    plugins: [
        extractSass,
        // new webpack.HotModuleReplacementPlugin(),
        // new webpack.NoEmitOnErrorsPlugin()
    ]
};
