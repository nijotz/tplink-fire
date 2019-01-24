const TPLSmartDevice = require('tplink-lightbulb')
const perlin = require('perlin-noise')

const light = new TPLSmartDevice('192.168.0.32')
const width = 1024
const height = 1024
const colorNoise = perlin.generatePerlinNoise(width, height)
const brightnessNoise = perlin.generatePerlinNoise(width, height)

let transition = 0
let hue = 0
let saturation = 100
let brightness = 0

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  let x = 0
  let y = 0
  let xdir = 1
  let ydir = 1

  while (true) {
    // Move through a 2D array like a snake

    x = x + xdir         // Move forward one step
    if (x >= width) {    // Check if we're out of bounds on the right
      x = width - 1      // Step back in bounds
      y = y + ydir       // Change rows
      xdir = -1          // Change direction
    }

    if (x < 0) {         // Check if we're out of bounds on the left
      x = 0              // Step back in bounds
      y = y + ydir       // Change rows
      xdir = 1           // Change direction
    }

    if (y >= height) {   // Check if we're out of bounds on the bottom
      y = height - 1     // Step back in bounds
      ydir = -1          // Change direction
    }
    if (y < 0) {         // Check if we're out of bounds on the top
      y = 0              // Step back in bounds
      ydir = 1           // Change direction
    }

    // Get the array position of the 2d coords
    let i = y * width + x

    // Hue and brightness based on perlin noise
    hue = Math.trunc(colorNoise[i] * 29.0)
    brightness = Math.trunc(brightnessNoise[i] * 100.0)

    // Tell the bulb what to do
    try {
      let status = await Promise.race([
        light.power(true, transition, {color_temp: 0, hue, saturation, brightness}),
        sleep(100)
      ])
      console.log(`{x: ${x}, y: ${y}}`)
      console.log(status)
    } catch (err) {
      console.error(err)
    }


  }
}

run()
