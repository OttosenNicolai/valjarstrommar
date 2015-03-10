/* exported VR */
var VR = {
  Router: {
    routes: [],
    route: '',
    getFragment: function() {
      return location.hash.replace('#','');
    },
    add: function(path, handler) {
      this.routes.push({ path: path, handler: handler });
    },
    remove: function(path) {
      var r = this.routes, i;

      for (i = 0; i < r.length; i++) {
        if (r[i].path === path) {
          r.pop(r[i]);
        }
      }
    },
    listen: function() {
      var self = this;
      self.route = self.getFragment();

      var fn = function() {
        if (self.route !== self.getFragment()) {
          self.route = self.getFragment();
          self.execute();
        }
      };

      setInterval(fn, 50);
    },
    execute: function() {
      var r = this.routes, route = this.route, i;

      for (i = 0; i < r.length; i++) {
        if (r[i].path === route) {
          r[i].handler.call({}, route);
        }
      }
    },
    navigate: function(path) {
      location.hash = path;
    }
  }
};