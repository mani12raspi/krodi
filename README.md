**Idea, development and implementation of the original firmware**: Joel Serna (@JoelSernaMoreno - https://github.com/joelsernamoreno/).

# Firmware

* Download & execute ESPHome-Flasher
* Select COM port
* Select .bin file firmware.ino.bin
* Press Flash ESP (You may need to put your device in download mode)

<img width="717" height="421" alt="Screenshot 2026-06-12 at 11 29 17 PM" src="https://github.com/user-attachments/assets/0afeb12c-67c6-446c-ad49-c838cbb08d25" />

**Notes about SD:** 

* Web server will not load, is a blank page or displays nothing:

Check you have copied the relevant files to the SD card and the SD card is inserted in the Evil Crow RF V2 device.

* My files are on the SD card but the web server will not work:

Check your SD card size. It is recommended to use a small card. 32GB or smaller is sufficent for operation. Cards larger than this have been shown to cause issues and not work.

## Steps to Connect Device

1. Set up a Wi-Fi AccessPoint (Wifi Hotspot Settings) with your Mobile Phone:
	* **SSID Name:** krodi
	* **Password:** 123456789
2. Connect your laptop to the same Wi-Fi network.
2. Open a browser and access the web panel: http://krodi.local/

**Note:** If you cannot access the web panel, use the IP address assigned to Evil Crow RF v2 or follow below steps **only if you are running Linux OS:**
 * check if avahi-deamon is installed and running on your PC. You can do this with executing "sudo systemctl status avahi-daemon" in terminal
 * If service is not running, install it using your package manager (apt, yum, dnf, Packman, rpm,...)
 * After successful installation, start avahi-daemon service with "sudo systemctl start avahi-daemon && sudo systemctl enable avahi-daemon"
 * In case evilcrow-rf.local is still not reachable, use http://"IP address", where "IP address" is IP assigned to Evil Crow RF v2.

## Demonstration

[Demo.webm](https://github.com/user-attachments/assets/e0dc68d3-8de3-4027-87d8-5d48c37ecff6)








