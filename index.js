var makeDistortionCurve = require('make-distortion-curve')
var MIDIUtils = require('midiutils')

// yr function should accept an audioContext, and optional params/opts
module.exports = function (ac, opts) {
  // make some audioNodes, connect them, store them on the object
  var audioNodes = {}

  var osc1 = ac.createOscillator()
  var osc2 = ac.createOscillator()
  osc1.type = 'square'
  osc2.type = 'square'

  // add some funk to that
  osc1.detune.setValueAtTime(-Math.random(), ac.currentTime)
  osc2.detune.setValueAtTime(Math.random(), ac.currentTime)

  var ldistortion = ac.createWaveShaper()
  ldistortion.curve = makeDistortionCurve(50 + ~~(Math.random() * 50)))

  var rdistortion = ac.createWaveShaper()
  rdistortion.curve = makeDistortionCurve(50 + ~~(Math.random() * 50)))

  var leftfilter = ac.createBiquadFilter()
  leftfilter.type = 'lowshelf'
  leftfilter.frequency.setValueAtTime(500, ac.currentTime)

  var rightfilter = ac.createBiquadFilter()
  rightfilter.type = 'lowshelf'
  rightfilter.frequency.setValueAtTime(500, ac.currentTime)

  var compressor = ac.createDynamicsCompressor()
  compressor.threshold.value = -50
  compressor.knee.value = 50
  compressor.ratio.value = 18
  compressor.reduction.value = -25
  compressor.attack.value = 0.05
  compressor.release.value = 0.15

  var pregain = ac.createGain()
  pregain.gain.setValueAtTime(0.7, ac.currentTime)
//
  var oscsine = ac.createOscillator()
  oscsine.type = 'sine'
  var delay = ac.createDelay(0.1)
  var sinedist = ac.createWaveShaper()
  sinedist.curve = makeDistortionCurve(50)
  var delay2 = ac.createDelay(0.14)
  var sinegain = ac.createGain()
  sinegain.gain.setValueAtTime(0.5, ac.currentTime)
//
  var mainfilter = ac.createBiquadFilter()
  mainfilter.type = 'lowpass'
  mainfilter.frequency.setValueAtTime(500, ac.currentTime)

  var maingain = ac.createGain()
  maingain.gain.setValueAtTime(0, ac.currentTime)



//
  osc1.connect(ldistortion)
  ldistortion.connect(leftfilter)
  leftfilter.connect(compressor)
//
  osc2.connect(rdistortion)
  rdistortion.connect(rightfilter)
  rightfilter.connect(compressor)
//
  compressor.connect(pregain)
//
  oscsine.connect(delay)
  delay.connect(sinedist)
  oscsine.connect(sinedist)
  sinedist.connect(delay2)
  delay2.connect(sinegain)
  sinedist.connect(sinegain)
//
  pregain.connect(mainfilter)
  sinegain.connect(mainfilter)
  mainfilter.connect(maingain)

  audioNodes.osc1 = osc1
  audioNodes.osc2 = osc2
  audioNodes.oscsine = oscsine
  audioNodes.ldistortion = ldistortion
  audioNodes.rdistortion = rdistortion
  audioNodes.leftfilter = leftfilter
  audioNodes.rightfilter = rightfilter
  audioNodes.mainfilter = mainfilter
  audioNodes.maingain = maingain
  audioNodes.pregain = pregain
  audioNodes.sinegain = sinegain
  audioNodes.delay = delay
  audioNodes.delay2 = delay2
  audioNodes.sinedist = sinedist
  audioNodes.compressor = compressor

  // gosh i wish there was an audioNode that just did this...
  audioNodes.settings = {
    attack: 0.1,
    decay: 0.05,
    sustain: 0.3,
    release: 0.1,
    chord: false // TODO: build chords instead of playing huge notes as an option?
  }

  return {
    connect: function (input) {
      // // this function should call `connect` on yr output nodes with `input` as the arg
      audioNodes.maingain.connect(input)

      // just let them buzz forever, deal with "notes" via adsr tricks
      audioNodes.osc1.start(ac.currentTime)
      audioNodes.osc2.start(ac.currentTime)
      audioNodes.oscsine.start(ac.currentTime)
    },
    start: function (when) {
      audioNodes.maingain.gain.linearRampToValueAtTime(audioNodes.settings.sustain + 0.2, when + audioNodes.settings.attack)
      audioNodes.maingain.gain.linearRampToValueAtTime(audioNodes.settings.sustain, when + audioNodes.settings.decay)
      audioNodes.maingain.gain.linearRampToValueAtTime(0, when + audioNodes.settings.release)
    },
    stop: function (when) {
      audioNodes.osc1.stop(when)
      audioNodes.osc2.stop(when)
      audioNodes.oscsine.stop(when)
      console.log('whyd u let the bass go? gotta catch a new one now!!!!')
    },
    update: function (opts, when) {
      // available opts:
      // {midiNote: 62, attack: , decay: , sustain: , release: }
      Object.keys(opts).forEach(function (k) {
        var v = opts[k]
        if (k == 'midiNote' || k == 'freq') {
          var freq = k == 'midiNote' ? MIDIUtils.noteNumberToFrequency(v) : v
          audioNodes.leftfilter.frequency.setValueAtTime(freq + ((Math.random() * freq) - (freq / (2 + Math.random()))), when)
          audioNodes.rightfilter.frequency.setValueAtTime(freq + ((Math.random() * freq) - (freq / (2 + Math.random()))), when)
          audioNodes.mainfilter.frequency.setValueAtTime(freq + ((Math.random() * freq) - (freq / 1.5)), when)


          audioNodes.osc1.frequency.setValueAtTime(freq, when)
          audioNodes.osc2.frequency.setValueAtTime(freq, when)
          audioNodes.oscsine.frequency.setValueAtTime(freq / 2.0, when)
          // add some funk to that
          audioNodes.osc1.detune.setValueAtTime(-Math.random(), when)
          audioNodes.osc2.detune.setValueAtTime(Math.random(), when)
        } else {
          // just an ADSR value
          audioNodes.settings[k] = v
        }
      })
    },
    nodes: function () {
      // returns an object of `{stringKey: audioNode}` for raw manipulation
      return audioNodes
    }
  }
}