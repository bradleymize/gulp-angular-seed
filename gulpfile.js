var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var runSequence = require('run-sequence');
var merge = require('merge-stream');
var del = require('del');

//========CONFIG===========
var config = {
  vendorCssTag: "<!-- inject:vendor:css -->",
  vendorJsTag: "<!-- inject:vendor:js -->",
  appCssTag: "<!-- inject:app:css -->",
  appJsTag: "<!-- inject:app:js -->",
  outputDir: "dist",
  appJsRoot: "web-app/js",
  nodeFolder: "node_modules",
  iifeLocation: "iife.txt",
  globs: {
    css: [],
    vendorJs: [],
    appJs: ["web-app/js/**/*.js"],
    fonts: [],
    templates: []
  }
}

//========ENVIRONMENTAL VARIABLES===========
var isDist = plugins.util.env.type === 'dist';
var doBeautify = plugins.util.env.beautify === 'true';

//========TASKS===========
gulp.task('copy-fonts', function() {
  return gulp.src(config.globs.fonts, {base: config.nodeFolder})
             .pipe(isDist ? plugins.rename({dirname: ""}) : plugins.util.noop())
             .pipe(gulp.dest(config.outputDir + (isDist ? '/fonts' : '/css')));
});

gulp.task('clean', function() {
  return del(config.outputDir+'/**/*');
//  return del('web-app/build/**/*');
});

//gulp.task('copy-dist-images', function(){
//  return gulp.src('dist/img/*')
//             .pipe(gulp.dest(config.outputDir + '/dist/img'));
//});

gulp.task('jscs', function() {
  return gulp.src(config.globs.appJs)
             .pipe(plugins.jscs({fix: true}))
             .pipe(gulp.dest(config.appJsRoot));
});

gulp.task('lint', function() {
  return gulp.src(config.globs.appJs)
             .pipe(plugins.jshint())
             .pipe(plugins.jshint.reporter('jshint-stylish'))
             .pipe(isDist ? plugins.jshint.reporter('fail') : plugins.util.noop());
});

gulp.task('js-compile', function() {
  var vendorJsStream = gulp.src(config.globs.vendorJs, {base: config.nodeFolder});

  var appJsStream = gulp.src(config.globs.appJs)
                .pipe(plugins.angularFilesort())
                .pipe(plugins.wrap({src: config.iifeLocation}))
                .pipe(plugins.ngAnnotate());

  return merge(vendorJsStream, appJsStream)
            .pipe(isDist ? plugins.concat('admin-lte-angular.js') : plugins.util.noop())
            .pipe(isDist ? plugins.uglify() : plugins.util.noop())
            .pipe(doBeautify ? plugins.beautify() : plugins.util.noop())
            .pipe(isDist ? plugins.rename({suffix: ".min"}) : plugins.util.noop())
            .pipe(gulp.dest(config.outputDir + '/js'));
});

gulp.task('html2js-templates', function() {
  return gulp.src(config.globs.templates)
            .pipe(plugins.ngHtml2js({
              moduleName: "adminlte-angular",
              prefix: "admin-lte/templates/"
            }))
            .pipe(isDist ? plugins.concat('admin-lte-angular.tpls.js') : plugins.util.noop())
            .pipe(isDist ? plugins.uglify() : plugins.util.noop())
            .pipe(doBeautify ? plugins.beautify() : plugins.util.noop())
            .pipe(isDist ? plugins.rename({suffix: ".min"}) : plugins.util.noop())
            .pipe(gulp.dest(config.outputDir + '/js'));
});

gulp.task('css-compile', function() {
  return gulp.src(config.globs.css, {base: '.'})
               .pipe(isDist ? plugins.concat('admin-lte-angular.css') : plugins.util.noop())
               .pipe(isDist ? plugins.minifyCss() : plugins.util.noop())
               .pipe(doBeautify ? plugins.cssbeautify() : plugins.util.noop())
               .pipe(isDist ? plugins.rename({suffix: ".min"}) : plugins.util.noop())
               .pipe(plugins.rename(function(path) {
                 path.dirname = path.dirname //since multiple base dirs, can't specify in base above
                                    .replace('dist\\css\\skins','skins') //remove skins folder prefixes
                                    .replace('node_modules','') //remove node_modules folder prefix
                                    .replace(/^dist\\css/,''); //remove AdminLTE.css folder prefix
               }))
               .pipe(gulp.dest(config.outputDir + '/css'));
});

gulp.task('index-template', function() {
  var target = gulp.src('index.tpl.html');
  var sourcesCss = gulp.src(config.outputDir + '/css/admin-lte-angular.min.css', {read:false});
  var sourcesJs = gulp.src(config.outputDir + '/js/admin-lte-angular*.min.js', {read:false});

  return target.on('readable', function(){plugins.util.log(plugins.util.colors.green("Injecting vendor css..."))})
            .pipe(plugins.inject(sourcesCss, {ignorePath: config.outputDir, addRootSlash: false, starttag: config.vendorCssTag}))
            .on('end', function(){plugins.util.log(plugins.util.colors.green("Injecting app css..."))})
            .pipe(plugins.inject(sourcesCss, {ignorePath: config.outputDir, addRootSlash: false, starttag: config.appCssTag}))
            .on('end', function(){plugins.util.log(plugins.util.colors.green("Injecting vendor js..."))})
            .pipe(plugins.inject(sourcesJs, {ignorePath: config.outputDir, addRootSlash: false, starttag: config.vendorJsTag}))
            .on('end', function(){plugins.util.log(plugins.util.colors.green("Injecting app js..."))})
            .pipe(plugins.inject(sourcesJs, {ignorePath: config.outputDir, addRootSlash: false, starttag: config.appJsTag}))
            .pipe(plugins.rename('index.html'))
            .pipe(gulp.dest(config.outputDir));
});

gulp.task('build-release', function(callback) {
  runSequence(
    'clean',
    'jscs',
    'lint',
    ['css-compile', 'js-compile', 'html2js-templates', 'copy-fonts', 'copy-dist-images'],
    'index-template',
    callback
  )
});