collection([@session], object_root: false)
node('$id') { 1 }
node('$type') { 'CodeCamper.Sessions, CCJS.Model' }
attributes(*@session.attributes.keys)
