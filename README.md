## WebRTC Microphone Select

This is a Browser package that will request access to getUserMedia and then 
return the list of microphone devices that are available for use.

A device can then be selected, and then volume levels events are emitted.

## Sample Code

```
var ms = new micselect();
var once = true;
ms.getMics();
ms.on('audioSources', function(as) {
  console.log(as);
  ms.setMic(as[0]);
  });
ms.on('volume', function(vol) {
  console.log(vol);
})
```