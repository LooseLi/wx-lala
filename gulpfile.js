const gulp = require('gulp');
const rename = require('gulp-rename');

// 选择一个预处理器（取消注释您想使用的）

// SCSS 配置
const sass = require('gulp-sass')(require('sass'));
function compileSass() {
  return gulp
    .src(['**/*.scss', '!node_modules/**'])
    .pipe(sass().on('error', sass.logError))
    .pipe(rename({ extname: '.wxss' }))
    .pipe(gulp.dest(file => file.base));
}

// LESS 配置
// const less = require('gulp-less');
// function compileLess() {
//   return gulp
//     .src(['**/*.less', '!node_modules/**'])
//     .pipe(less())
//     .pipe(rename({ extname: '.wxss' }))
//     .pipe(gulp.dest(file => file.base));
// }

// 监听文件变化
function watch() {
  // 取消注释您想使用的预处理器
  gulp.watch(['**/*.scss', '!node_modules/**'], compileSass);
  // gulp.watch(['**/*.less', '!node_modules/**'], compileLess);
}

// 导出任务
exports.sass = compileSass;
// exports.less = compileLess;
exports.watch = watch;
exports.default = watch;
