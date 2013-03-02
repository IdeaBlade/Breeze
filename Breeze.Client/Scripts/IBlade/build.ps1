# $env:path += ";c:\program files (x86)\nodejs"

$env:path += ";c:\program files\nodejs"

node ../ThirdParty/r.js -o build.js out=../breeze.base.min.js

node ../ThirdParty/r.js -o build.js out=../breeze.base.debug.js optimize=none 

node ../ThirdParty/r.js -o build.full.js out=../breeze.min.js

node ../ThirdParty/r.js -o build.full.js out=../breeze.debug.js optimize=none 
