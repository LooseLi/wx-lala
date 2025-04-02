const gulp = require('gulp');
const rename = require('gulp-rename');
const minimist = require('minimist');

// 解析命令行参数
const knownOptions = {
  string: 'file',
  default: { file: null }
};
const options = minimist(process.argv.slice(2), knownOptions);

// 选择一个预处理器（取消注释您想使用的）

// SCSS 配置
const sass = require('gulp-sass')(require('sass'));

// 编译所有SCSS文件
function compileSass() {
  return gulp
    .src(['**/*.scss', '!node_modules/**'])
    .pipe(sass().on('error', sass.logError))
    .pipe(rename({ extname: '.wxss' }))
    .pipe(gulp.dest(file => file.base));
}

// 编译指定的SCSS文件
function compileSingleSass() {
  if (!options.file) {
    console.error('请指定要编译的文件，例如：gulp sass-file --file=components/DateTimePicker/index.scss');
    return Promise.resolve();
  }
  
  console.log(`正在编译文件: ${options.file}`);
  return gulp
    .src(options.file)
    .pipe(sass().on('error', sass.logError))
    .pipe(rename({ extname: '.wxss' }))
    .pipe(gulp.dest(file => file.base))
    .on('end', () => console.log(`文件 ${options.file} 编译完成`));
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
exports['sass-file'] = compileSingleSass;
// exports.less = compileLess;
exports.watch = watch;
exports.default = watch;
