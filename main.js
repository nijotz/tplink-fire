const TPLSmartDevice = require('tplink-lightbulb')
const SimplexNoise = require('simplex-noise')

const log = true
const ips = [
  '192.168.1.7',   // Bulb 1 - 50:C7:BF:3C:0C:C9
  '192.168.1.6',   // Bulb 2 - 50:C7:BF:3A:0F:0A
  '192.168.1.2',   // Bulb 3 - 50:C7:BF:3A:13:D7
  '192.168.1.4',   // Bulb 4 - 50:C7:BF:3C:19:4A
  '192.168.1.3',   // Bulb 5 - 50:C7:BF:40:73:39
  '192.168.1.5',   // Bulb 6 - 50:C7:BF:03:C1:8B
]
const lights = ips.map((ip) => new TPLSmartDevice(ip))
const speed = 0.05
const colorNoise = new SimplexNoise()
const brightnessNoise = new SimplexNoise()
const saturationNoise = new SimplexNoise()

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const fireOptions = {
  speed: 0.035,
  hueMin: 0,
  hueMax: 29,
  brightnessMin: 0,
  brightnessMax: 100,
  saturationMin: 100,
  saturationMax: 100,
}

const candleOptions = {
  speed: 0.05,
  hueMin: 22,
  hueMax: 35,
  brightnessMin: 25,
  brightnessMax: 75,
  saturationMin: 65,
  saturationMax: 90,
}

async function run(options) {
  let z = 0

  while (true) {
    // Controls "flicker", how quickly this moves through the noise pattern
    z = z + options.speed

    let noisey = (array, noise, min, max) => {
      values = array.map((_, i) => noise.noise3D(i, 0.5, z))
      values = values.map(x => Math.abs(x) * (max - min))
      values = values.map(x => parseInt(x) + min)
      return values
    }

    let hues = noisey(lights, colorNoise, options.hueMin, options.hueMax)
    let brightnesses = noisey(lights, brightnessNoise, options.brightnessMin, options.brightnessMax)
    let saturations = noisey(lights, saturationNoise, options.saturationMin, options.saturationMax)

    // Tell the bulbs what to do
    try {
      let commands = lights.map((light, i) => {
        let hue = hues[i]
        let brightness = brightnesses[i]
        let saturation = saturations[i]
        let transition = 0
        return light.power(true, transition, {color_temp: 0, hue, saturation, brightness})
      })

      let status = await Promise.race([Promise.all(commands), sleep(100)])

      if (log) {
        console.log(`z: ${z}`)
        console.log('hues', hues)
        console.log('brightnesses', brightnesses)
        console.log('saturations', saturations)
        console.log(status)
      }
    } catch (err) {
      console.error(err)
    }
  }
}

run(candleOptions)
