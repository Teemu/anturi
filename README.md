# Anturi

![npm](https://img.shields.io/npm/v/anturi)

Anturi is a free client app that sends data from Ruuvi sensors to the cloud-based monitoring at anturi.nuudeli.com. It can be run on devices such as Raspberry Pi.

![Screenshot of the Anturi app](https://user-images.githubusercontent.com/53298/205442126-bf9a0e53-8065-4766-bef3-74021b1f68d5.png)

## Installing

You can install Anturi with npm:

````
npm install -g anturi
````

Alternatively, you can use `npx` to install and run Anturi:

````
npx anturi -t "token here"
````

**Note:** `npx` is a package runner tool that comes bundled with npm. You should already have it if you have installed the latest Node.js.

## Usage with anturi.nuudeli.com

1. Sign up for a free account at [anturi.nuudeli.com](https://anturi.nuudeli.com).
2. After logging in, you will receive a token.
3. Use the token with the Anturi client application:

````
npx anturi -t "token here"
````

Anturi will automatically detect sensors and start sending data. After the first sensors have sent data, you should see sensor data in your dashboard. This can take around 10 seconds.

## Options

You can also use Anturi without the cloud-based solution. In this case, data will not be sent anywhere.

````
npx anturi
````

Send data for 60 seconds and then shut down (suitable for recurring cron jobs):

````
npx anturi --timeout 60
````

Filter out sensors by MAC address (to prevent sending data from neighbor sensors):

````
npx anturi --filter "00:11:22:33:44:55"
````

Use an alternative cloud-solution:

````
npx anturi --url "https://your_cloud_solution.com"
````

## Contribution

We welcome pull requests for contributions to the Anturi project. The project is open-source and released under the MIT license.

**Disclaimer:** This project is not affiliated with Ruuvi Innovations Oy. Ruuvi is a registered trademark of Ruuvi Innovations Oy.
