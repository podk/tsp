'use strict';

function currentTime() {
  if (window.performance)
    return window.performance.now();
  return Date.now();
}

function Channel() {
  this._ready = false;
  this._receiveCallback = null;
  this._responseDuration = 0;

  this._eventCallbacks = {};

  // WebSocket callbacks

  var onOpen = function() {
    this._ready = true;
    var callback = this._eventCallbacks['ready'];
    if (callback)
      callback();
  };

  var onClose = function() {
    console.log('ws closed');
  };

  var onMessage = function(msg) {
    this._receiveMessage(msg.data);
  };

  var onError = function(err) {
    console.log(err);
    throw "WebSocket error occurred";
  };

  this._ws = new WebSocket('ws://localhost:9002');
  this._ws.onopen = onOpen.bind(this);
  this._ws.onclose = onClose.bind(this);
  this._ws.onmessage = onMessage.bind(this);
  this._ws.onerror = onError.bind(this);

  this._sendRequest = function(msg) {
    console.log('sending request: ' + msg);
    if (!this._ready) {
      console.error('Not ready');
      return;
    }
    this._sendTime = currentTime();
    this._ws.send(msg);
  };

  this._receiveMessage = function(msgdata) {
    var receiveTime = currentTime();
    this._responseDuration = receiveTime - this._sendTime;
    if (this._receiveCallback === null)
      throw 'Logic error: No receive callback';
    var msgObj = JSON.parse(msgdata);
    var receiveCallback = this._receiveCallback;
    this._receiveCallback = null; // Need to reset before calling the callback
    receiveCallback(msgObj);
  };

  // Message handlers

  var requestGraphCallback = (function(nodes) {
    console.log('duration: ' + this._responseDuration);
    var callback = this._eventCallbacks['nodes'];
    if (callback !== undefined)
      callback(nodes);
  }).bind(this);

  var improveResultCallback = (function(result) {
    console.log('duration: ' + this._responseDuration);
    var callback = this._eventCallbacks['update'];
    if (callback !== undefined)
      callback(result);
  }).bind(this);

  // public APIs

  this.on = function(event, callback) {
    this._eventCallbacks[event] = callback;
  };

  this.requestGraph = function() {
    this._receiveCallback = requestGraphCallback;
    this._sendRequest('requestGraph');
  };

  this.start = function() {
    this.improve();
  };

  this.improve = function() {
    if (this._receiveCallback) {
      console.error('a request ongoing');
      return;
    }
    this._receiveCallback = improveResultCallback;
    this._sendRequest('improve');
  };

  this.stop = function() {
    // FIXME: Implement
  };
}

function MockChannel() {
  this._eventCallbacks = {};
  this.on = function(event, callback) {
    this._eventCallbacks[event] = callback;
    if (event == 'ready') // Invoke immediately
      setTimeout(callback, 0);
  };

  this._mockGraph = [
    { 'index': 0, 'x': 30, 'y': 30 },
    { 'index': 1, 'x': 50, 'y': 260 },
    { 'index': 2, 'x': 150, 'y': 140 },
    { 'index': 3, 'x': 190, 'y': 90 },
    { 'index': 4, 'x': 270, 'y': 140 },

    { 'index': 5, 'x': 120, 'y': 60 },
    { 'index': 6, 'x': 80, 'y': 80 },
    { 'index': 7, 'x': 220, 'y': 180 },
    { 'index': 8, 'x': 110, 'y': 220 },
    { 'index': 9, 'x': 240, 'y': 280 }
  ];

  var create_iterator = function() {
    var fromId = 0;
    var toId = 1;
    return function() {
      var values = {
        'edges': [
          {'n': fromId, 'm': toId}
        ],
        'length': 100.0
      };
      toId = (toId + 1) % 10;
      if (toId == fromId) {
        fromId = (fromId + 1) % 10;
        toId = (toId + 1) % 10;
      }
      return values;
    };
  };

  this._generateTimer = null;
  this.start = function() {
    var iterator = create_iterator();
    this._generateTimer = setInterval((function() {
      var callback = this._eventCallbacks['update'];
      if (callback === undefined)
        return;
      callback(iterator());
    }).bind(this), 500);
  };

  this.stop = function() {
    if (this._generateTimer !== null) {
      clearInterval(this._generateTimer);
      this._generateTimer = null;
    }
  };

  this.requestGraph = function() {
    setTimeout((function() {
      var callback = this._eventCallbacks['nodes'];
      if (callback !== undefined) {
        callback(this._mockGraph);
      }
    }).bind(this), 0);
  };

  this.improve = function() {
    // noop
  };
}

function adjustCanvas(canvas) {
  var ctx = canvas.getContext('2d');
  var ratio = (window.devicePixelRatio || 1) /
    (ctx.webkitBackingStorePixelRatio || 1);
  var w = canvas.width, h = canvas.height;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  canvas.style['width'] = w + 'px';
  canvas.style['height'] = h + 'px';
  //ctx.scale(ratio, ratio);
}

var channel;
var canvas;
var ctx;
var scaleFactor;

var nodes;
var edges;

var running = false;
var invalidated = false;

function init() {
  canvas = document.querySelector('#canvas');
  adjustCanvas(canvas);
  ctx = canvas.getContext('2d');

  //channel = new MockChannel();
  channel = new Channel();
  channel.on('ready', function() {
    channel.requestGraph();
  });
  channel.on('nodes', function(newNodes) {
    nodes = newNodes;
    setRatio();
    drawNodes();
    start();
  });
  channel.on('update', function(result) {
    edges = result['edges'];
    invalidated = true;
  });
}

function setRatio() {
  var maxX = -1, maxY = -1;
  for (var i = 0; i < nodes.length; i++) {
    maxX = Math.max(maxX, nodes[i].x);
    maxY = Math.max(maxY, nodes[i].y);
  }
  maxX += 20;
  maxY += 20;

  scaleFactor = Math.min(canvas.width / maxX, canvas.height / maxY);
  
  ctx.scale(scaleFactor, scaleFactor);
}

function drawNodes() {
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    ctx.beginPath();
    ctx.arc(n.x, n.y, 8, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawEdges() {
  if (edges === undefined)
    return;

  for (var i = 0; i < edges.length; i++) {
    var n1 = nodes[edges[i]['n']];
    var n2 = nodes[edges[i]['m']];
    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    ctx.stroke();
  }
}

function rafLoop() {
  if (invalidated === true) {
    ctx.clearRect(0, 0, canvas.width / scaleFactor, canvas.height / scaleFactor);
    drawNodes();
    drawEdges();
    invalidated = false;
    channel.improve();
  }
  if (running)
    window.requestAnimationFrame(rafLoop);
}

function start() {
  channel.start();
  running = true;
  window.requestAnimationFrame(rafLoop);
}

function stop() {
  channel.stop();
  running = false;
}
