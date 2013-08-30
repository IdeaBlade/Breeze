id = 0
collection(@speakers, object_root: false)
node('$id') { id += 1 }
node('$type') { @type }
attributes(*@attributes)
