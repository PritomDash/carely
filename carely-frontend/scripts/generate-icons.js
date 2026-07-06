const sharp = require('sharp');
const fs = require('fs');

const svg = fs.readFileSync(__dirname + '/icon-source.svg');

sharp(svg).resize(192, 192).png().toFile(__dirname + '/../public/icon-192.png');
sharp(svg).resize(512, 512).png().toFile(__dirname + '/../public/icon-512.png');
sharp(svg).resize(32, 32).png().toFile(__dirname + '/../public/favicon-32.png');
