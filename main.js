const TPLSmartDevice = require('tplink-lightbulb')
const SimplexNoise = require('simplex-noise')

const log = true
const ips = [
  '192.168.1.2',
  '192.168.1.4',
  '192.168.1.5',
  '192.168.1.9',
  '192.168.1.10',
  '192.168.1.11'
]
const lights = ips.map((ip) => new TPLSmartDevice(ip))
const speed = 0.035
const colorNoise = new SimplexNoise()
const brightnessNoise = new SimplexNoise()

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  let z = 0

  while (true) {
    // Controls "flicker", how quickly this moves through the noise pattern
    z = z + speed

    let noisey = (array, noise, coeff) => {
      values = array.map((_, i) => noise.noise3D(i, 0.5, z))
      values = values.map(x => Math.abs(x) * coeff)
      values = values.map(x => parseInt(x))
      return values
    }

    // 29 is upper limit, library uses 0-100, 0-29 is red to yellow spectrum
    let hues = noisey(lights, colorNoise, 29.)
    let brightnesses = noisey(lights, brightnessNoise, 100.)

    // Tell the bulbs what to do
    try {
      let commands = lights.map((light, i) => {
        let hue = hues[i]
        let brightness = brightnesses[i]
        let saturation = 100
        let transition = 0
        return light.power(true, transition, {color_temp: 0, hue, saturation, brightness})
      })

      let status = await Promise.race([Promise.all(commands), sleep(100)])

      if (log) {
        console.log(`z: ${z}`)
        console.log('hues', hues)
        console.log('brightnesses', brightnesses)
        console.log(status)
      }
    } catch (err) {
      console.error(err)
    }
  }
}

run()
