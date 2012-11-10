
    var breeze = requirejs('breeze');
    // If two instances are loaded last one sets window.breeze.
    this.window.breeze = breeze;
    return breeze;
}));