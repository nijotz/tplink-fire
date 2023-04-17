const TPLSmartDevice = require('tplink-lightbulb')
const SimplexNoise = require('simplex-noise')
const { point, circle, ray, segment, vector } = require('@flatten-js/core')

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
const colorNoise = new SimplexNoise()
const brightnessNoise = new SimplexNoise()
const saturationNoise = new SimplexNoise()

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
  speed: 0.035,
  hueMin: 22,
  hueMax: 35,
  brightnessMin: 05,
  brightnessMax: 10,
  saturationMin: 40,
  saturationMax: 60,
}

const brightOptions = {
  speed: 0.035,
  hueMin: 30,
  hueMax: 30,
  brightnessMin: 100,
  brightnessMax: 100,
  saturationMin: 40,
  saturationMax: 40,
}

async function rgb() {
  const speed = 1.0 / (2.0 * 1000)            // Rotations per millisecond
  const sleep_ms = 100                         // Milliseconds between loops
  const hue_max = 360.0
  const hue_delta = hue_max * sleep_ms * speed // Change in hue per loop
  const hue_spread = hue_max / lights.length   // Change in hue angle from light to light
  const center = {                             // All hues average to this point on the HSV circle
    hue: 60.0,
    sat: 50.0
  }
  const center_x = Math.cos(center.hue * Math.PI / 180) * center.sat
  const center_y = Math.sin(center.hue * Math.PI / 180) * center.sat

  const hue_circle = circle(point(0, 0), 100);

  let starting_hue = 0.0

  while (true) {
    try {
      starting_hue += hue_delta
      starting_hue %= hue_max

      commands = lights.map((light, i) => {
        // Get the angle of this bulb's hue
        let angle = (starting_hue + (i * hue_spread)) % hue_max

        // Create a segment that goes from the color center out at the angle
        // The circle is radius 100 (the saturation), a line of 200 will intersect
        let segment_end = point(
          center_x + Math.cos(angle * Math.PI / 180) * 200,
          center_y + Math.sin(angle * Math.PI / 180) * 200)

        // Find where on the hue circle that segment intersects
        let s = segment(point(center_x, center_y), segment_end)
        let intersection = s.intersect(hue_circle)[0]

        // Convert intersection coordinates to hue angle to get new hue
        let hue = Math.atan2(intersection.y, intersection.x) * 180.0 / Math.PI

        // Convert negative degrees to positive
        hue = parseInt((360 + hue) % 360)
        let saturation = 100
        let brightness = 100

        if (log) { console.log(`hue ${i}`, hue) }

        return light.power(true, sleep_ms, {color_temp: 0, hue, saturation, brightness})
      })

      // Run all the commands and sleep, but don't let the commands go over too long
      let status = await Promise.race([
        Promise.all([...commands, sleep(sleep_ms)]),
        sleep(sleep_ms + 50)
      ])

      if (log) {
        console.log('hue', starting_hue)
        console.log('status', status)
      }
    } catch (err) {
      console.error(err)
    }
  }
}

async function flicker(options) {
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

//flicker(brightOptions)
//flicker(candleOptions)
rgb()
