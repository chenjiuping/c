var gulp = require('gulp')
  , gutil = require('gulp-util')
  , del = require('del')
  , concat = require('gulp-concat')
  , rename = require('gulp-rename')
  , minifycss = require('gulp-minify-css')
  , minifyhtml = require('gulp-minify-html')
  , jshint = require('gulp-jshint')
  , jscs = require('gulp-jscs')
  , streamify = require('gulp-streamify')
  , uglify = require('gulp-uglify')
  , less = require('gulp-less')
  , jade = require('gulp-jade')
  , sourcemaps = require('gulp-sourcemaps')
  , connect = require('gulp-connect')
  , source = require('vinyl-source-stream')
  , browserify = require('browserify')
  , babelify = require('babelify')
  , errorify = require('errorify')
  , watchify = require('watchify')
  , gulpif = require('gulp-if')
  , vinylPaths = require('vinyl-paths')
  , open = require('gulp-open')
  , paths;

var watching = false;

paths = {
  less: 'src/less/*.less',
  libjs: [
    './bower_components/lodash/lodash.js',
    './bower_components/jquery/dist/jquery.js',
    './bower_components/pnotify/pnotify.core.js',
    './bower_components/pnotify/!(pnotify.core).js',

    './bower_components/angular/angular.js',
    './bower_components/angular-ui-router/release/angular-ui-router.js',
    './bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
    './bower_components/angular-local-storage/dist/angular-local-storage.js',
    './bower_components/angular-pnotify/src/angular-pnotify.js'
  ],
  libcss: [
    './bower_components/angular/angular-csp.css',
    './bower_components/pnotify/*.css'
  ],
  copycss: [
    './bower_components/bootstrap/dist/css/bootstrap.css',
    './bower_components/font-awesome/css/font-awesome.css'
  ],
  fonts: [
    './bower_components/font-awesome/fonts/*'
  ],
  jade: ['src/jade/**/*.jade'],
  js: ['src/js/**/*.js'],
  entry: './src/js/main.js',
  dist: './dist/'
};

gulp.task('clean', function () {
  return gulp.src(paths.dist)
    .pipe(vinylPaths(del))
    .on('error', gutil.log);
});

gulp.task('copyfonts', ['clean'], function () {
  return gulp.src(paths.fonts)
    .pipe(gulp.dest(paths.dist + '/fonts'))
    .on('error', gutil.log);
});

gulp.task('buildlibcss', ['clean'], function() {
  return gulp.src(paths.libcss)
    .pipe(concat('lib.css'))
    .pipe(gulpif(!watching, minifycss({
      keepSpecialComments: false,
      removeEmpty: true
    })))
    .pipe(gulp.dest(paths.dist + 'css'))
    .on('error', gutil.log);
});

gulp.task('copylibcss', ['clean'], function() {
  return gulp.src(paths.copycss)
    .pipe(gulpif(!watching, minifycss({
      keepSpecialComments: false,
      removeEmpty: true
    })))
    .pipe(gulp.dest(paths.dist + 'css'))
    .on('error', gutil.log);
});

gulp.task('copylibjs', ['clean'], function () {
  return gulp.src(paths.libjs)
    .pipe(gulpif(!watching, uglify({outSourceMaps: false})))
    .pipe(concat('lib.js'))
    .pipe(gulp.dest(paths.dist + 'js'))
    .on('error', gutil.log);
});

gulp.task('compilejs', ['jscs', 'jshint' ,'clean'], function () {
  var bundler = browserify({
    cache: {}, packageCache: {}, fullPaths: true,
    entries: [paths.entry],
    debug: watching
  })
    .transform(babelify);

  if(watching) {
    bundler.plugin(errorify);
  }

  var bundlee = function() {
    return bundler
      .bundle()
      .pipe(source('js/main.min.js'))
      .pipe(gulpif(!watching, streamify(uglify({outSourceMaps: false}))))
      .pipe(gulp.dest(paths.dist))
      .on('error', gutil.log);
  };

  if (watching) {
    bundler = watchify(bundler);
    bundler.on('update', bundlee);
  }

  return bundlee();
});

gulp.task('jshint', function() {
  return gulp.src(paths.js)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    .on('error', gutil.log);
});

gulp.task('jscs', function() {
  return gulp.src(paths.js)
    .pipe(jscs())
    .on('error', gutil.log);
});

gulp.task('compileless', ['clean'], function () {
  return gulp.src(paths.less)
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(concat('css/main.css'))
    .pipe(gulpif(!watching, minifycss({
      keepSpecialComments: false,
      removeEmpty: true
    })))
    .pipe(rename({suffix: '.min'}))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.dist))
    .on('error', gutil.log);
});

gulp.task('compilejade', ['clean'], function() {
  return gulp.src(paths.jade)
    .pipe(concat('index.html'))
    .pipe(jade({
      pretty: watching
    }))
    .pipe(gulpif(!watching, minifyhtml()))
    .pipe(gulp.dest(paths.dist))
    .on('error', gutil.log);
});

gulp.task('html', ['build'], function(){
  return gulp.src('dist/*.html')
    .pipe(connect.reload())
    .on('error', gutil.log);
});

gulp.task('connect', function () {
  connect.server({
    root: ['./dist'],
    port: 8000,
    livereload: true
  });
});

gulp.task('open', function() {
  gulp.src('./dist/index.html')
    .pipe(open('', {
      url: 'http://localhost:8000'
    }));
});

gulp.task('watch', function () {
  watching = true;
  return gulp.watch([paths.less, paths.jade, paths.js], ['html']);
});

gulp.task('default', ['build', 'connect', 'open', 'watch']);
gulp.task('build', ['clean', 'copylibjs', 'copylibcss', 'buildlibcss', 'compile']);
gulp.task('compile', ['copyfonts', 'compilejs', 'compileless', 'compilejade']);