export const buildConfig = {
  input: {
    root: './www',
    assets: './www/assets',
    scripts: './www/scripts',
    styles: './www/styles'
  },
  output: {
    root: './dist',
    assets: './dist/assets'
  },
  optimization: {
    imageCompression: true,
    cssMinification: true,
    jsMinification: true,
    cacheVersioning: true
  },
  paths: {
    components: '/components',
    scripts: '/scripts',
    styles: '/styles',
    images: '/images'
  }
};
