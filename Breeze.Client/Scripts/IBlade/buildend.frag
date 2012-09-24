
    var breeze = requirejs('root');
    // If two instances are loaded last one sets window.breeze.
    this.window.breeze = breeze;
    return breeze;
}));