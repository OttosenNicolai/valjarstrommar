var dataNode = d3.select('#flowchart');
var nodeData = JSON.parse(JSON.parse(dataNode.attr('data-valu')));

d3.json('js/valjarstrommar.json', function(nodeData) {
  // Extend Underscore
  _.indexWhere = function(list, prop) {
    var obj = _.findWhere(list, prop);
    return _.indexOf(list, obj);
  };

  // State holding object
  var state = {
    movingForward: null,
    currentObject: null,
    currentSorting: null,
    currentLinks: null
  };

  // Dimensions
  var w = parseInt(d3.select('#flowchart').style('width')),
    h = parseInt(d3.select('#flowchart').style('height')),
    boxPadding = 10,
    boxSize = 35,
    p = 55;

  // TEMP, DO CHANGE THIS LATER
  if (typeof stripped !== 'undefined') {
    boxPadding = 20;
    boxSize = 50;
  }

  // Scales
  var colorDomain = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
    colorRange = ['#b02522','#c13b38','#acc768','#78ae5a',
      '#378cab','#366da3','#88c7d9','#e7d960','#b9527d',
      '#b02522','#c13b38','#acc768','#78ae5a','#378cab',
      '#366da3','#88c7d9','#e7d960','#b9527d'];

  var colors = d3.scale.ordinal()
    .domain(colorDomain)
    .range(colorRange);

  var linkWidth = d3.scale.linear()
    .domain([1, d3.max(nodeData.links, (function(d) { return d.value; }))])
    .range([5, boxSize]);

  // Path generators for curved lines
  var diagonalStart = function(data) {
    var nodes = checkDirection(leftBoxes.data(), rightBoxes.data()),
      node = _.findWhere(nodes, { _id: data._id }),
      order = data.sortedIndex + 1 || nodes.indexOf(node) + 1,
      coords = {
        x: order * boxSize + (order - 1) * boxPadding - boxSize / 2,
        y: checkDirection(boxSize + p, w - (p + boxSize))
      };

    return d3.svg.diagonal()
      .source(function() { return coords; })
      .target(function() { return coords; })
      .projection(function(d) { return [d.y, d.x]; });
  };

  var diagonalEnd = function(data) {
    return d3.svg.diagonal()
      .source(function() {
        var nodes = checkDirection(leftBoxes.data(), rightBoxes.data());
        var source = _.findWhere(nodes, { _id: data._id });
        var order = data.sortedIndex + 1 || nodes.indexOf(source) + 1;

        return {
          'x': order * boxSize + (order - 1) * boxPadding - boxSize / 2,
          'y': checkDirection(boxSize + p, w - (p + boxSize))
        };
      })
      .target(function(d) {
        var order = _.indexWhere(state.currentSorting, { _id: d.target }) + 1;

        return {
          'x': order * boxSize + (order - 1) * boxPadding - boxSize / 2,
          'y': data._id >= 10 ? boxSize + p : w - (p + boxSize)
        };
      })
      .projection(function(d) { return [d.y, d.x]; });
  };

  // Append the links 
  function appendLinkstoNodes(nodesArray) {
    _.each(nodesArray, function(nodes) {
      _.each(nodes, function(d) {
        var links = _.where(nodeData.links, { source: d._id });

        d.links = {};

        _.each(links, function (e) {
          d.links[e.target] = e.value;
        });
      });
    });
  }

  appendLinkstoNodes([nodeData.nodes2010, nodeData.nodes2014]);

  var svg = d3.select('#flowchart').append('svg')
    .attr('width', w)
    .attr('height', h);

  // Create the party boxes
  var leftBoxes = svg.append('g')
    .attr('class', 'left-boxes')
    .selectAll('.left-box')
    .data(nodeData.nodes2010)
    .enter()
    .append('g')
    .attr('transform', function(d, i) {
      return 'translate(' + p + ',' + i * (boxSize + boxPadding) + ')';
    })
    .attr('class', 'left-box');

    leftBoxes.append('svg:title')
      .text(function(d) { return d._short.toUpperCase(); });

    leftBoxes.append('rect')
    .attr({
      'width': boxSize,
      'height': boxSize,
      'class': function(d) {
        return 'party-box party-box-left ' + d._short.replace('ö','o');
      }
    });

    leftBoxes.append('text')
    .text(function(d) { return d._short.toUpperCase(); })
    .attr('class', 'party-short')
    .attr('dy', function() {
      return typeof stripped !== 'undefined' ? '2em' : '1.55em';
    })
    .attr('dx', boxSize / 2);

  var rightBoxes = svg.append('g')
    .attr('class', 'right-boxes')
    .selectAll('.right-box')
    .data(nodeData.nodes2014)
    .enter()
    .append('g')
    .attr('class', 'right-box')
    .attr('transform', function(d, i) {
      return 'translate(' + (w - (p + boxSize )) + ',' +
                        i * (boxSize + boxPadding) + ')';
    });

    rightBoxes.append('svg:title')
      .text(function(d) { return d._short.toUpperCase(); });

    rightBoxes.append('rect')
    .attr({
      'width': boxSize,
      'height': boxSize,
      'class': function(d) { return 'party-box ' + d._short.replace('ö','o'); }
    });

    rightBoxes.append('text')
    .text(function(d) { return d._short.toUpperCase(); })
    .attr('class', 'party-short')
    .attr('dy', function() {
      return typeof stripped !== 'undefined' ? '2em' : '1.55em';
    })
    .attr('dx', boxSize / 2);

  leftBoxes.on('click', function(d) {
    VR.Router.navigate(d._short + '2010');
  });

  rightBoxes.on('click', function(d) {
    VR.Router.navigate(d._short + '2014');
  });

  // Updates state values and calls updating functions
  function update(e) {
    state.currentObject = e;
    state.movingForward = e._id >= 10 ? false : true;
    state.currentSorting = sortOpposite(e);
    state.currentLinks = nodeData.links.filter(function(d) {
      return d.source === e._id;
    });

    updateLinks(e);
    updateBoxOrder(state.currentSorting);
    updatePercentages(e);
    updateTitle(e);
  }

  // Draw the links
  function updateLinks(e) {
    var strokeWidth = function(d) {
      return d.value > 0 ? linkWidth(d.value) + 'px' : '0px';
    };

    // Make sure the thickest link is displayed first
    state.currentLinks = state.currentLinks.sort(function(a, b) {
      return b.value - a.value;
    });

    var DOMLinks = svg.selectAll('.link')
      .data(state.currentLinks);

    DOMLinks
      .transition()
      .attr('stroke-width', strokeWidth)
      .attr('d', diagonalStart(e))
      .each('end', function(d) {
        d3.select(this).attr('stroke', function() { return colors(d.source); });
      })
      .transition()
      .delay(function(d, i) { return i * 80 + 1000; })
      .ease('quad')
      .duration(300)
      .attr('d', diagonalEnd(e));

    DOMLinks
      .enter()
      .append('path')
      .attr('stroke', function(d) { return colors(d.source); })
      .attr('d', diagonalStart(e))
      .transition()
      .delay(function(d, i) { return i * 80 + 1000; })
      .ease('quad')
      .duration(300)
      .attr('class', 'link')
      .attr('d', diagonalEnd(e))
      .attr('fill', 'none')
      .attr('stroke-width', strokeWidth);
    
    DOMLinks
      .on('mouseover', function() {
        d3.select(this).style('opacity', 0.8);
      })
      .on('mouseout', function() {
        d3.select(this).style('opacity', 1);
      });

    DOMLinks.exit().remove();
  }

  function updatePercentages() {
    var percentageLabels = svg.selectAll('.percentage-label')
      .data(state.currentLinks);

    percentageLabels
      .text(function(d) { return d.value + '%'; })
      .attr('x', function() { return checkDirection(w - (p / 2) + 4, p / 2 - 6); })
      .transition()
      .duration(1000)
      .attr('y', function(d) {
        var targetOrder = _.indexWhere(state.currentSorting, { _id: d.target }) + 1;
        return targetOrder * (boxSize + boxPadding) - 50;
      });

    percentageLabels.enter()
      .append('text')
      .attr('x', function() { return checkDirection(w - (p / 2) + 4, p / 2 - 6); })
      .attr('y', function(d) {
        var targetOrder = _.indexWhere(state.currentSorting, { _id: d.target }) + 1;
        return targetOrder * (boxSize + boxPadding) - 50;
      })
      .attr('dy', function() {
        return typeof stripped !== 'undefined' ? '0.6em' : '1.9em';
      })
      .attr('class', 'percentage-label')
      .text(function(d) { return d.value + '%'; });

    percentageLabels.exit().remove();
  }

  function updateTitle(e) {
    var title = d3.select('.flowchart-dynamic-title');

    title.text(function() {
      if (state.movingForward) {
        return 'Vart gick ' +
                e.name +
                's väljare?';
      } else {
        return 'Från vilka partier kom ' + e.name + 's väljare?';
      }
    });
  }

  // Performs the actual reordering of boxes on the other side
  function updateBoxOrder(sortedData) {
    var c = checkDirection('.right-box', '.left-box'),
      x = checkDirection(w - (p + boxSize), p);

    var updatingBoxes = svg.selectAll(c)
      .data(sortedData, function(d) { return d.name; });

    updatingBoxes
      .transition()
      .duration(1000)
      .attr('transform', function(d, i) {
        return 'translate(' + x + ',' + i * (boxSize + boxPadding) + ')';
      });
  }

  // Sorts box data on the other side based on the clicked box
  function sortOpposite(box) {
    var targetBoxes = checkDirection(rightBoxes, leftBoxes);

    // Sort the data based on current object data
    var sortedData = targetBoxes
      .data()
      .sort(function(a, b) {
        return box.links[b._id] - box.links[a._id];
      });

    // Create an index property for later use
    _.each(sortedData, function(d, i) {
      d.sortedIndex = i;
    });

    return sortedData;
  }

  function checkDirection(forward, backward) {
    return state.movingForward ? forward : backward;
  }

  // Make the chart responsive
  d3.select(window).on('resize', function() {
    w = parseInt(d3.select('#flowchart').style('width'));
    h = parseInt(d3.select('#flowchart').style('height'));

    svg.attr('width', w)
      .attr('height', h);

    svg.selectAll('.percentage-label')
      .attr('x', function() { return checkDirection(w - (p / 2), p / 2); });

    svg.selectAll('.right-box').attr('transform', function() {
      var yTranslate = d3.select(this)
          .attr('transform')
          .match(/,[0-9]+/)
          .shift()
          .replace(',','');
      return 'translate(' + (w - (p + boxSize )) + ',' + yTranslate + ')';
    });

    svg.selectAll('.link')
      .attr('d', diagonalEnd(state.currentObject));
  });


  // Create routes for every partybox
  for (var i = 0, n = nodeData.nodes2010; i < n.length; i++) {
    VR.Router.add(n[i]._short + '2010', function() {
      var a = n[i];
      return function() {
        update(a);
      };
    }(i));
  }

  for (var i = 0, n = nodeData.nodes2014; i < n.length; i++) {
    VR.Router.add(n[i]._short + '2014', function() {
      var a = n[i];
      return function() {
        update(a);
      };
    }(i));
  }

  // Listen to hash changes
  VR.Router.listen();

  // We need to execute once on pageload
  if (VR.Router.route) VR.Router.execute();
});