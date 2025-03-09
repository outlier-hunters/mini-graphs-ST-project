const gulp = require('gulp');
const connect = require('gulp-connect');

gulp.task('connect', function() {
  connect.server({
    root: 'public',
    port: 8000,
    livereload: true,
    middleware: function() {
      return [
        function(req, res, next) {
          // Redirige las rutas a los archivos HTML correspondientes
          if (req.url === '/grafica1') {
            req.url = '/grafica1.html';
          } else if (req.url === '/grafica2') {
            req.url = '/grafica2.html';
          }
          next();
        }
      ];
    }
  });
});

gulp.task('html', function () {
  return gulp.src('./public/*.html')
    .pipe(connect.reload());
});

gulp.task('watch', function () {
  gulp.watch(['./public/*.html'], gulp.series('html'));
});

gulp.task('default', gulp.parallel('connect', 'watch'));
