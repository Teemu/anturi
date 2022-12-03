#!/usr/bin/env node
import ruuvi from 'node-ruuvitag';
import axios from 'axios';

import chalk from 'chalk';
import { program } from 'commander';

program
  .name('anturi')
  .description('Send data to anturi.nuudeli.com from Ruuvi sensors')
  .version('0.2.1')
  .option('--url <value>', 'send sensor data to this URL')
  .option('--filter <value...>', 'send only these sensor MAC addresses')
  .option('--timeout <numbers>', 'close Anturi after seconds')
  .option('-t, --token <value>', 'your API token');

program.parse();
const options = program.opts();

if (!options.token) {
  console.log(
    chalk.red(
      'No API token was provided. No data is sent to anturi.nuudeli.com.',
    ),
  );
  console.log('The app will continue in offline mode...');
  console.log('');
}
if (!options.url) {
  options.url = 'https://anturi.nuudeli.com/api/data/';
}
options.filter = options.filter || [];
options.filter = options.filter.map((f) => f.toUpperCase());

axios.defaults.headers.common['Authorization'] = 'Token ' + options.token;
console.log(
  'Starting Anturi. It might take a minute to start getting data from Ruuvi trackers.',
);

if (options.token) {
  verifyAPIToken();
}

/*
{
	"dataFormat": 5,
	"rssi": -74,
	"temperature": 21.33,
	"humidity": 41.105,
	"pressure": 103288,
	"accelerationX": -48,
	"accelerationY": -4,
	"accelerationZ": -980,
	"battery": 2964,
	"txPower": 4,
	"movementCounter": 61,
	"measurementSequenceNumber": 38943,
	"mac": ""
}
*/

let dataSentAt = {};
let wasSensorBeenFiltered = {};
let error_count = 0;

const MAX_ERROR_THRESHOLD = 30;
const SENSOR_UPDATE_FREQUENCY = 10 * 60 * 1000; // 10 minutes
const SENSOR_JITTER = 10 * 1000; // 10 second jitter

ruuvi.on('found', (tag) => {
  console.log(chalk.green('📡 Found new RuuviTag'), tag.id);
  tag.on('updated', (data) => {
    if (options.filter.length && !options.filter.includes(data.mac)) {
      if (!wasSensorBeenFiltered[data.mac]) {
        console.log(
          chalk.white(data.mac),
          chalk.yellow('Filtering out responses from this RuuviTag sensor'),
        );
        wasSensorBeenFiltered[data.mac] = true;
        return;
      }
    }
    console.log(
      chalk.white(data.mac),
      'temperature:',
      chalk.yellow(String(data.temperature) + ' °C'),
      'humidity:',
      chalk.yellow(String(data.humidity) + ' %'),
    );
    if (dataSentAt[data.mac]) {
      var diff = Date.now() - dataSentAt[data.mac];
      if (diff < SENSOR_UPDATE_FREQUENCY) {
        console.log(
          chalk.white(data.mac),
          chalk.gray('Skipping update (rate limit)...'),
        );
        return;
      }
    }
    dataSentAt[data.mac] = Date.now() - Math.random() * SENSOR_JITTER;

    if (options.token) {
      sendDataToWeb(data);
    }
  });
});

ruuvi.on('warning', (message) => {
  console.error(new Error(message));
});

if (options.timeout) {
  setTimeout(() => {
    console.log('Shutting down after %i seconds', options.timeout);
    process.exit();
  }, options.timeout * 1000);
}

function verifyAPIToken() {
  axios.get(options.url).catch((error) => {
    console.log(chalk.red('API returned an error. Is your API token correct?'));
    if (error.response) {
      // Request made and server responded
      console.log(error.response.data);
    } else if (error.request) {
      console.log(error.request);
    } else {
      console.log(error.message);
    }
    process.exit(2);
  });
}

function sendDataToWeb(data) {
  axios
    .post(options.url, {
      mac: data.mac,
      temperature: data.temperature,
      humidity: data.humidity,
      pressure: data.pressure,
      battery: data.battery,
      time_at: new Date().toISOString(),
    })
    .then(
      () => {
        error_count = 0;
        console.log(chalk.white(data.mac), chalk.green('Saved data'));
      },
      (error) => {
        if (error.response) {
          error_count += 1;
          console.log(
            chalk.white(data.mac),
            chalk.red(JSON.stringify(error.response.data, null, 2)),
          );
        } else if (error.request) {
          console.log(
            'Error updating sensor: %s message (no response): %s',
            data.mac,
            error.request,
          );
        } else {
          console.log(
            'Error updating sensor: %s message (setting up): %s',
            data.mac,
            error.message,
          );
        }

        if (error_count >= MAX_ERROR_THRESHOLD) {
          console.log(chalk.red('Too many errors. Exiting...'));
          process.exit(3);
        }
      },
    );
}
