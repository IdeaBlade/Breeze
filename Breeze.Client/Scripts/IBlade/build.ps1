$env:path += ";c:\program files (x86)\nodejs"

node ../ThirdParty/r.js -o buildx.js out=../breeze.js

node ../ThirdParty/r.js -o buildx.js out=../breeze.debug.js optimize=none 


# $a = new-object -comobject wscript.shell
# $b = $a.popup("This is a test",0,"Test Message Box",1)
