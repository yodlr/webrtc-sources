var getusermedia = require('getusermedia');
var support = require('webrtcsupport');
var EventEmitter3 = require('eventemitter3').EventEmitter3;
var util = require('util');

function MicSelect() {
  if (!(this instanceof MicSelect)) {
    return new MicSelect();
  }
  EventEmitter3.call(this);
  
  var ms = this;
  ms.support = support.webAudio && support.mediaStream && supportGetUserMedia;
  
  if (!support) {
    return ms.emit('error', 'No WebRTC/WebAudio/MediaStream support');
  }
  
  ms.context = new support.AudioContext();
}
util.inherits(MicSelect, EventEmitter3);

MicSelect.prototype.getMics = function getMics() {
  var ms = this;
  var gumOpts = {
    audio: true,
    video: false
  }
  getusermedia(gumOpts, ms.onGetMics.bind(ms));
}

MicSelect.prototype.onGetMics = function onGetMics(err, stream) {
  var ms = this;
  if (err) {
    console.error(err);
    return ms.emit('error', err);
  }
  var audioSources = [];
  
  window.MediaStreamTrack.getSources(function (sources) {
    sources.forEach(function (source) {
      switch (source.kind) {
        case 'audio':
          // console.log('audio', source);
          audioSources.push(source);
          break;
      }
    });
    ms.emit('audioSources', audioSources);
  });
}


MicSelect.prototype.setMic = function setMic(source) {
  var ms = this;
  if (!source || !source.id) {
    return ms.emit('error', 'Cannot set mic, invalid source');
  }
  ms.source = source;
  var gumOpts = {
    audio: {optional: [{ sourceId: source.id}] },
    video: false
  }
  getusermedia(gumOpts, ms.onSetMic.bind(ms));
}

MicSelect.prototype.onSetMic = function onSetMic(err, stream) {
  if (err) {
    console.error(err);
    return ms.emit('error', err);
  }
  if (ms.microphone) {
    ms.microphone.disconnect();
    ms.analyser.disconnect();
    ms.jsNode.disconnect();
    ms.microphone = null;
    ms.anaylser = null;
    ms.jsNode = null;
  }
  
  ms.microphone = ms.context.createMediaStreamSource(stream);
  ms.analyser = ms.context.createAnalyser();
  ms.analyser.smoothingTimeConstant = 0.3;
  ms.analyser.fftSize = 1024;
  ms.jsNode = ms.context.createScriptProcessor(0, 1, 1);
  ms.jsNode.onaudioprocess = function() {
    
    // get the average, bincount is fftsize / 2
    var array =  new Uint8Array(ms.analyser.frequencyBinCount);
    ms.analyser.getByteFrequencyData(array);
    var average = getAverageVolume(array)
    ms.emit('volume', average);
  }
  
  ms.microphone.connect(ms.analyser);
  ms.analyser.connect(ms.jsNode);
  ms.jsNode.connect(ms.context.destination);
}

function getAverageVolume(array) {
  var values = 0;
  var average;
  var length = array.length;
  // get all the frequency amplitudes
  for (var i = 0; i < length; i++) {
    values += array[i];
  }
  average = values / length;
  return average;
}


module.exports = MicSelect;
