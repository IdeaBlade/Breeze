collection([@session], object_root: false)
node('$type') { 'CodeCamper.Sessions, CCJS.Model' }
attributes(*@session.attributes.keys)
