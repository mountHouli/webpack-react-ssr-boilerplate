const { NODE_ENV } = process.env

if (NODE_ENV !== 'development' && NODE_ENV !== 'production') {
  throw new Error('config.js You must specify webpack mode of either "production" or "development", but it\'s not.  Script exiting...')
}

// !! Do external assets in a webpacky way.
const envSpecific = {
  production: {
    cssBundleMarkup: '<link href="/clientIndex.bundle.css" rel="stylesheet"/>',
    fontAwesomeUrl: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
    basscssUrl: 'https://unpkg.com/basscss@8.0.2/css/basscss.min.css'
  },
  development: {
    cssBundleMarkup: '', // In development, to make HMR work, extract-text-webpack-plugin is not used; therefore, there is no CSS bundle.  Use an empty string here rather than null or undefined so as to not break HTML template.
    fontAwesomeUrl: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.css',
    basscssUrl: 'https://unpkg.com/basscss@8.0.2/css/basscss.css'
  }
}

module.exports = envSpecific[NODE_ENV]
