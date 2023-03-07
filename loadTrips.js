const mongoose = require('mongoose');
require('dotenv').config();
const Trip = require('./models/trips');

//DESTRUCTURE ENV VARIABLES
const {DATABASE_URL} = process.env 

const trips = [
  {
    tripName: 'Trip 1',
    route: 'Route A'
  },
  {
    tripName: 'Trip 2',
    route: 'Route B'
  },
  // ...
];

mongoose.connect(DATABASE_URL, { useNewUrlParser: true });

trips.forEach((trip) => {
  const newTrip = new Trip(trip);
  newTrip.save();
});

