id = 0
collection(@sessions, object_root: false)
node('$id') { id += 1 }
node('$type') { @type }
attributes(*@attributes)
