#!/usr/bin/env node
import ruuvi from "node-ruuvitag";
import axios from "axios";

import chalk from "chalk";
import { program } from "commander";

program
  .name("ruuvitrack")
  .description("Track Ruuvi sensors and send data to ruuvi.nuudeli.com")
  .version("0.1")
  .option("--url <value>", "send sensor data to this URL")
  .option("--filter <value...>", "send only these sensor MAC addresses")
  .option("--timeout <numbers>", "close ruuvitrack after seconds")
  .option("-t, --token <value>", "your API token");

program.parse();
const options = program.opts();

if (!options.token) {
  console.log(chalk.red("No API token was provided."));
  console.log("")
  console.log("📚 Usage instructions")
  console.log("")
  console.log("1. Go to ruuvi.nuudeli.com and register to get API token")
  console.log("2. Run this command again:")
  console.log("")
  console.log(
    " ",chalk.green("ruuvitracker -t TOKEN")
  );
  console.log("");
  console.log("See other attributes with", chalk.green("ruuvitracker --help"));
  process.exit(1);
}
if (!options.url) {
  options.url = "https://anturi.nuudeli.com/api/data/";
}
options.filter = options.filter || [];
options.filter = options.filter.map((f) => f.toUpperCase());

axios.defaults.headers.common["Authorization"] = "Token " + options.token;
console.log(
  "Starting ruuvi-tracker. It might take a minute to start getting data from Ruuvi trackers."
);

axios.get(options.url).catch((error) => {
  console.log(chalk.red("API returned an error. Is your API token correct?"));
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

let send_data = {};
let last_send_data = {};
let send_warning_message = {};

function processData() {
  console.log("Processing data:", send_data);
  if (Object.values(send_data).length === 0) {
    console.log("No data...");
    return;
  }
  console.log("Sending data!");
  axios.post(options.url, { data: send_data }).then(
    () => {
      send_data = {};
    },
    (e) => {
      console.error("Error sending data", e);
    }
  );
}

ruuvi.on("found", (tag) => {
  console.log(chalk.green("📡 Found new RuuviTag"), tag.id);
  tag.on("updated", (data) => {
    if (options.filter.length && !options.filter.includes(data.mac)) {
      if (!send_warning_message[data.mac]) {
        console.log(
          chalk.white(data.mac),
          chalk.yellow("Filtering out responses from this Ruuvi")
        );
        send_warning_message[data.mac] = true;
        return;
      }
    }
    console.log(
      chalk.white(data.mac),
      "temperature:",
      chalk.yellow(String(data.temperature) + " °C"),
      "humidity:",
      chalk.yellow(String(data.humidity) + " %")
    );
    var time = Date.now();
    if (last_send_data[data.mac]) {
      var diff = Date.now() - last_send_data[data.mac];
      if (diff <= 1000 * 10 * 60) {
        console.log(
          chalk.white(data.mac),
          chalk.gray("Skipping update (rate limit)...")
        );
        return;
      }
    }
    last_send_data[data.mac] = Date.now() - Math.random() * 10 * 1000;
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
          console.log(chalk.white(data.mac), chalk.green("Saved data"));
        },
        (error) => {
          if (error.response) {
            console.log(chalk.white(data.mac), chalk.red(JSON.stringify(error.response.data, null, 2)));

            if (error.response.data.code !== "sensor_already_updated") {
              process.exit(3);
            }
          } else if (error.request) {
            console.error(
              "Error updating sensor: %s message (no response): %s",
              data.mac,
              error.request
            );
          } else {
            console.error(
              "Error updating sensor: %s message (setting up): %s",
              data.mac,
              error.message
            );
          }
        }
      );
  });
});

ruuvi.on("warning", (message) => {
  console.error(new Error(message));
});

if (options.timeout) {
  setTimeout(() => {
    console.log("Shutting down after %i seconds", options.timeout);
    process.exit();
  }, options.timeout*1000);
}