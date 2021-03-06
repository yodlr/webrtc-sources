var support = require('webrtcsupport');
var hark = require('hark');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var util = require('util');
var adapter = require('webrtc-adapter-test');

function MicSelect() {
  if (!(this instanceof MicSelect)) {
    return new MicSelect();
  }
  EventEmitter2.call(this);

  var ms = this;
  ms.emitVol = false;
  ms.support = support.supportWebAudio && support.supportGetUserMedia;
  ms.supportMediaStream = support.supportMediaStream && support.prefix !== 'moz';
  if (!ms.support) {
    setTimeout(function errorTimeout() {
      ms.emit('error', {
        message: 'No WebRTC/WebAudio support',
        webAudio: support.supportWebAudio,
        getUserMedia: support.supportGetUserMedia
      });
    }, 0);
    return;
  }
  if(!ms.supportMediaStream) {
    setTimeout(function supportTimeout() {
      ms.emit('mediaStream', {
        message: 'No MediaStream support',
        mediaStream: support.supportMediaStream
      });
    }, 0);
  }
  ms.context = new support.AudioContext();
}
util.inherits(MicSelect, EventEmitter2);

MicSelect.prototype.setEmitVol = function setEmitVol(value) {
  var ms = this;
  ms.emitVol = value;
};

MicSelect.prototype.getMics = function getMics() {
  var ms = this;
  if (!ms.support) {
    return;
  }
  var gumOpts = {
    audio: true,
    video: false
  };
  adapter.getUserMedia(gumOpts, ms.onGetMics.bind(ms), ms.onError.bind(ms));
};

MicSelect.prototype.onError = function onError(err) {
  if (err && err.name !== 'DevicesNotFound') {
    return ms.emit('error', err);
  }
  
  var audioSources = {
    mics: []
  };

  if(err && err.name === 'DevicesNotFound') {
    ms.emit('audioSources', audioSources);
    return;
  }
}

MicSelect.prototype.onGetMics = function onGetMics(stream) {
  var ms = this;
  
  var audioSources = {
    mics: []
  };
  
  if(!ms.supportMediaStream) {
    audioSources.err = new Error('No MediaStream support');
    ms.emit('audioSources', audioSources);
  }
  else {
    navigator.mediaDevices.enumerateDevices()
      .then(function getSourcesResp(sources) {
        sources.forEach(function eachSource(source) {
          switch (source.kind) {
            case 'audioinput':
              audioSources.mics.push(source);
              break;
            default:
              break;
          }
        });
        ms.emit('audioSources', audioSources);
      })
      .catch(function(err) {
        ms.emit('audioSources', audioSources);
        return;
      });
  }
};

MicSelect.prototype.setMic = function setMic(source) {
  var ms = this;
  if (!ms.support || !ms.supportMediaStream) {
    return;
  }
  if (source.id) {
    source = source.id;
  }
  ms.source = source;
  var gumOpts = {
    audio: {optional: [{ sourceId: source}] },
    video: false
  };
  adapter.getUserMedia(gumOpts, ms.onSetMic.bind(ms), ms.onSetMicErr.bind(ms));
};

MicSelect.prototype.onSetMicErr = function onSetMicErr(err) {
  return ms.emit('error', err);
}

MicSelect.prototype.onSetMic = function onSetMic(stream) {
  var ms = this;
  var options = {
    threshold: -50,
    interval: 50
  };
  if (ms.hark) {
    ms.hark.stop();
    ms.hark.off('speaking');
    ms.hark.off('stopped_speaking');
    ms.hark = null;
  }
  ms.hark = hark(stream, options);

  ms.hark.on('speaking', function speaking() {
    ms.emit('speaking');
  });

  ms.hark.on('stopped_speaking', function stoppedSpeaking() {
    ms.emit('stopped_speaking');
  });

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
  ms.jsNode = ms.context.createScriptProcessor(4096, 1, 1);
  ms.jsNode.onaudioprocess = function onAudioProcess() {

    // get the average, bincount is fftsize / 2
    if (ms.emitVol) {
      var array =  new Uint8Array(ms.analyser.frequencyBinCount);
      ms.analyser.getByteFrequencyData(array);
      var average = getAverageVolume(array);
      ms.emit('volume', average);
    }
  };

  ms.microphone.connect(ms.analyser);
  ms.analyser.connect(ms.jsNode);
  ms.jsNode.connect(ms.context.destination);
};

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
