// inline every <script src> from index.html into one standalone dist/haunting.html
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const out = html.replace(/<script src="([^"]+)"><\/script>/g, function (tag, src) {
  const code = fs.readFileSync(path.join(__dirname, src), 'utf8');
  return '<script>\n' + code.split('</scr' + 'ipt>').join('<\/script>') + '\n</script>';
});
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'haunting.html'), out);
console.log('wrote dist/haunting.html (' + out.length + ' bytes)');
