const port = 3001; // 端口号
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const Bundler = require('parcel-bundler');
const entryFiles = path.join(__dirname, 'src/pages/*.html');
console.log(entryFiles);
const options = {
  outDir: './public/dev',
  publicUrl: '/dev/',
  cached: false,
  hmr: false,
  sourceMap: false
};

(async function () {
  // 使用提供的入口文件路径和选项初始化 bundler
  const bundler = new Bundler(entryFiles, options);

  // 运行 bundler，这将返回主 bundle
  // 如果你正在使用监听模式，请使用下面这些事件，这是因为该 promise 只会触发一次，而不是每次重新构建时都触发
  await bundler.bundle();

  const STATIC_FOLDER = 'public'; // 默认读取public文件夹下的文件

  const server = http.createServer((req, res) => {
    let reqUrl = decodeURIComponent(req.url); // 中文解码
    const obj = url.parse(reqUrl); // 解析请求的url
    let pathname = obj.pathname; // 请求的路径
    const realPath = path.join(__dirname, STATIC_FOLDER, pathname); // 获取物理路径

    // 获取文件基本信息，包括大小，创建时间修改时间等信息
    fs.stat(realPath, (err, stats) => {
      let endFilePath = '', contentType = '';;
      if (err) {
        // 报错了或者请求的路径是文件夹，则返回404
        res.writeHead(404, 'not found', {
          'Content-Type': 'text/plain'
        });
        res.write(`the request ${pathname} is not found`);
        res.end();
      } else if (stats.isDirectory()) {
        fs.readdir(realPath, {
          encoding: 'utf8'
        }, (err, files) => {
          res.statusCode = 200;
          res.setHeader('content-type', 'text/html');
          let result = '';
          for (let i = 0; i < files.length; i++) {
            if (pathname === '/') {
              pathname = '';
            }
            result += `<a href="${pathname}/${files[i]}">${files[i]}</a><br/>`;
          }
          let html = `
          <!doctype html>
          <html>
            <head>
              <meta charset='utf-8'/>
            </head>
            <body>
              ${result}
            </body>
          </html>`;
          res.end(html);
        });
      } else {
        let ext = path.extname(realPath).slice(1); // 获取文件拓展名
        contentType = mime.getType(ext) || 'text/plain';
        // if (contentType === 'model/vnd.usdz+zip') {
        //   contentType = 'model/usd';
        // }
        res.setHeader('content-type', contentType);
        // console.log(`ext: ${ext}, content-type: ${contentType}`);
        endFilePath = realPath;
        let raw = fs.createReadStream(endFilePath);
        res.writeHead(200, 'ok');
        raw.pipe(res);
      }
    });
  });

  server.listen(port);
  console.log(`server is running at http://localhost:${port}`);

})();
